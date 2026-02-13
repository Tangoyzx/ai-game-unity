# 打砖块游戏 (BrickGame)

## 概述

基于 ECS 框架实现的打砖块游戏。小球在封闭的砖块场地中弹跳，碰撞可破坏砖块使其消失，所有可破坏砖块消灭后获胜。支持将"角色"（不可破坏的砖块组合）拖放到网格中，角色可重新拖拽移位。

## 文件结构

```
game/js/games/BrickGame/
├── BrickGame.js               # 游戏入口，场景初始化，角色系统初始化
├── components/
│   ├── BrickComponent.js      # 砖块状态组件
│   └── CharacterComponent.js  # 角色组件 + 幻影砖块引用组件
├── systems/
│   ├── BrickGameSystem.js     # 游戏逻辑系统
│   └── CharacterSystem.js     # 角色系统（拖放、影子、放置、碰撞路由）
└── utils/
    ├── BrickFactory.js        # 工厂函数（创建小球、砖块）
    └── CharacterDefs.js       # 角色类型注册表
```

---

## BrickGame (入口模块)

文件：`game/js/games/BrickGame/BrickGame.js`

### 方法

| 方法 | 参数 | 说明 |
|------|------|------|
| `Start(world)` | `world: World` | 初始化游戏：注册系统、创建砖块和小球 |
| `InitCharacters(world, characterSystem)` | `world: World, characterSystem: CharacterSystem` | 初始化角色系统并生成初始角色 |

### 导出常量

| 常量 | 值 | 说明 |
|------|-----|------|
| `CELL_SIZE` | `32` | 网格单元像素大小 |
| `GRID_COLS` | `10` | 网格列数 |
| `GRID_ROWS` | `15` | 网格行数 |
| `FIELD_WIDTH` | `320` | 场地宽度（像素） |
| `FIELD_HEIGHT` | `480` | 场地高度（像素） |
| `SPAWN_AREA_HEIGHT` | `80` | 底部刷新区高度（像素） |
| `BRICK_HP` | `20` | 可破坏砖块耐久度 |
| `BALL_SPEED` | `200` | 小球速度（像素/秒） |
| `originX` | (getter) | 场地原点 X（Start 后可用） |
| `originY` | (getter) | 场地原点 Y（Start 后可用） |

### 网格布局

场地上移居中（为底部刷新区腾出空间），大小 10x15 网格（320x480 像素）。
originY = `(world.height - FIELD_HEIGHT - SPAWN_AREA_HEIGHT) / 2`。

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

文件：`game/js/games/BrickGame/utils/BrickFactory.js`

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

文件：`game/js/games/BrickGame/components/BrickComponent.js`  
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

文件：`game/js/games/BrickGame/systems/BrickGameSystem.js`  
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

详见下方"系统注册顺序"章节。

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

### 角色实体 (Character Entity)
- Transform: 位置为包围盒中心
- SpriteRenderer: 不可见（color=''），尺寸为包围盒，仅用于 InputSystem 命中检测
- TouchHandler: draggable=true，拖拽回调
- CharacterComponent: 角色状态、形状、视觉属性

### 幻影砖块 (tag: 'character')
- Transform: 位置为 cell 中心
- SpriteRenderer: 彩色矩形 32x32，颜色来自 CharacterComponent
- BoxCollider: 32x32（小球碰撞反弹）
- CharacterBrickComponent: 反向引用所属角色实体

---

## CharacterDefs (角色类型注册表)

文件：`game/js/games/BrickGame/utils/CharacterDefs.js`

纯数据配置，描述每种角色的形状和初始参数。运行时所有属性都在 CharacterComponent 实例上。

### CHARACTER_TYPES

```javascript
const CHARACTER_TYPES = {
  'block_1x1': { cells: [{r:0,c:0}], color: '#6699ff' },
  'block_1x2': { cells: [{r:0,c:0},{r:0,c:1}], color: '#ff9933' },
  'block_2x1': { cells: [{r:0,c:0},{r:1,c:0}], color: '#33cc99' },
  'block_2x2_L': { cells: [{r:0,c:0},{r:1,c:0},{r:1,c:1}], color: '#cc66ff' },
};
```

### 字段说明

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `cells` | `{r,c}[]` | 是 | 单元偏移数组，定义角色形状 |
| `color` | `string` | 是 | 初始填充色 |
| `componentClass` | `class` | 否 | CharacterComponent 子类，未指定则用基类 |

### 导出函数

| 函数 | 返回值 | 说明 |
|------|--------|------|
| `getTypeIds()` | `string[]` | 所有可用的类型 ID 列表 |
| `getRandomTypeId()` | `string` | 随机获取一个类型 ID |

### 扩展方式

新增角色类型只需在 `CHARACTER_TYPES` 中添加条目。
新增碰撞行为则新建 `CharacterComponent` 子类并在 `componentClass` 中指定。

---

## CharacterComponent (角色组件)

文件：`game/js/games/BrickGame/components/CharacterComponent.js`  
ID：`'CharacterComponent'`

角色主组件，挂在角色实体上。管理角色全生命周期的状态和数据。

### 构造参数

```javascript
new CharacterComponent({ typeId, cells, color, borderColor, slotIndex })
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `typeId` | `string` | `''` | 角色类型 ID |
| `cells` | `{r,c}[]` | `[{r:0,c:0}]` | 单元偏移数组 |
| `color` | `string` | `'#ffffff'` | 填充色 |
| `borderColor` | `string` | `'#333333'` | 边框色 |
| `slotIndex` | `number` | `-1` | 刷新区槽位索引 |

### 属性

**状态属性：**

| 属性 | 类型 | 说明 |
|------|------|------|
| `typeId` | `string` | 角色类型 ID |
| `state` | `'spawn'\|'dragging'\|'placed'` | 当前状态 |
| `slotIndex` | `number` | 刷新区槽位索引（-1 表示无） |
| `phantomIds` | `number[]` | 幻影砖块 Entity ID 列表 |
| `prevGridPos` | `{row,col}\|null` | 上次放置的网格位置 |

**视觉属性（实例属性，可动态修改）：**

| 属性 | 类型 | 说明 |
|------|------|------|
| `cells` | `{r,c}[]` | 单元偏移数组 |
| `color` | `string` | 填充色 |
| `borderColor` | `string` | 边框色 |

**布局属性（构造时自动计算）：**

| 属性 | 类型 | 说明 |
|------|------|------|
| `bboxWidth` | `number` | 包围盒宽（像素） |
| `bboxHeight` | `number` | 包围盒高（像素） |
| `_anchorOffsetX` | `number` | 包围盒中心到 cell(0,0) 中心的 X 偏移 |
| `_anchorOffsetY` | `number` | 包围盒中心到 cell(0,0) 中心的 Y 偏移 |
| `_cellOffsets` | `{x,y}[]` | 每个 cell 相对包围盒中心的像素偏移 |

### 方法

| 方法 | 参数 | 说明 |
|------|------|------|
| `onHit(ball, hitBrick, normal)` | ball: Entity, hitBrick: Entity, normal: {x,y} | 碰撞回调虚方法，基类空实现，子类重写 |

### 子类扩展

```javascript
class ShiftCharacterComponent extends CharacterComponent {
  // static ID 继承自父类 = 'CharacterComponent'
  onHit(ball, hitBrick, normal) {
    // 自定义碰撞行为
  }
}
```

在 CharacterDefs 中指定 `componentClass: ShiftCharacterComponent`。

---

## CharacterBrickComponent (幻影砖块引用组件)

文件：`game/js/games/BrickGame/components/CharacterComponent.js`  
ID：`'CharacterBrickComponent'`

纯数据组件，挂在每个幻影砖块上，存储反向引用。

### 构造参数

```javascript
new CharacterBrickComponent({ characterEntityId, typeId, cellIndex })
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `characterEntityId` | `number` | 所属角色实体 ID |
| `typeId` | `string` | 角色类型 ID |
| `cellIndex` | `number` | 在角色 cells 数组中的索引 |

---

## CharacterSystem (角色系统)

文件：`game/js/games/BrickGame/systems/CharacterSystem.js`  
ID：`'CharacterSystem'`  
Query：`null`（事件驱动 + 手动管理）

注册在 RenderSystem 之后，在渲染完成后叠加绘制角色相关的可视元素。

### 初始化

```javascript
const characterSystem = new CharacterSystem();
world.AddSystem(characterSystem);
characterSystem.Init({
  originX, originY, gridCols, gridRows,
  fieldWidth, fieldHeight, spawnAreaHeight
});
characterSystem.SpawnCharacters();
```

### 公共方法

| 方法 | 参数 | 说明 |
|------|------|------|
| `Init(layout)` | layout: Object | 设置场地布局参数 |
| `SpawnCharacters()` | - | 在空闲槽位生成随机角色 |

### 核心职责

1. **刷新管理**：3 个底部槽位，全部放置后自动刷新
2. **预览渲染**：在底部刷新区绘制角色预览
3. **拖拽渲染**：绘制跟随手指的角色（不吸附网格）
4. **影子渲染**：网格吸附投影，绿色=可放置，红色=被占用
5. **放置/拾起**：创建/销毁幻影砖块实体
6. **碰撞路由**：CharacterBrickComponent → 角色实体 → charComp.onHit()

### 角色状态转换

```
spawn → dragging → placed → dragging → placed/spawn
```

- **spawn → dragging**：触摸拖拽开始，清空刷新区槽位
- **placed → dragging**：触摸拖拽开始，销毁幻影砖块
- **dragging → placed**：松手且位置有效，创建幻影砖块
- **dragging → spawn**：松手但位置无效（从刷新区拖出的），回到刷新区
- **dragging → placed**：松手但位置无效（从网格上拾起的），在原位重建幻影砖块

### 碰撞路由流程

```
PhysicsSystem → emit('collision') → CharacterSystem._onCollision()
  → entityB.GetComponent('CharacterBrickComponent')
  → world.GetEntity(cbComp.characterEntityId)
  → charComp.onHit(ball, hitBrick, normal)  // 多态分派
```

### 影子吸附逻辑

1. 从实体位置（包围盒中心）反推 cell(0,0) 世界坐标
2. 吸附到最近网格：`snapCol = Math.round((anchorX - originX - 16) / 32)`
3. 遍历每个 cell 检查目标格子是否被占用
4. 绘制半透明矩形：可放置 `rgba(0,255,0,0.35)`，被占用 `rgba(255,0,0,0.35)`

---

## 系统注册顺序

```
main.js
  ├── InputSystem          (输入处理)
  ├── PhysicsSystem        (物理 + 碰撞)
  │     └── emit('collision') ──→ BrickGameSystem / CharacterSystem
  ├── BrickGameSystem      (砖块游戏逻辑)
  │     ├── 碰撞处理 → BrickComponent.Hit()
  │     ├── 嵌入修复
  │     └── 胜利检测 → emit('brick_game_win')
  ├── RenderSystem         (渲染)
  └── CharacterSystem      (角色系统，在渲染后叠加绘制)
        ├── 刷新区 + 拖拽角色 + 影子绘制
        └── 碰撞路由 → CharacterComponent.onHit()
```

### 已知限制

**非矩形角色的命中检测重叠**：L 形等角色的包围盒大于实际占用面积。若另一个角色放在包围盒内的空位处，两者的命中区域重叠，InputSystem 可能选错角色。初版不处理，后续可通过扩展 InputSystem 或在 TouchHandler 中做精确 cell 命中检查来解决。
