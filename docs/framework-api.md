# 游戏框架 API 参考

## 目录

- [核心类](#核心类)
  - [World](#world)
  - [Entity](#entity)
  - [Component](#component)
  - [System](#system)
  - [EventBus](#eventbus)
- [内置 Component](#内置-component)
  - [Transform](#transform)
  - [SpriteRenderer](#spriterenderer)
  - [TextureRenderer](#texturerenderer)
  - [RigidBody](#rigidbody)
  - [BoxCollider](#boxcollider)
  - [CircleCollider](#circlecollider)
  - [TouchHandler](#touchhandler)
- [内置 System](#内置-system)
  - [InputSystem](#inputsystem)
  - [PhysicsSystem](#physicssystem)
  - [RenderSystem](#rendersystem)
  - [DebugSystem](#debugsystem)
- [辅助类](#辅助类)
  - [Looper](#looper)

---

## 核心类

### World

文件：`game/js/framework/core/World.js`

游戏世界，一切的容器和入口。

#### 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `eventBus` | `EventBus` | 全局事件总线 |
| `canvas` | `HTMLCanvasElement` | 主画布 |
| `ctx` | `CanvasRenderingContext2D` | 主画布 context |
| `width` | `number` | 画布宽 |
| `height` | `number` | 画布高 |

#### 方法

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `Init(canvas)` | `canvas: HTMLCanvasElement` | `void` | 初始化，传入画布 |
| `Dispose()` | - | `void` | 销毁世界，释放所有资源 |
| `Update(dt)` | `dt: number` | `void` | 主循环：更新 Component → System → 延迟销毁 |
| `CreateEntity(tag?)` | `tag?: string` | `Entity` | 创建 Entity，可选标签 |
| `DestroyEntity(entityOrId)` | `entityOrId: Entity \| number` | `void` | 销毁 Entity（延迟） |
| `GetEntity(id)` | `id: number` | `Entity \| null` | 按 ID 获取 |
| `GetEntitiesByTag(tag)` | `tag: string` | `Entity[]` | 按标签获取 |
| `AddSystem(system)` | `system: System` | `System` | 注册 System |
| `RemoveSystem(system)` | `system: System` | `void` | 移除 System |
| `Query(...componentIds)` | `...componentIds: string[]` | `Entity[]` | 查询拥有指定 Component 组合的所有 Entity |
| `QueryOne(...componentIds)` | `...componentIds: string[]` | `Entity \| null` | 查询第一个匹配的 Entity |

---

### Entity

文件：`game/js/framework/core/Entity.js`

游戏对象，Component 的容器。**不允许继承。**

#### 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `id` | `number` | 唯一 ID（自增，只读） |
| `tag` | `string` | 标签（创建时指定） |
| `active` | `boolean` | 是否激活 |
| `world` | `World` | 所属 World 引用 |

#### 方法

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `AddComponent(component)` | `component: Component` | `Component` | 添加组件，自动调用 OnInit |
| `RemoveComponent(componentId)` | `componentId: string` | `void` | 移除组件，自动调用 OnDispose |
| `GetComponent(componentId)` | `componentId: string` | `Component \| null` | 获取组件 |
| `HasComponent(componentId)` | `componentId: string` | `boolean` | 是否拥有某组件 |
| `SetParent(entity)` | `entity: Entity \| null` | `void` | 设置父 Entity |
| `GetParent()` | - | `Entity \| null` | 获取父 Entity |
| `AddChild(entity)` | `entity: Entity` | `void` | 添加子 Entity |
| `RemoveChild(entity)` | `entity: Entity` | `void` | 移除子 Entity |
| `GetChildren()` | - | `Entity[]` | 获取所有子 Entity |
| `SetActive(active)` | `active: boolean` | `void` | 设置激活状态 |
| `Destroy()` | - | `void` | 标记销毁（帧末处理） |

---

### Component

文件：`game/js/framework/core/Component.js`

能力/属性基类，挂载到 Entity 上。子类必须定义 `static ID`。

#### 静态属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `static ID` | `string` | 子类必须定义，唯一标识 |

#### 实例属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `entity` | `Entity` | 所属 Entity（OnInit 后可用） |
| `world` | `World` | 所属 World（getter，通过 entity.world） |

#### 生命周期方法（子类重写）

| 方法 | 参数 | 说明 |
|------|------|------|
| `OnInit()` | - | 添加到 Entity 后调用 |
| `OnUpdate(dt)` | `dt: number` | 每帧调用（在 System.Update 之前）。可选重写 |
| `OnDispose()` | - | 从 Entity 移除/Entity 销毁时调用 |

#### 便捷方法

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `GetComponent(componentId)` | `componentId: string` | `Component \| null` | 获取同 Entity 上的其他组件 |
| `Emit(eventId, params?)` | `eventId: string, params?: any` | `void` | 通过 eventBus 发事件 |
| `On(eventId, callback, context?)` | `eventId: string, callback: Function, context?: any` | `void` | 监听事件 |
| `Off(eventId, callback, context?)` | `eventId: string, callback: Function, context?: any` | `void` | 取消监听事件 |

---

### System

文件：`game/js/framework/core/System.js`

跨 Entity 的全局逻辑处理器基类。子类必须定义 `static ID`。

#### 静态属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `static ID` | `string` | 唯一标识 |
| `static Query` | `string[] \| null` | 声明需要的 Component ID 组合，null 则 entities 为空 |

#### 实例属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `world` | `World` | 所属 World |
| `entities` | `Entity[]` | 自动填充：匹配 Query 的 Entity 列表（每帧刷新） |

#### 生命周期方法（子类重写）

| 方法 | 参数 | 说明 |
|------|------|------|
| `OnInit()` | - | 添加到 World 后调用 |
| `Update(dt)` | `dt: number` | 每帧调用，处理 this.entities |
| `OnDispose()` | - | 从 World 移除时调用 |

#### 便捷方法

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `Emit(eventId, params?)` | `eventId: string, params?: any` | `void` | 通过 eventBus 发事件 |
| `On(eventId, callback, context?)` | `eventId: string, callback: Function, context?: any` | `void` | 监听事件 |
| `Off(eventId, callback, context?)` | `eventId: string, callback: Function, context?: any` | `void` | 取消监听事件 |

---

### EventBus

文件：`game/js/framework/core/EventBus.js`

全局事件总线，发布/订阅模式。

#### 方法

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `On(eventId, callback, context?)` | `eventId: string, callback: Function, context?: any` | `void` | 注册监听 |
| `Off(eventId, callback, context?)` | `eventId: string, callback: Function, context?: any` | `void` | 取消监听 |
| `Emit(eventId, params?)` | `eventId: string, params?: any` | `void` | 广播事件 |
| `Clear()` | - | `void` | 清空所有监听 |

回调函数签名：`(eventId: string, params: any) => void`

---

## 内置 Component

所有内置 Component 均**不重写 OnUpdate**。

### Transform

文件：`game/js/framework/components/Transform.js`  
ID：`'Transform'`

位置/旋转/缩放 + 父子层级。每个 Entity 自动持有，不可移除。

#### 构造参数

```javascript
new Transform({ x, y, rotation, scaleX, scaleY })
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `x` | `number` | `0` | 本地 X |
| `y` | `number` | `0` | 本地 Y |
| `rotation` | `number` | `0` | 旋转角度（弧度） |
| `scaleX` | `number` | `1` | X 缩放 |
| `scaleY` | `number` | `1` | Y 缩放 |

#### 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `x` | `number` | 本地 X |
| `y` | `number` | 本地 Y |
| `rotation` | `number` | 旋转角度（弧度） |
| `scaleX` | `number` | X 缩放 |
| `scaleY` | `number` | Y 缩放 |
| `worldX` | `number` | 世界 X（getter，考虑父级） |
| `worldY` | `number` | 世界 Y（getter，考虑父级） |

#### 方法

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `SetParent(entity)` | `entity: Entity \| null` | `void` | 设置父 Entity |
| `AddChild(entity)` | `entity: Entity` | `void` | 添加子 Entity |
| `RemoveChild(entity)` | `entity: Entity` | `void` | 移除子 Entity |
| `GetParent()` | - | `Entity \| null` | 获取父 Entity |
| `GetChildren()` | - | `Entity[]` | 获取所有子 Entity |

---

### SpriteRenderer

文件：`game/js/framework/components/SpriteRenderer.js`  
ID：`'SpriteRenderer'`

矩形/圆形渲染数据。与 TextureRenderer 互斥。

#### 构造参数

```javascript
new SpriteRenderer({ shape, width, height, radius, color, borderColor, borderWidth, visible })
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `shape` | `'rect' \| 'circle'` | `'rect'` | 形状 |
| `width` | `number` | `32` | 宽（rect 时使用） |
| `height` | `number` | `32` | 高（rect 时使用） |
| `radius` | `number` | `16` | 半径（circle 时使用） |
| `color` | `string` | `'#ffffff'` | 填充色 |
| `borderColor` | `string` | `''` | 边框色（空则无边框） |
| `borderWidth` | `number` | `1` | 边框宽 |
| `visible` | `boolean` | `true` | 是否可见 |

---

### TextureRenderer

文件：`game/js/framework/components/TextureRenderer.js`  
ID：`'TextureRenderer'`

贴图渲染数据 + 帧动画支持。与 SpriteRenderer 互斥。

#### 构造参数

```javascript
new TextureRenderer({ src, width, height, offsetX, offsetY, flipX, flipY, visible, frameWidth, frameHeight, frameIndex, frameCount, frameRate })
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `src` | `string` | `''` | 图片路径 |
| `width` | `number` | `32` | 绘制宽度 |
| `height` | `number` | `32` | 绘制高度 |
| `offsetX` | `number` | `0` | 相对 Transform 的偏移 X |
| `offsetY` | `number` | `0` | 相对 Transform 的偏移 Y |
| `flipX` | `boolean` | `false` | 水平翻转 |
| `flipY` | `boolean` | `false` | 垂直翻转 |
| `visible` | `boolean` | `true` | 是否可见 |
| `frameWidth` | `number` | `0` | 单帧宽（0=整张图，非0=spritesheet 模式） |
| `frameHeight` | `number` | `0` | 单帧高 |
| `frameIndex` | `number` | `0` | 当前帧索引 |
| `frameCount` | `number` | `1` | 总帧数 |
| `frameRate` | `number` | `0` | 帧率（帧/秒，0=不自动播放） |

---

### RigidBody

文件：`game/js/framework/components/RigidBody.js`  
ID：`'RigidBody'`

物理属性（速度、弹性系数）。位置更新由 PhysicsSystem 处理。

#### 构造参数

```javascript
new RigidBody({ vx, vy, bounce })
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `vx` | `number` | `0` | X 速度（像素/秒） |
| `vy` | `number` | `0` | Y 速度（像素/秒） |
| `bounce` | `number` | `1` | 弹性系数（0=不弹，1=完美反弹） |

#### 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `speed` | `number` | 当前速率（getter） |

#### 方法

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `SetVelocity(vx, vy)` | `vx: number, vy: number` | `void` | 设置速度 |
| `SetVelocityFromAngle(angle, speed)` | `angle: number, speed: number` | `void` | 按角度设置速度 |

---

### BoxCollider

文件：`game/js/framework/components/BoxCollider.js`  
ID：`'BoxCollider'`

矩形碰撞体。

#### 构造参数

```javascript
new BoxCollider(width, height, { offsetX, offsetY })
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `width` | `number` | `32` | 碰撞区域宽 |
| `height` | `number` | `32` | 碰撞区域高 |
| `offsetX` | `number` | `0` | 相对 Transform 的偏移 X |
| `offsetY` | `number` | `0` | 相对 Transform 的偏移 Y |

#### 方法

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `GetBounds()` | `{ left, right, top, bottom }` | 获取世界空间下的碰撞矩形 |

---

### CircleCollider

文件：`game/js/framework/components/CircleCollider.js`  
ID：`'CircleCollider'`

圆形碰撞体。

#### 构造参数

```javascript
new CircleCollider(radius, { offsetX, offsetY })
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `radius` | `number` | `16` | 碰撞半径 |
| `offsetX` | `number` | `0` | 相对 Transform 的偏移 X |
| `offsetY` | `number` | `0` | 相对 Transform 的偏移 Y |

#### 方法

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `GetCenter()` | `{ x, y }` | 获取世界空间下的碰撞圆心 |

---

### TouchHandler

文件：`game/js/framework/components/TouchHandler.js`  
ID：`'TouchHandler'`

触摸交互配置。由 InputSystem 统一处理。

#### 构造参数

```javascript
new TouchHandler({ onTouchDown, onTouchUp, onClick, onDragStart, onDrag, onDragEnd, enabled, draggable, swallowTouch, dragThreshold })
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `onTouchDown` | `Function \| null` | `null` | 触摸按下回调 `(x, y)` |
| `onTouchUp` | `Function \| null` | `null` | 触摸抬起回调 `(x, y)` |
| `onClick` | `Function \| null` | `null` | 点击回调 `(x, y)` |
| `onDragStart` | `Function \| null` | `null` | 拖动开始回调 `(x, y)` |
| `onDrag` | `Function \| null` | `null` | 拖动中回调 `(x, y, dx, dy)` |
| `onDragEnd` | `Function \| null` | `null` | 拖动结束回调 `(x, y)` |
| `enabled` | `boolean` | `true` | 是否启用 |
| `draggable` | `boolean` | `false` | 拖动时自动更新 Transform 位置 |
| `swallowTouch` | `boolean` | `true` | 阻止触摸穿透到下层 Entity |
| `dragThreshold` | `number` | `5` | 拖动判定阈值（像素） |

**触摸区域判定优先级**：
1. BoxCollider / CircleCollider 的范围
2. SpriteRenderer / TextureRenderer 的尺寸
3. 都没有则无法被触摸

---

## 内置 System

### InputSystem

文件：`game/js/framework/systems/InputSystem.js`  
ID：`'InputSystem'`  
Query：`['TouchHandler']`

处理触摸输入，命中检测，派发触摸回调和全局事件。

**发出的全局事件**：

| 事件 | 参数 | 触发时机 |
|------|------|----------|
| `touch_down` | `{ x, y }` | 触摸按下且未被任何 Entity 吞噬 |
| `touch_up` | `{ x, y }` | 触摸抬起且未被任何 Entity 吞噬 |
| `touch_move` | `{ x, y }` | 触摸移动且未被任何 Entity 吞噬 |
| `click` | `{ x, y }` | 点击空白区域 |

---

### PhysicsSystem

文件：`game/js/framework/systems/PhysicsSystem.js`  
ID：`'PhysicsSystem'`  
Query：`['Transform', 'RigidBody']`

移动 + 碰撞检测 + 碰撞解算。dt 限制 <= 0.05 秒。

**发出的事件**：

| 事件 | 参数 | 触发时机 |
|------|------|----------|
| `collision` | `{ entityA, entityB, normal }` | 碰撞发生时 |

碰撞对支持：Box-Box (AABB)、Circle-Circle、Box-Circle。

---

### RenderSystem

文件：`game/js/framework/systems/RenderSystem.js`  
ID：`'RenderSystem'`  
Query：`['Transform']`

统一读取 Renderer 组件绘制画面。优先 TextureRenderer，其次 SpriteRenderer。

内置图片缓存机制，同一 src 只加载一次。

---

### DebugSystem

文件：`game/js/framework/systems/DebugSystem.js`  
ID：`'DebugSystem'`  
Query：`['Transform']`

调试绘制系统（可选），建议在 RenderSystem 之后注册。

#### 构造参数

```javascript
new DebugSystem({ showColliders, showLabels, showFPS, showEntityCount })
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `showColliders` | `boolean` | `true` | 绘制碰撞框（红色虚线） |
| `showLabels` | `boolean` | `true` | 显示 Entity ID/tag |
| `showFPS` | `boolean` | `true` | 显示 FPS |
| `showEntityCount` | `boolean` | `true` | 显示活跃 Entity 数量 |

---

## 辅助类

### Looper

文件：`game/js/looper.js`

requestAnimationFrame 主循环封装。

#### 构造参数

```javascript
new Looper(world)
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `world` | `World` | 游戏世界实例 |

#### 方法

| 方法 | 说明 |
|------|------|
| `Start()` | 启动主循环 |
| `Stop()` | 停止主循环 |

---

## 使用示例

```javascript
const fw = require('./framework');

// 创建世界
const world = new fw.World();
world.Init(canvas);

// 注册 System
world.AddSystem(new fw.InputSystem());
world.AddSystem(new fw.PhysicsSystem());
world.AddSystem(new fw.RenderSystem());

// 创建球
const ball = world.CreateEntity('ball');
ball.GetComponent('Transform').x = world.width / 2;
ball.GetComponent('Transform').y = world.height / 2;
ball.AddComponent(new fw.RigidBody({ vx: 100, vy: -150, bounce: 1 }));
ball.AddComponent(new fw.SpriteRenderer({ shape: 'circle', radius: 5, color: '#ffffff' }));
ball.AddComponent(new fw.CircleCollider(5));

// 启动循环
const looper = new Looper(world);
looper.Start();
```
