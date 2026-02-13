# Unity 风格 Entity+Component 游戏框架 —— 设计规格

## 一、设计哲学

面向**教育场景**的 2D Canvas 游戏框架，采用 Unity 经典 GameObject+MonoBehaviour 的思路：

- **Entity 是"东西"**：球、砖块、敌人，每个游戏对象就是一个 Entity
- **Component 是"能力"**：给 Entity 挂上不同 Component，它就拥有不同的能力（能移动、能渲染、能被点击……）
- **System 是"规则"**（可选）：处理跨 Entity 的全局逻辑（物理碰撞、统一渲染）
- **没有 DataManager**：全局状态用「单例 Entity + Component」或 System 内部状态表达，不引入额外的全局数据层

核心原则：
1. **直觉优先**：API 读起来像自然语言（`ball.AddComponent(new RigidBody({ vx: 100, vy: -150 }))`）
2. **渐进复杂度**：只用 Entity+Component 就能做完整游戏；System 是可选的高级工具
3. **组合优于继承**：通过挂载 Component 组合定义行为，不鼓励继承 Entity 子类
4. **所有游戏对象都是 Entity**：不允许绕过 Entity/Component 体系管理游戏状态

---

## 二、架构总览

```
World（游戏世界，唯一入口）
  ├── EntityManager（管理所有 Entity 的创建/销毁/查询）
  ├── SystemManager（管理 System 的注册/执行顺序）
  ├── EventBus（全局事件总线）
  ├── Canvas 管理（主画布 + 可选分层）
  │
  ├── Entity（游戏对象）
  │     ├── id: number（唯一标识）
  │     ├── tag: string（可选标签，如 "ball", "brick", "ui"）
  │     ├── active: boolean（是否激活）
  │     ├── Components Map
  │     │     ├── Transform（默认持有，位置/旋转/缩放）
  │     │     ├── 用户自定义 Component ...
  │     │     └── ...
  │     └── 父子层级（通过 Transform）
  │
  └── System（全局逻辑处理器，可选）
        ├── 声明 Query：需要哪些 Component 组合
        ├── Update(dt)：只处理匹配 Query 的 Entity
        └── 事件监听
```

---

## 三、核心类设计

### 3.1 World

游戏世界，一切的容器和入口。

```
class World {
  // —— 生命周期 ——
  Init(canvas)                          // 初始化，传入画布
  Dispose()                             // 销毁世界，释放所有资源
  Update(dt)                            // 主循环：更新所有 Component → 更新所有 System

  // —— Entity 管理 ——
  CreateEntity(tag?): Entity            // 创建 Entity，可选标签
  DestroyEntity(entityOrId)             // 销毁 Entity
  GetEntity(id): Entity | null          // 按 ID 获取
  GetEntitiesByTag(tag): Entity[]       // 按标签获取
  
  // —— System 管理 ——
  AddSystem(system): System             // 注册 System（按添加顺序执行）
  RemoveSystem(system)                  // 移除 System
  
  // —— 查询 ——
  Query(...componentIds): Entity[]      // 查询拥有指定 Component 组合的所有 Entity
  QueryOne(...componentIds): Entity | null  // 查询第一个匹配的 Entity（适合单例）
  
  // —— 事件 ——
  eventBus: EventBus                    // 全局事件总线
  
  // —— 画布 ——
  canvas: HTMLCanvasElement             // 主画布
  ctx: CanvasRenderingContext2D         // 主画布 context
  width: number                         // 画布宽
  height: number                        // 画布高
}
```

**关键设计决策**：
- `Query` 是 World 级别的方法，任何地方都可以调用（Component 里、System 里）
- Entity 销毁采用**延迟销毁**：标记后在帧末统一处理，避免遍历中删除导致的问题
- Update 顺序：先执行所有 Component 的 OnUpdate → 再按顺序执行所有 System 的 Update

### 3.2 Entity

游戏对象，Component 的容器。

```
class Entity {
  // —— 只读属性 ——
  id: number                            // 唯一 ID（自增）
  tag: string                           // 标签（创建时指定）
  active: boolean                       // 是否激活（inactive 的 Entity 不参与 Update 和 Query）
  world: World                          // 所属 World 引用
  
  // —— Component 管理 ——
  AddComponent(component): Component    // 添加组件，自动调用 OnInit
  RemoveComponent(componentId)          // 移除组件，自动调用 OnDispose
  GetComponent(componentId): Component | null  // 获取组件
  HasComponent(componentId): boolean    // 是否拥有某组件
  
  // —— 层级（委托给 Transform）——
  SetParent(entity | null)
  GetParent(): Entity | null
  AddChild(entity)
  RemoveChild(entity)
  GetChildren(): Entity[]
  
  // —— 生命周期 ——
  SetActive(active: boolean)            // 设置激活状态
  Destroy()                             // 标记销毁（等效于 world.DestroyEntity(this)）
}
```

**关键设计决策**：
- Entity **不允许继承**。不同类型的游戏对象通过 Component 组合区分，不通过 Entity 子类区分
- 可以提供**预制体工厂函数**来简化创建（`createBall(world, x, y)` 而非 `class BallEntity extends Entity`）
- `tag` 是简单字符串标签，用于快速分类查找（如 "enemy"、"bullet"）

### 3.3 Component

能力/属性，挂载到 Entity 上。**可以包含数据和行为。**

```
class Component {
  // —— 标识 ——
  static ID: string                     // 子类必须定义，唯一标识（如 'Velocity'）

  // —— 只读引用（OnInit 后可用）——
  entity: Entity                        // 所属 Entity
  world: World                          // 所属 World（通过 entity.world）
  
  // —— 生命周期（子类重写）——
  OnInit()                              // 添加到 Entity 后调用
  OnUpdate(dt)                          // 每帧调用（在 System.Update 之前）
  OnDispose()                           // 从 Entity 移除/Entity 销毁时调用
  
  // —— 便捷方法 ——
  GetComponent(componentId)             // 等效于 this.entity.GetComponent(...)
  Emit(eventId, params?)                // 通过 world.eventBus 发事件
  On(eventId, callback, context?)       // 监听事件
  Off(eventId, callback, context?)      // 取消监听
}
```

**关键设计决策**：
- Component **有 `OnUpdate(dt)`**：简单逻辑可以直接写在 Component 里，不强制使用 System
- Component 可以有方法（如 `TakeDamage()`、`SetVelocity()`），这是 Unity 风格的核心
- 获取兄弟组件用 `this.GetComponent('OtherComponent')`，保持直觉
- `OnUpdate` 是可选的，不重写则不执行（框架内部优化：只对重写了 OnUpdate 的 Component 调用）

### 3.4 System

跨 Entity 的全局逻辑处理器。**可选的高级工具。**

```
class System {
  // —— 标识 ——
  static ID: string                     // 唯一标识

  // —— 查询声明 ——
  static Query: string[]                // 声明需要的 Component ID 组合
                                        // 例如：static Query = ['Position', 'Velocity']
                                        // 框架自动筛选匹配的 Entity

  // —— 只读引用 ——
  world: World                          // 所属 World
  entities: Entity[]                    // 自动填充：匹配 Query 的 Entity 列表（每帧刷新）
  
  // —— 生命周期 ——
  OnInit()                              // 添加到 World 后调用
  Update(dt)                            // 每帧调用，处理 this.entities
  OnDispose()                           // 从 World 移除时调用
  
  // —— 便捷方法 ——
  Emit(eventId, params?)
  On(eventId, callback, context?)
  Off(eventId, callback, context?)
}
```

**关键设计决策**：
- `static Query` 是声明式的：System 不需要手动遍历所有 Entity，框架自动提供匹配列表
- 如果不声明 Query（`static Query = null`），则 `this.entities` 为空数组，System 可以纯靠事件驱动
- System 的 Update 在所有 Component 的 OnUpdate **之后**执行

### 3.5 EventBus

全局事件总线。

```
class EventBus {
  On(eventId, callback, context?)       // 注册监听
  Off(eventId, callback, context?)      // 取消监听
  Emit(eventId, params?)                // 广播事件
  Clear()                               // 清空所有监听
}
```

---

## 四、内置 Component

框架自带 7 个基础 Component，覆盖位置、渲染、物理、交互四大核心能力：

```
内置 Component（7 个）
├── Transform          位置/旋转/缩放 + 父子层级（默认持有）
├── SpriteRenderer     矩形/圆形渲染（颜色、形状、边框）
├── TextureRenderer    贴图渲染（图片、帧动画）
├── RigidBody          物理属性（速度、弹性系数）
├── BoxCollider        矩形碰撞体
├── CircleCollider     圆形碰撞体
└── TouchHandler       触摸交互（点击、按下、拖动等）
```

**Collider vs RigidBody 的关系（借鉴 Unity）：**

| 组件组合 | 含义 | 举例 |
|---|---|---|
| Collider 无 RigidBody | 静态障碍物：不会动，但别人能撞到它 | 砖块、墙壁 |
| Collider + RigidBody | 动态物体：会移动，碰撞后会反弹 | 球、弹幕 |
| RigidBody 无 Collider | 自由运动：不参与碰撞检测 | 飘动的粒子、背景装饰 |
| 无 Collider 无 RigidBody | 纯静态展示 | UI 文字、分数标签 |

### 4.1 Transform（默认组件，每个 Entity 自动持有）

```
class Transform extends Component {
  static ID = 'Transform'
  
  x: number = 0                         // 本地 X
  y: number = 0                         // 本地 Y
  rotation: number = 0                  // 旋转角度（弧度）
  scaleX: number = 1                    // X 缩放
  scaleY: number = 1                    // Y 缩放
  
  // 世界坐标（考虑父级）
  get worldX(): number
  get worldY(): number
  
  // 父子层级
  SetParent(entity | null)
  AddChild(entity)
  RemoveChild(entity)
  GetParent(): Entity | null
  GetChildren(): Entity[]
}
```

### 4.2 SpriteRenderer（矩形/圆形渲染）

```
class SpriteRenderer extends Component {
  static ID = 'SpriteRenderer'
  
  shape: 'rect' | 'circle' = 'rect'    // 形状
  width: number = 32                    // 宽（rect 时使用）
  height: number = 32                   // 高（rect 时使用）
  radius: number = 16                   // 半径（circle 时使用）
  color: string = '#ffffff'             // 填充色
  borderColor: string = ''              // 边框色（空则无边框）
  borderWidth: number = 1               // 边框宽
  visible: boolean = true               // 是否可见
}
```

> SpriteRenderer **不自己绘制**，由内置 `RenderSystem` 统一读取并绘制。  
> 教学点：**Component 存数据，System 做批量处理。**

### 4.3 TextureRenderer（贴图渲染）

```
class TextureRenderer extends Component {
  static ID = 'TextureRenderer'
  
  src: string = ''                      // 图片路径
  width: number = 32                    // 绘制宽度
  height: number = 32                   // 绘制高度
  offsetX: number = 0                   // 相对 Transform 的绘制偏移 X
  offsetY: number = 0                   // 相对 Transform 的绘制偏移 Y
  flipX: boolean = false                // 水平翻转
  flipY: boolean = false                // 垂直翻转
  visible: boolean = true               // 是否可见
  
  // 帧动画支持
  frameWidth: number = 0                // 单帧宽（0 = 整张图，非 0 = spritesheet 模式）
  frameHeight: number = 0               // 单帧高
  frameIndex: number = 0                // 当前帧索引
  frameCount: number = 1                // 总帧数
  frameRate: number = 0                 // 帧率（帧/秒，0 = 不自动播放）
}
```

> TextureRenderer 同样由 `RenderSystem` 统一绘制。  
> 与 SpriteRenderer 互斥：同一个 Entity 上只挂其中一个。  
> RenderSystem 优先检查 TextureRenderer，没有则检查 SpriteRenderer。

### 4.4 RigidBody（物理属性）

```
class RigidBody extends Component {
  static ID = 'RigidBody'
  
  vx: number = 0                        // X 速度（像素/秒）
  vy: number = 0                        // Y 速度（像素/秒）
  bounce: number = 1                    // 弹性系数（0 = 不弹，1 = 完美反弹）
  
  // —— 便捷方法 ——
  // 设置速度（方向 + 速率）
  SetVelocity(vx, vy)
  // 按角度设置速度
  SetVelocityFromAngle(angle, speed)
  // 获取当前速率
  get speed(): number                   // Math.sqrt(vx*vx + vy*vy)
}
```

**关键设计决策**：
- 速度存储在 RigidBody 而非 Transform：**Transform 只管"在哪"，RigidBody 管"怎么动"**，职责分离
- RigidBody **不在 OnUpdate 里自己更新位置**：位置更新和碰撞解算统一由 `PhysicsSystem` 处理，保证碰撞检测和位置更新的顺序正确
- `bounce` 弹性系数供 PhysicsSystem 在碰撞解算时使用

### 4.5 BoxCollider（矩形碰撞体）

```
class BoxCollider extends Component {
  static ID = 'BoxCollider'
  
  width: number                         // 碰撞区域宽
  height: number                        // 碰撞区域高
  offsetX: number = 0                   // 相对 Transform 的偏移 X
  offsetY: number = 0                   // 相对 Transform 的偏移 Y
  
  // 获取世界空间下的碰撞矩形
  GetBounds(): { left, right, top, bottom }
}
```

### 4.6 CircleCollider（圆形碰撞体）

```
class CircleCollider extends Component {
  static ID = 'CircleCollider'
  
  radius: number                        // 碰撞半径
  offsetX: number = 0                   // 相对 Transform 的偏移 X
  offsetY: number = 0                   // 相对 Transform 的偏移 Y
  
  // 获取世界空间下的碰撞圆心
  GetCenter(): { x, y }
}
```

### 4.7 TouchHandler（触摸交互）

```
class TouchHandler extends Component {
  static ID = 'TouchHandler'
  
  // —— 回调函数（全部可选，按需设置）——
  onTouchDown: Function | null = null   // (x, y) → 触摸按下
  onTouchUp: Function | null = null     // (x, y) → 触摸抬起
  onClick: Function | null = null       // (x, y) → 点击（按下+抬起，移动距离 < 阈值）
  onDragStart: Function | null = null   // (x, y) → 拖动开始（按下后移动距离 ≥ 阈值）
  onDrag: Function | null = null        // (x, y, dx, dy) → 拖动中（dx/dy 为本次位移）
  onDragEnd: Function | null = null     // (x, y) → 拖动结束
  
  // —— 属性 ——
  enabled: boolean = true               // 是否启用
  draggable: boolean = false            // true → InputSystem 在拖动时自动更新 Transform.x/y
  swallowTouch: boolean = true          // true → 阻止触摸穿透到下层 Entity
  dragThreshold: number = 5             // 拖动判定阈值（像素），移动超过此距离才视为拖动
}
```

**触摸区域判定**：TouchHandler 不自己定义触摸区域大小，而是**复用同 Entity 上的 Collider 或 Renderer 的尺寸**：
1. 优先使用 BoxCollider / CircleCollider 的范围（如果有）
2. 其次使用 SpriteRenderer / TextureRenderer 的尺寸（如果有）
3. 都没有则无法被触摸（仅全局触摸事件可触及）

**触摸事件流程**：

```
平台触摸事件（touchstart/touchmove/touchend）
  ↓
InputSystem 缓冲，在 Update 中统一处理
  ↓
命中检测（从上层到下层遍历有 TouchHandler 的 Entity）
  ├─ 命中某 Entity → 调用该 Entity 的 TouchHandler 回调
  │     └─ swallowTouch = true → 停止传播
  │     └─ swallowTouch = false → 继续检测下层 Entity
  └─ 未命中任何 Entity → 发出全局事件
```

**点击 vs 拖动判定**：

```
touchstart → 记录起始点
  ↓
touchmove → 累计移动距离
  ├─ 距离 < dragThreshold → 不触发任何事件（等待）
  └─ 距离 ≥ dragThreshold → 转为拖动状态
        ↓ 触发 onDragStart
        ↓ 后续 touchmove → 触发 onDrag
        ↓ touchend → 触发 onDragEnd
  ↓
touchend（未进入拖动状态）→ 触发 onClick
```

**使用示例**：

```javascript
// 可点击的按钮
const button = world.CreateEntity('button');
button.GetComponent('Transform').x = 100;
button.GetComponent('Transform').y = 400;
button.AddComponent(new SpriteRenderer({ shape: 'rect', width: 120, height: 40, color: '#3498db' }));
button.AddComponent(new TouchHandler({
  onClick: (x, y) => console.log('按钮被点击了!'),
  onTouchDown: (x, y) => {
    // 按下时变暗
    button.GetComponent('SpriteRenderer').color = '#2980b9';
  },
  onTouchUp: (x, y) => {
    // 抬起时恢复
    button.GetComponent('SpriteRenderer').color = '#3498db';
  }
}));

// 可拖动的滑块
const slider = world.CreateEntity('slider');
slider.GetComponent('Transform').x = 200;
slider.GetComponent('Transform').y = 300;
slider.AddComponent(new SpriteRenderer({ shape: 'circle', radius: 20, color: '#e74c3c' }));
slider.AddComponent(new CircleCollider(20));
slider.AddComponent(new TouchHandler({
  draggable: true,  // InputSystem 自动更新 Transform 位置
  onDrag: (x, y, dx, dy) => console.log('滑块位置:', x, y)
}));
```

---

## 五、内置 System

```
内置 System（4 个）
├── InputSystem        处理触摸输入，命中检测，派发触摸回调和全局事件
├── PhysicsSystem      移动 + 碰撞检测 + 碰撞解算 + 发出 collision 事件
├── RenderSystem       统一读取 Renderer 组件绘制画面
└── DebugSystem        绘制碰撞框、Entity ID、FPS（可选）
```

### 5.1 InputSystem

```
class InputSystem extends System {
  static ID = 'InputSystem'
  static Query = ['TouchHandler']        // 查询所有有 TouchHandler 的 Entity
  
  // 初始化时注册平台触摸事件监听
  OnInit() {
    // 注册 touchstart/touchmove/touchend 监听
    // 触摸事件到来时缓冲到队列，不立即处理
  }
  
  Update(dt) {
    // ---- 处理缓冲的触摸事件 ----
    // 对每个触摸事件：
    //
    // 1. 命中检测：遍历 this.entities（有 TouchHandler 的 Entity）
    //    - 使用 Collider 或 Renderer 的范围判断触摸点是否在 Entity 内
    //    - 多个 Entity 重叠时，后创建的（上层的）优先
    //
    // 2. 命中成功 → 根据触摸状态派发回调：
    //    - touchstart → TouchHandler.onTouchDown
    //    - touchmove  → 拖动判定（距离 ≥ dragThreshold？）
    //      - 是 → TouchHandler.onDragStart / onDrag
    //      - 否 → 等待
    //    - touchend   → 未拖动过 → TouchHandler.onClick
    //                 → 拖动中   → TouchHandler.onDragEnd
    //    - 若 draggable = true，拖动时自动更新 Transform.x/y
    //    - 若 swallowTouch = true，停止检测下层 Entity
    //
    // 3. 命中失败（未命中任何 Entity）或所有 Entity 都不吞噬触摸：
    //    发出全局事件供 System/Component 监听：
    //      'touch_down'  { x, y }
    //      'touch_up'    { x, y }
    //      'touch_move'  { x, y }
    //      'click'       { x, y }
  }
  
  OnDispose() {
    // 移除平台触摸事件监听
  }
}
```

**InputSystem 发出的全局事件**：

| 事件 | 参数 | 触发时机 |
|------|------|----------|
| `touch_down` | `{ x, y }` | 触摸按下且未被任何 Entity 吞噬 |
| `touch_up` | `{ x, y }` | 触摸抬起且未被任何 Entity 吞噬 |
| `touch_move` | `{ x, y }` | 触摸移动且未被任何 Entity 吞噬 |
| `click` | `{ x, y }` | 点击空白区域（未命中任何 Entity） |

> 全局事件用于处理"点击空白处关闭菜单"、"滑动屏幕移动摄像机"等不依赖具体 Entity 的交互。

### 5.2 PhysicsSystem

```
class PhysicsSystem extends System {
  static ID = 'PhysicsSystem'
  static Query = ['Transform', 'RigidBody']     // 查询所有动态物体

  static MAX_BOUNCES = 5    // 每帧每个动态物体最多处理的反弹次数
  static PUSH_OUT = 0.01    // 碰撞后沿法线推出距离（像素，防粘连）
  
  Update(dt) {
    dt = Math.min(dt, 0.05);   // 限制 dt，防止帧间隔过大

    // 收集场景中所有碰撞体
    const boxEntities = world.Query('BoxCollider');
    const circleEntities = world.Query('CircleCollider');

    for (const entity of this.entities) {
      const transform = entity.GetComponent('Transform');
      const rb = entity.GetComponent('RigidBody');
      const collider = entity.GetComponent('CircleCollider');

      // 没有 CircleCollider → 仅按速度移动，不做碰撞
      // 有 CircleCollider → Swept Collision 碰撞检测

      // ---- Swept Collision 循环 ----
      // 每次迭代：
      //   1. 计算本次剩余位移 moveDx = rb.vx * remainingDt
      //   2. 沿位移方向扫掠检测第一个碰撞体（支持 vs BoxCollider 和 vs CircleCollider）
      //   3. 碰撞 → 移动到碰撞点 → 反射速度 → 微量推出 → 用剩余时间继续
      //   4. 无碰撞 → 移动全部剩余距离 → 结束
      // 最多反弹 MAX_BOUNCES 次（安全阀）

      // 速度反射公式: v' = v - (1 + bounce) * (v · n) * n
      //   bounce=1 → 完美反弹（能量守恒）
      //   bounce=0 → 沿表面滑动（法线分量归零）

      // 碰撞事件:
      // this.Emit('collision', {
      //   entityA: entity,     // 动态物体（CircleCollider + RigidBody）
      //   entityB: hitEntity,  // 被撞物体（可能是静态的）
      //   normal: { x, y }     // 碰撞法线（从被撞体指向动态物体）
      // });
    }
  }

  // ---- 扫掠碰撞检测方法 ----

  // 移动圆 vs 静态 AABB：
  //   Minkowski Sum 展开 —— 将 AABB 外扩 radius 后做点射线检测
  //   检测 4 条扩展边（只检测迎面方向）+ 4 个圆角
  _sweepCircleBox(cx, cy, dx, dy, radius, box)
    → { t, normal } | null

  // 移动圆 vs 静态圆：
  //   合并半径法 —— 圆心射线 vs 半径为 (r1+r2) 的合并圆
  _sweepCircleCircle(cx, cy, dx, dy, radius, other)
    → { t, normal } | null

  // 点射线 vs 圆相交（解二次方程求首次进入时间 t）
  _rayCircleIntersect(px, py, dx, dy, cx, cy, r)
    → number | null
}
```

**实现要点**：
- **Swept Collision**（扫掠碰撞）：不是先移动再检测穿透，而是沿速度方向预测第一个碰撞点，从根本上避免了高速物体穿越薄碰撞体的问题
- **假定动态物体为圆形**：当前只支持 CircleCollider + RigidBody 作为动态碰撞体；没有 CircleCollider 的 RigidBody 仅做位移不参与碰撞
- **多次反弹**：每帧每个动态物体最多处理 `MAX_BOUNCES` 次反弹，剩余时间在每次反弹后递减
- **防粘连推出**：碰撞后沿法线推出 `PUSH_OUT` 像素，确保下帧不会因浮点误差再次触发碰撞

**PhysicsSystem 的职责边界**：
- **负责**：移动、碰撞检测、碰撞解算（推出+反弹）、发出碰撞事件
- **不负责**：扣血、加分、销毁砖块等游戏逻辑（由游戏自定义 System 监听 collision 事件处理）

### 5.2 RenderSystem

```
class RenderSystem extends System {
  static ID = 'RenderSystem'
  static Query = ['Transform']           // 查询所有有 Transform 的 Entity
  
  Update(dt) {
    // 清空画布
    // 遍历 this.entities：
    //   - 有 TextureRenderer 且 visible → 绘制贴图（优先）
    //   - 有 SpriteRenderer 且 visible → 绘制矩形/圆形
    //   - 两者都没有 → 跳过
    // 绘制时读取 Transform 的 worldX/worldY 作为位置
  }
}
```

### 5.3 DebugSystem（可选）

```
class DebugSystem extends System {
  static ID = 'DebugSystem'
  static Query = ['Transform']
  
  // 可选功能：
  // - 绘制所有 Collider 的碰撞框（红色线框）
  // - 在 Entity 旁显示 ID 和 tag
  // - 显示 FPS
  // - 显示活跃 Entity 数量
}
```

---

## 六、Update 执行顺序

每帧的执行流程：

```
1. World.Update(dt) 被调用
   │
   ├─ 2. 遍历所有 active Entity 的所有 Component，调用 OnUpdate(dt)
   │     （用户自定义 Component 的自身逻辑，如 BrickColorUpdater 更新颜色）
   │
   ├─ 3. 按注册顺序执行所有 System.Update(dt)
   │     推荐注册顺序：
   │       InputSystem → PhysicsSystem → 游戏自定义 System → DebugSystem → RenderSystem
   │     即：先处理输入 → 物理移动+碰撞 → 游戏逻辑 → 最后渲染
   │
   └─ 4. 处理延迟销毁队列（销毁标记为 Destroy 的 Entity）
```

**为什么 InputSystem 排在最前面？**

InputSystem 缓冲了上一帧到这一帧之间发生的触摸事件，在 Update 中统一处理。
排在最前面可以保证：触摸回调中修改的状态（如拖动更新位置），能在同一帧内被后续的 PhysicsSystem 和 RenderSystem 正确处理。

**为什么 RigidBody 的位置更新由 PhysicsSystem 负责，而不是在 Component.OnUpdate 里自己做？**

如果 RigidBody 在 OnUpdate 中自己移动（步骤 2），碰撞检测在 PhysicsSystem（步骤 3）才发生，
那一帧内会出现：移动 → 嵌入 → 检测到碰撞 → 推出。
而 PhysicsSystem 统一处理时可以做：移动 → 立即检测 → 立即推出反弹，逻辑更紧凑正确。

---

## 七、无 DataManager —— 全局状态的正确做法

**原则：所有游戏状态都通过 Entity + Component 表达。**

### 全局配置 → 单例 Entity

```javascript
// 创建一个"游戏配置"Entity
const config = world.CreateEntity('config');
config.AddComponent(new GameConfig({ difficulty: 'normal', lives: 3 }));

// 任何地方获取
const cfg = world.QueryOne('GameConfig');
const config = cfg.GetComponent('GameConfig');
```

### 游戏状态（分数等）→ 单例 Entity

```javascript
const state = world.CreateEntity('game-state');
state.AddComponent(new ScoreTracker());

// System 中访问
const tracker = this.world.QueryOne('ScoreTracker')?.GetComponent('ScoreTracker');
tracker.AddScore(100);
```

### 屏幕/画布信息 → World 属性

```javascript
// 直接通过 world 访问，不需要额外的 ScreenData
this.world.width   // 画布宽
this.world.height  // 画布高
this.world.ctx     // 画布 context
```

---

## 八、使用示例：打砖块

### 创建球

```javascript
const ball = world.CreateEntity('ball');
// 位置——放在屏幕中间
ball.GetComponent('Transform').x = world.width / 2;
ball.GetComponent('Transform').y = world.height / 2;
// 物理——有速度，完美弹性
ball.AddComponent(new RigidBody({ vx: 100, vy: -150, bounce: 1 }));
// 外观——白色小圆
ball.AddComponent(new SpriteRenderer({ shape: 'circle', radius: 5, color: '#ffffff' }));
// 碰撞体——圆形
ball.AddComponent(new CircleCollider(5));
```

读起来像自然语言："创建一个球，放在屏幕中间，给它速度和弹性，白色小圆，带圆形碰撞体。"

### 创建砖块

```javascript
function createBrick(world, row, col, hp) {
  const brick = world.CreateEntity('brick');
  const t = brick.GetComponent('Transform');
  t.x = offsetX + col * 32;
  t.y = offsetY + row * 32;
  
  // 外观——绿色方块
  brick.AddComponent(new SpriteRenderer({
    shape: 'rect', width: 30, height: 30, color: '#27ae60'
  }));
  // 碰撞体——矩形（没有 RigidBody → 静态，不会动但球会撞到它并弹开）
  brick.AddComponent(new BoxCollider(30, 30));
  // 生命值——游戏自定义 Component（不是框架内置的）
  brick.AddComponent(new Health(hp, { destructible: hp > 0 }));
  // 颜色随血量变化——游戏自定义 Component
  brick.AddComponent(new BrickColorUpdater());
  
  return brick;
}

// 批量创建
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    createBrick(world, r, c, 20);
  }
}
```

### 碰撞处理 —— 用 System 监听 PhysicsSystem 发出的碰撞事件

```javascript
class BrickCollisionSystem extends System {
  static ID = 'BrickCollisionSystem';
  static Query = null;  // 不需要自动查询，纯事件驱动
  
  OnInit() {
    this.On('collision', this._onCollision, this);
  }
  
  _onCollision(eventId, params) {
    const { entityA, entityB } = params;
    
    // 判断是否是球撞砖块（通过 tag 区分）
    const ball = entityA.tag === 'ball' ? entityA : entityB.tag === 'ball' ? entityB : null;
    const brick = entityA.tag === 'brick' ? entityA : entityB.tag === 'brick' ? entityB : null;
    
    if (ball && brick) {
      // 砖块扣血（反弹已由 PhysicsSystem 自动处理）
      const health = brick.GetComponent('Health');
      if (health) {
        health.TakeDamage(1);
        if (health.isDead) {
          brick.Destroy();
        }
      }
    }
  }
  
  OnDispose() {
    this.Off('collision', this._onCollision, this);
  }
}
```

> 注意：**球的反弹不需要在这里处理**。PhysicsSystem 检测到碰撞后会根据 `RigidBody.bounce` 自动反弹。
> 这个 System 只需要关心游戏逻辑（扣血、销毁）。

### 砖块颜色随血量变化 —— 用 Component 的 OnUpdate

```javascript
class BrickColorUpdater extends Component {
  static ID = 'BrickColorUpdater';
  
  OnUpdate(dt) {
    const health = this.GetComponent('Health');
    const sprite = this.GetComponent('SpriteRenderer');
    if (!health || !sprite) return;
    
    const ratio = health.ratio;
    if (ratio > 0.65) sprite.color = '#27ae60';      // 绿
    else if (ratio > 0.3) sprite.color = '#f1c40f';  // 黄
    else sprite.color = '#e74c3c';                     // 红
  }
}
```

### 添加触摸交互 —— "点击屏幕发射新球"

```javascript
class TapToShootSystem extends System {
  static ID = 'TapToShootSystem';
  static Query = null;
  
  OnInit() {
    // 监听全局 click 事件（未被任何 Entity 吞噬的点击）
    this.On('click', this._onTapEmpty, this);
  }
  
  _onTapEmpty(eventId, params) {
    const { x, y } = params;
    // 在点击位置创建一个新球
    const ball = this.world.CreateEntity('ball');
    ball.GetComponent('Transform').x = x;
    ball.GetComponent('Transform').y = y;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
    ball.AddComponent(new RigidBody({
      vx: Math.cos(angle) * 200,
      vy: Math.sin(angle) * 200,
      bounce: 1
    }));
    ball.AddComponent(new SpriteRenderer({ shape: 'circle', radius: 5, color: '#ffffff' }));
    ball.AddComponent(new CircleCollider(5));
  }
  
  OnDispose() {
    this.Off('click', this._onTapEmpty, this);
  }
}
```

### 添加触摸交互 —— "拖动挡板"

```javascript
// 创建挡板（可拖动）
const paddle = world.CreateEntity('paddle');
paddle.GetComponent('Transform').x = world.width / 2;
paddle.GetComponent('Transform').y = world.height - 40;
paddle.AddComponent(new SpriteRenderer({ shape: 'rect', width: 80, height: 12, color: '#3498db' }));
paddle.AddComponent(new BoxCollider(80, 12));
paddle.AddComponent(new TouchHandler({
  draggable: true,  // 自动跟随手指移动
  onDrag: (x, y, dx, dy) => {
    // 限制挡板不超出屏幕边界
    const t = paddle.GetComponent('Transform');
    t.x = Math.max(40, Math.min(world.width - 40, t.x));
  }
}));
```

### 注册 System 和启动

```javascript
// 注册内置 System（顺序重要）
world.AddSystem(new InputSystem());          // 1. 输入：触摸事件处理
world.AddSystem(new PhysicsSystem());        // 2. 物理：移动 + 碰撞
world.AddSystem(new BrickCollisionSystem()); // 3. 游戏逻辑：扣血 + 销毁
world.AddSystem(new TapToShootSystem());     // 4. 游戏逻辑：点击发射新球
world.AddSystem(new RenderSystem());         // 5. 渲染（最后）
```

---

## 九、Component vs System 使用指引

| 场景 | 推荐方式 | 原因 |
|------|----------|------|
| 单个 Entity 自身的状态变化（颜色、动画） | Component.OnUpdate | 逻辑跟着 Entity 走，直觉 |
| 点击/拖动某个 Entity | 内置 TouchHandler 回调 | 交互逻辑跟着 Entity 走 |
| 点击空白区域（全局触摸） | 自定义 System + 监听全局 touch 事件 | 不属于某个 Entity |
| 物理运动和碰撞 | 内置 PhysicsSystem | 移动+碰撞需要统一解算，不能拆散 |
| 两个 Entity 之间的交互（碰撞后扣血） | 自定义 System + 监听 collision 事件 | 需要同时访问多个 Entity |
| 统一批量处理（渲染） | 内置 RenderSystem | 效率高，逻辑集中 |
| 全局规则（胜负判定、关卡切换） | 自定义 System | 不属于任何单个 Entity 的逻辑 |

**教学建议**：
1. 第一步：用内置 System（InputSystem + PhysicsSystem + RenderSystem）+ Entity/Component 就能做出完整游戏
2. 第二步：用 TouchHandler 给 Entity 加上点击和拖动能力
3. 第三步：在 Component.OnUpdate 中写简单的自身逻辑（如颜色变化）
4. 第四步：遇到"两个对象之间的交互"或"全局规则"时，引入自定义 System 监听事件

---

## 十、与正统 ECS 的差异（设计取舍说明）

| 维度 | 本框架（Unity 风格） | 正统 ECS | 取舍原因 |
|------|---------------------|----------|---------|
| Component | 数据 + 行为 + 生命周期 | 纯数据 | 教学直觉：给球"弹跳能力"比"往弹跳数据表写一行"更自然 |
| Entity | 类实例，组件容器 | 纯 ID | 教学需要：entity.AddComponent() 比 world.setComponent(id, data) 好理解 |
| Component.OnUpdate | 有，每帧调用 | 无 | 降低入门门槛：不写 System 也能做游戏 |
| System.Query | 声明式组件组合查询 | Archetype 查询 | 取 ECS 之精华：System 不需要手动遍历过滤 |
| 全局状态 | 单例 Entity + Component | singleton Entity / Resource | 统一到 Entity 体系内，概念一致 |

---

## 十一、实现注意事项

1. **延迟销毁**：`Entity.Destroy()` 只标记，帧末统一处理。遍历中删除 Entity 会导致 bug。
2. **Query 缓存**：`World.Query()` 应缓存结果，Entity 增删或 Component 增删时标记脏位，下次 Query 时重建。
3. **OnUpdate 优化**：只对重写了 `OnUpdate` 的 Component 实例调用，避免空调用开销。所有内置 Component 均不重写 OnUpdate。
4. **事件清理**：Entity 销毁时自动清理其所有 Component 注册的事件监听，防止泄漏。
5. **Component 添加顺序**：同一 Entity 上多个 Component 的 OnUpdate 按添加顺序执行。
6. **错误提示**：重复添加同 ID 的 Component 时给出友好警告。
7. **Renderer 互斥**：同一 Entity 上 SpriteRenderer 和 TextureRenderer 只挂其中一个，重复添加时警告。
8. **dt 限制**：PhysicsSystem 应将 dt 限制在合理范围内（如 ≤ 0.05 秒），防止帧间隔过大导致穿越。
9. **触摸事件缓冲**：InputSystem 在平台触摸回调中只做缓冲（push 到队列），在 Update 中统一处理。避免异步回调中直接修改游戏状态导致的时序问题。
10. **触摸区域检测优先级**：InputSystem 做命中检测时，优先使用 Collider 范围，其次使用 Renderer 尺寸。后创建的 Entity（视觉上更"上层"的）优先命中。
11. **拖动与点击互斥**：同一次触摸只能触发点击或拖动其中之一。移动距离 ≥ `dragThreshold` 进入拖动状态后，不再触发 onClick。
12. **多点触控**：初始版本可只支持单点触控（取第一个触摸点），后续按需扩展。
