# 打砖块游戏 (BrickGame)

## 概述

基于 ECS 框架实现的打砖块游戏。小球在封闭的砖块场地中弹跳，碰撞可破坏砖块使其消失，所有可破坏砖块消灭后获胜。

## 文件结构

```
game/js/games/BrickGame/
├── BrickGame.js          # 游戏入口，场景初始化
├── BrickFactory.js       # 工厂函数（创建小球、砖块）
├── BrickComponent.js     # 砖块状态组件
└── BrickGameSystem.js    # 游戏逻辑系统
```

---

## BrickGame (入口模块)

文件：`game/js/games/BrickGame/BrickGame.js`

### 方法

| 方法 | 参数 | 说明 |
|------|------|------|
| `Start(world)` | `world: World` | 初始化游戏：注册系统、创建砖块和小球 |

### 导出常量

| 常量 | 值 | 说明 |
|------|-----|------|
| `CELL_SIZE` | `32` | 网格单元像素大小 |
| `GRID_COLS` | `10` | 网格列数 |
| `GRID_ROWS` | `15` | 网格行数 |
| `FIELD_WIDTH` | `320` | 场地宽度（像素） |
| `FIELD_HEIGHT` | `480` | 场地高度（像素） |
| `BRICK_HP` | `20` | 可破坏砖块耐久度 |
| `BALL_SPEED` | `200` | 小球速度（像素/秒） |

### 网格布局

场地居中于屏幕，大小 10x15 网格（320x480 像素）。

砖块环通过 `min(row, 14-row, col, 9-col)` 计算：

- **Ring 0**（最外圈）：不可破坏墙壁，深灰色 `#555555`，tag=`wall`
- **Ring 1**（第二圈）：可破坏砖块，20HP，tag=`brick`
- **Ring 2**（第三圈）：可破坏砖块，20HP，tag=`brick`
- **Ring >= 3**（内部）：空白区域，小球活动范围

### 使用示例

```javascript
const BrickGame = require('./games/BrickGame/BrickGame');

// 在 PhysicsSystem 之后、RenderSystem 之前调用
BrickGame.Start(world);
```

---

## BrickFactory (工厂函数)

文件：`game/js/games/BrickGame/BrickFactory.js`

### createBall(world, x, y, speed?)

创建小球 Entity。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `world` | `World` | - | 游戏世界 |
| `x` | `number` | - | 初始位置 X |
| `y` | `number` | - | 初始位置 Y |
| `speed` | `number` | `200` | 小球速度（像素/秒） |

**组件组合：** Transform + SpriteRenderer(circle, r=5, 白色) + CircleCollider(r=5) + RigidBody(随机方向, bounce=1)

**返回：** `Entity` - 创建的小球实体，tag=`ball`

### createBrick(world, x, y, options?)

创建砖块 Entity。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `world` | `World` | - | 游戏世界 |
| `x` | `number` | - | 砖块中心 X |
| `y` | `number` | - | 砖块中心 Y |
| `options.destructible` | `boolean` | `true` | 是否可破坏 |
| `options.hp` | `number` | `20` | 耐久度 |
| `options.color` | `string` | 自动 | 初始颜色（可破坏默认绿色，不可破坏默认深灰） |

**组件组合：** Transform + SpriteRenderer(rect, 32x32, 带边框) + BoxCollider(32x32) + BrickComponent

**返回：** `Entity` - 创建的砖块实体，tag=`brick`（可破坏）或 `wall`（不可破坏）

---

## BrickComponent (砖块组件)

文件：`game/js/games/BrickGame/BrickComponent.js`  
ID：`'BrickComponent'`

自定义 Component，存储砖块耐久度状态。

### 构造参数

```javascript
new BrickComponent({ destructible, hp })
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `destructible` | `boolean` | `true` | 是否可破坏 |
| `hp` | `number` | `20` | 初始/最大耐久度 |

### 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `destructible` | `boolean` | 是否可破坏 |
| `hp` | `number` | 当前耐久度 |
| `maxHp` | `number` | 最大耐久度 |

### 方法

| 方法 | 说明 |
|------|------|
| `Hit()` | 受到碰撞。不可破坏砖块无效果；可破坏砖块 HP-1、更新颜色、HP<=0 时销毁 |

### 颜色映射

根据 `hp / maxHp` 比例自动更新 SpriteRenderer 颜色：

| 耐久度比例 | 颜色 | 色值 |
|------------|------|------|
| > 66% | 绿色 | `#00cc44` |
| 33% ~ 66% | 黄色 | `#cccc00` |
| < 33% | 红色 | `#cc2200` |

---

## BrickGameSystem (游戏系统)

文件：`game/js/games/BrickGame/BrickGameSystem.js`  
ID：`'BrickGameSystem'`  
Query：`null`（事件驱动）

### 功能

1. **碰撞处理**：监听 `collision` 事件，对碰撞中的砖块调用 `BrickComponent.Hit()`
2. **嵌入修复**：每帧检查小球是否嵌入砖块，若嵌入则沿最近方向推出
3. **胜利检测**：每帧检查是否还有 tag=`brick` 的活跃实体

### 发出的事件

| 事件 | 参数 | 触发时机 |
|------|------|----------|
| `brick_game_win` | 无 | 所有可破坏砖块被消灭时 |

---

## 架构图

```
main.js
  ├── InputSystem          (输入处理)
  ├── PhysicsSystem        (物理 + 碰撞)
  │     └── emit('collision') ──→ BrickGameSystem._onCollision()
  ├── BrickGameSystem      (游戏逻辑)
  │     ├── 碰撞处理 → BrickComponent.Hit()
  │     ├── 嵌入修复
  │     └── 胜利检测 → emit('brick_game_win')
  └── RenderSystem         (渲染)
```

## Entity 结构

### 小球 (tag: 'ball')
- Transform: 位置
- SpriteRenderer: 白色圆形, radius=5
- CircleCollider: radius=5
- RigidBody: 随机方向, speed=200, bounce=1

### 不可破坏墙壁 (tag: 'wall')
- Transform: 位置
- SpriteRenderer: 深灰色矩形, 32x32
- BoxCollider: 32x32
- BrickComponent: destructible=false

### 可破坏砖块 (tag: 'brick')
- Transform: 位置
- SpriteRenderer: 颜色随 HP 变化, 32x32
- BoxCollider: 32x32
- BrickComponent: destructible=true, hp=20
