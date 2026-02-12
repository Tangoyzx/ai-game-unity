/**
 * BrickGameSystem - 打砖块游戏逻辑系统
 * 
 * 负责：
 * 1. 监听 collision 事件，对砖块调用 Hit()
 * 2. 每帧检测小球是否嵌入砖块，若嵌入则推出
 * 3. 检测胜利条件（所有可破坏砖块被消灭）
 */
const System = require('../../framework/core/System');

class BrickGameSystem extends System {
  static ID = 'BrickGameSystem';
  static Query = null; // 不需要自动查询

  constructor() {
    super();
    /** @type {boolean} 游戏是否已胜利 */
    this._won = false;
  }

  OnInit() {
    this._onCollision = this._onCollision.bind(this);
    this.On('collision', this._onCollision);
  }

  OnDispose() {
    this.Off('collision', this._onCollision);
  }

  /**
   * 碰撞事件处理
   * @param {string} eventId
   * @param {{ entityA: Entity, entityB: Entity, normal: { x: number, y: number } }} params
   */
  _onCollision(eventId, params) {
    const { entityA, entityB } = params;

    // entityA 是带 RigidBody 的动态物体（小球），entityB 是被碰撞体
    // 检查 entityB 是否有 BrickComponent
    const brickComp = entityB.GetComponent('BrickComponent');
    if (brickComp) {
      brickComp.Hit();
    }

    // 也检查 entityA，以防碰撞顺序相反
    const brickCompA = entityA.GetComponent('BrickComponent');
    if (brickCompA) {
      brickCompA.Hit();
    }
  }

  Update(dt) {
    if (this._won) return;

    // ---- 嵌入检测：检查小球是否卡在砖块内部 ----
    this._fixEmbedding();

    // ---- 胜利检测 ----
    this._checkWin();
  }

  /**
   * 检查小球是否嵌入砖块，若嵌入则沿最近方向推出
   */
  _fixEmbedding() {
    const balls = this.world.GetEntitiesByTag('ball');
    const boxEntities = this.world.Query('BoxCollider');

    for (let i = 0; i < balls.length; i++) {
      const ball = balls[i];
      if (!ball.active) continue;

      const collider = ball.GetComponent('CircleCollider');
      const transform = ball.GetComponent('Transform');
      if (!collider || !transform) continue;

      const cx = transform.worldX + collider.offsetX;
      const cy = transform.worldY + collider.offsetY;
      const radius = collider.radius;

      for (let j = 0; j < boxEntities.length; j++) {
        const other = boxEntities[j];
        if (other === ball || !other.active) continue;

        const box = other.GetComponent('BoxCollider');
        const bounds = box.GetBounds();

        // 找到圆心到 AABB 的最近点
        const nearestX = Math.max(bounds.left, Math.min(cx, bounds.right));
        const nearestY = Math.max(bounds.top, Math.min(cy, bounds.bottom));

        const dx = cx - nearestX;
        const dy = cy - nearestY;
        const distSq = dx * dx + dy * dy;

        // 如果圆心到 AABB 最近点的距离 < 半径，说明嵌入了
        if (distSq < radius * radius && distSq > 1e-8) {
          const dist = Math.sqrt(distSq);
          const overlap = radius - dist;
          // 沿推出方向移动
          const nx = dx / dist;
          const ny = dy / dist;
          transform.x += nx * (overlap + 0.1);
          transform.y += ny * (overlap + 0.1);
        } else if (distSq <= 1e-8) {
          // 圆心正好在 AABB 内部，找最短推出方向
          const pushLeft = cx - bounds.left + radius;
          const pushRight = bounds.right - cx + radius;
          const pushTop = cy - bounds.top + radius;
          const pushBottom = bounds.bottom - cy + radius;
          const minPush = Math.min(pushLeft, pushRight, pushTop, pushBottom);

          if (minPush === pushLeft) {
            transform.x -= pushLeft + 0.1;
          } else if (minPush === pushRight) {
            transform.x += pushRight + 0.1;
          } else if (minPush === pushTop) {
            transform.y -= pushTop + 0.1;
          } else {
            transform.y += pushBottom + 0.1;
          }
        }
      }
    }
  }

  /**
   * 检查是否所有可破坏砖块已被消灭
   */
  _checkWin() {
    const bricks = this.world.GetEntitiesByTag('brick');
    let remaining = 0;
    for (let i = 0; i < bricks.length; i++) {
      if (bricks[i].active) {
        remaining++;
      }
    }

    if (remaining === 0) {
      this._won = true;
      this.Emit('brick_game_win');
      console.log('[BrickGame] 胜利！所有砖块已被消灭');
    }
  }
}

module.exports = BrickGameSystem;
