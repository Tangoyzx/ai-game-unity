/**
 * PhysicsSystem - 物理系统
 * 
 * 负责：
 * 1. 根据 RigidBody 的速度移动 Entity
 * 2. 使用 Swept Collision（扫掠碰撞检测）沿速度方向查找第一个碰撞体
 * 3. 碰撞后计算反弹，并用剩余时间继续移动（每帧最多处理若干次反弹）
 * 4. 发出 collision 事件供游戏逻辑监听
 * 
 * 假定动态物体（有 RigidBody 的）使用 CircleCollider 作为碰撞体。
 * 没有 CircleCollider 的 RigidBody 仅做位移，不参与碰撞检测。
 */
const System = require('../core/System');

class PhysicsSystem extends System {
  static ID = 'PhysicsSystem';
  static Query = ['Transform', 'RigidBody'];

  /** @type {number} 每帧每个动态物体最多处理的反弹次数 */
  static MAX_BOUNCES = 5;

  /** @type {number} 碰撞后沿法线推出的距离（像素，防止粘连） */
  static PUSH_OUT = 0.01;

  Update(dt) {
    // 限制 dt，防止帧间隔过大导致穿越
    dt = Math.min(dt, 0.05);

    // 收集场景中所有拥有碰撞体的 Entity
    const boxEntities = this.world.Query('BoxCollider');
    const circleEntities = this.world.Query('CircleCollider');

    for (const entity of this.entities) {
      if (!entity.active) continue;

      const transform = entity.GetComponent('Transform');
      const rb = entity.GetComponent('RigidBody');
      const collider = entity.GetComponent('CircleCollider');

      // 没有 CircleCollider 的动态物体，仅按速度移动，不做碰撞检测
      if (!collider) {
        transform.x += rb.vx * dt;
        transform.y += rb.vy * dt;
        continue;
      }

      // 速度为零，跳过
      if (rb.speed < 0.0001) continue;

      const radius = collider.radius;

      // 记录起始世界坐标（用于最后计算本地坐标的增量）
      const startPosX = transform.worldX + collider.offsetX;
      const startPosY = transform.worldY + collider.offsetY;
      let posX = startPosX;
      let posY = startPosY;

      let remainingDt = dt;
      let bounces = 0;

      // 每次迭代：沿当前速度方向查找第一个碰撞，反弹后继续
      while (remainingDt > 1e-6 && bounces < PhysicsSystem.MAX_BOUNCES) {
        const moveDx = rb.vx * remainingDt;
        const moveDy = rb.vy * remainingDt;

        // 位移极小则直接移动
        if (moveDx * moveDx + moveDy * moveDy < 1e-8) {
          posX += moveDx;
          posY += moveDy;
          break;
        }

        // ---- 查找沿位移方向的第一个碰撞 ----
        let minT = 1;       // 位移比例 [0, 1)，1 表示无碰撞
        let hitNormal = null;
        let hitEntity = null;

        // vs 所有 BoxCollider
        for (let i = 0; i < boxEntities.length; i++) {
          const other = boxEntities[i];
          if (other === entity || !other.active) continue;
          const box = other.GetComponent('BoxCollider');
          const result = this._sweepCircleBox(posX, posY, moveDx, moveDy, radius, box);
          if (result && result.t < minT) {
            minT = result.t;
            hitNormal = result.normal;
            hitEntity = other;
          }
        }

        // vs 所有 CircleCollider（排除自身）
        for (let i = 0; i < circleEntities.length; i++) {
          const other = circleEntities[i];
          if (other === entity || !other.active) continue;
          const otherCollider = other.GetComponent('CircleCollider');
          const result = this._sweepCircleCircle(posX, posY, moveDx, moveDy, radius, otherCollider);
          if (result && result.t < minT) {
            minT = result.t;
            hitNormal = result.normal;
            hitEntity = other;
          }
        }

        if (hitNormal) {
          // ---- 发生碰撞 ----

          // 1. 移动到碰撞点
          posX += moveDx * minT;
          posY += moveDy * minT;

          // 2. 反射速度: v' = v - (1 + bounce) * (v · n) * n
          //    bounce=1 → 完美反弹，bounce=0 → 沿表面滑动
          const dot = rb.vx * hitNormal.x + rb.vy * hitNormal.y;
          rb.vx -= (1 + rb.bounce) * dot * hitNormal.x;
          rb.vy -= (1 + rb.bounce) * dot * hitNormal.y;

          // 3. 沿法线微量推出，防止下一帧粘连
          posX += hitNormal.x * PhysicsSystem.PUSH_OUT;
          posY += hitNormal.y * PhysicsSystem.PUSH_OUT;

          // 4. 计算剩余时间
          remainingDt *= (1 - minT);
          bounces++;

          // 5. 发出碰撞事件
          this.Emit('collision', {
            entityA: entity,
            entityB: hitEntity,
            normal: { x: hitNormal.x, y: hitNormal.y }
          });
        } else {
          // ---- 无碰撞，移动全部剩余距离 ----
          posX += moveDx;
          posY += moveDy;
          remainingDt = 0;
        }
      }

      // 将世界坐标变化量应用回 Transform 的本地坐标
      transform.x += posX - startPosX;
      transform.y += posY - startPosY;
    }
  }

  // =============================================
  //  Swept Collision 检测方法
  // =============================================

  /**
   * 移动圆 vs 静态矩形（AABB）的扫掠碰撞检测
   * 
   * 原理：将 AABB 按圆的半径向外扩展（Minkowski Sum），
   * 然后对圆心做点射线检测：
   *   - 4 条扩展边：检测圆心到达扩展边的时间
   *   - 4 个圆角：检测圆心到达角圆的时间
   * 
   * @param {number} cx - 圆心起始 X（世界坐标）
   * @param {number} cy - 圆心起始 Y（世界坐标）
   * @param {number} dx - 本次位移 X
   * @param {number} dy - 本次位移 Y
   * @param {number} radius - 圆半径
   * @param {import('../components/BoxCollider')} box - 矩形碰撞体
   * @returns {{ t: number, normal: { x: number, y: number } } | null}
   */
  _sweepCircleBox(cx, cy, dx, dy, radius, box) {
    const bounds = box.GetBounds();
    const { left, right, top, bottom } = bounds;

    let minT = Infinity;
    let normal = null;

    // ---- 检测 4 条扩展边 ----
    // 每条边沿法线方向外扩 radius，只检测"迎面"方向

    // 左边: x = left - radius，圆从左侧接近（dx > 0）
    // 有效 y 范围 [top, bottom]（边的有效段，超出则交给角处理）
    if (dx > 0) {
      const t = (left - radius - cx) / dx;
      if (t >= 0 && t < minT) {
        const hy = cy + t * dy;
        if (hy >= top && hy <= bottom) {
          minT = t;
          normal = { x: -1, y: 0 };
        }
      }
    }

    // 右边: x = right + radius，圆从右侧接近（dx < 0）
    if (dx < 0) {
      const t = (right + radius - cx) / dx;
      if (t >= 0 && t < minT) {
        const hy = cy + t * dy;
        if (hy >= top && hy <= bottom) {
          minT = t;
          normal = { x: 1, y: 0 };
        }
      }
    }

    // 上边: y = top - radius，圆从上方接近（dy > 0）
    if (dy > 0) {
      const t = (top - radius - cy) / dy;
      if (t >= 0 && t < minT) {
        const hx = cx + t * dx;
        if (hx >= left && hx <= right) {
          minT = t;
          normal = { x: 0, y: -1 };
        }
      }
    }

    // 下边: y = bottom + radius，圆从下方接近（dy < 0）
    if (dy < 0) {
      const t = (bottom + radius - cy) / dy;
      if (t >= 0 && t < minT) {
        const hx = cx + t * dx;
        if (hx >= left && hx <= right) {
          minT = t;
          normal = { x: 0, y: 1 };
        }
      }
    }

    // ---- 检测 4 个圆角 ----
    // 当圆心轨迹经过矩形角的区域时，实际上是圆与角点的碰撞
    const corners = [
      left, top,
      right, top,
      left, bottom,
      right, bottom
    ];

    for (let i = 0; i < 8; i += 2) {
      const cornerX = corners[i];
      const cornerY = corners[i + 1];
      const t = this._rayCircleIntersect(cx, cy, dx, dy, cornerX, cornerY, radius);
      if (t !== null && t >= 0 && t < minT) {
        // 法线 = 碰撞时圆心指向圆心离角点的方向（从角点指向圆心）
        const hitX = cx + t * dx;
        const hitY = cy + t * dy;
        const nx = hitX - cornerX;
        const ny = hitY - cornerY;
        const len = Math.sqrt(nx * nx + ny * ny);
        if (len > 1e-8) {
          minT = t;
          normal = { x: nx / len, y: ny / len };
        }
      }
    }

    // 只返回位移范围 [0, 1) 内的碰撞
    if (normal !== null && minT < 1) {
      return { t: minT, normal };
    }
    return null;
  }

  /**
   * 移动圆 vs 静态圆的扫掠碰撞检测
   * 
   * 原理：将两圆的碰撞转化为点与"合并半径圆"的碰撞。
   * 即：移动圆的圆心射线 vs 半径为 (r1 + r2) 的圆。
   * 
   * @param {number} cx - 移动圆心起始 X
   * @param {number} cy - 移动圆心起始 Y
   * @param {number} dx - 本次位移 X
   * @param {number} dy - 本次位移 Y
   * @param {number} radius - 移动圆的半径
   * @param {import('../components/CircleCollider')} other - 静态圆碰撞体
   * @returns {{ t: number, normal: { x: number, y: number } } | null}
   */
  _sweepCircleCircle(cx, cy, dx, dy, radius, other) {
    const center = other.GetCenter();
    const totalRadius = radius + other.radius;

    const t = this._rayCircleIntersect(cx, cy, dx, dy, center.x, center.y, totalRadius);
    if (t !== null && t >= 0 && t < 1) {
      // 法线 = 碰撞时从静态圆心指向移动圆心的方向
      const hitX = cx + t * dx;
      const hitY = cy + t * dy;
      const nx = hitX - center.x;
      const ny = hitY - center.y;
      const len = Math.sqrt(nx * nx + ny * ny);
      if (len > 1e-8) {
        return { t, normal: { x: nx / len, y: ny / len } };
      }
    }
    return null;
  }

  /**
   * 点射线 vs 圆的相交检测（求首次进入时间）
   * 
   * 射线: P(t) = (px, py) + t * (dx, dy)，t ∈ [0, ∞)
   * 圆:   中心 (cx, cy)，半径 r
   * 
   * 解方程: |P(t) - C|² = r²
   *   → a·t² + b·t + c = 0
   *   其中 a = dx²+dy², b = 2(e·d), c = |e|²-r²
   *   e = P - C
   * 
   * @param {number} px - 射线起点 X
   * @param {number} py - 射线起点 Y
   * @param {number} dx - 射线方向 X（未归一化，为实际位移）
   * @param {number} dy - 射线方向 Y
   * @param {number} cx - 圆心 X
   * @param {number} cy - 圆心 Y
   * @param {number} r  - 圆半径
   * @returns {number|null} 首次进入的 t 值（非负），或 null 表示不相交
   */
  _rayCircleIntersect(px, py, dx, dy, cx, cy, r) {
    const ex = px - cx;
    const ey = py - cy;

    const a = dx * dx + dy * dy;
    if (a < 1e-12) return null; // 位移为零

    const b = 2 * (ex * dx + ey * dy);
    const c = ex * ex + ey * ey - r * r;

    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return null; // 射线与圆不相交

    const sqrtD = Math.sqrt(discriminant);
    const t1 = (-b - sqrtD) / (2 * a); // 较小的 t（首次进入）

    // t1 >= 0 表示起点在圆外，射线前方有交点
    // t1 < 0 表示起点已在圆内或射线反方向，不视为碰撞
    if (t1 >= 0) return t1;

    return null;
  }
}

module.exports = PhysicsSystem;
