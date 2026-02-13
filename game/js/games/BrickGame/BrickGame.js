/**
 * BrickGame - 打砖块游戏入口
 * 
 * 负责初始化游戏场景：
 * 1. 注册 BrickGameSystem
 * 2. 计算场地原点，遍历网格创建砖块
 * 3. 创建小球
 * 
 * 使用方式:
 *   const BrickGame = require('./games/BrickGame/BrickGame');
 *   BrickGame.Start(world);
 */
const BrickGameSystem = require('./systems/BrickGameSystem');
const { createBall, createBrick } = require('./utils/BrickFactory');

/** 网格常量 */
const CELL_SIZE = 32;       // 每个网格单元的像素大小
const GRID_COLS = 10;       // 网格列数
const GRID_ROWS = 15;       // 网格行数
const FIELD_WIDTH = GRID_COLS * CELL_SIZE;   // 场地宽度 320px
const FIELD_HEIGHT = GRID_ROWS * CELL_SIZE;  // 场地高度 480px

/** 刷新区常量 */
const SPAWN_AREA_HEIGHT = 80;  // 刷新区高度（像素）

/** 砖块配置 */
const BRICK_HP = 20;        // 可破坏砖块的耐久度
const BALL_SPEED = 200;     // 小球速度（像素/秒）

/** 场地原点（由 Start 计算，供外部使用） */
let _originX = 0;
let _originY = 0;

/** 安全区信息（由 Start 获取，供 InitCharacters 使用） */
let _safeArea = null;

/**
 * 启动打砖块游戏
 * 
 * @param {import('../../framework/core/World')} world - 已初始化的游戏世界
 */
function Start(world) {
  // ---- 1. 注册游戏系统（在 PhysicsSystem 之后、RenderSystem 之前）----
  world.AddSystem(new BrickGameSystem());

  // ---- 2. 获取安全区信息 ----
  const sysInfo = wx.getSystemInfoSync();
  _safeArea = sysInfo.safeArea || {
    left: 0,
    right: sysInfo.windowWidth || world.width,
    top: 0,
    bottom: sysInfo.windowHeight || world.height
  };

  // ---- 3. 计算场地原点（主界面右对齐，保留5px右边距） ----
  const RIGHT_MARGIN = 5;
  const originX = _safeArea.right - FIELD_WIDTH - RIGHT_MARGIN;
  const originY = (world.height - FIELD_HEIGHT - SPAWN_AREA_HEIGHT) / 2;
  _originX = originX;
  _originY = originY;

  // ---- 4. 遍历网格，创建砖块 ----
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const ring = Math.min(row, GRID_ROWS - 1 - row, col, GRID_COLS - 1 - col);

      // 只有 ring 0/1/2 有砖块，ring >= 3 是空白区域
      if (ring > 2) continue;

      // 砖块中心坐标
      const cx = originX + col * CELL_SIZE + CELL_SIZE / 2;
      const cy = originY + row * CELL_SIZE + CELL_SIZE / 2;

      if (ring === 0) {
        // 最外圈：不可破坏墙壁
        createBrick(world, cx, cy, {
          destructible: false,
          color: '#555555'
        });
      } else {
        // ring 1 和 ring 2：可破坏砖块
        createBrick(world, cx, cy, {
          destructible: true,
          hp: BRICK_HP,
          color: '#00cc44'  // 初始绿色（满耐久）
        });
      }
    }
  }

  // ---- 5. 在场地正中心创建小球 ----
  const ballX = originX + FIELD_WIDTH / 2;
  const ballY = originY + FIELD_HEIGHT / 2;
  createBall(world, ballX, ballY, BALL_SPEED);

  console.log('[BrickGame] 游戏初始化完成',
    '场地:', FIELD_WIDTH, 'x', FIELD_HEIGHT,
    '原点:', originX, originY);
}

/**
 * 初始化角色系统
 * 在 CharacterSystem 注册到 World 之后调用。
 * 
 * @param {import('../../framework/core/World')} world - 游戏世界
 * @param {import('./CharacterSystem')} characterSystem - 已注册的角色系统实例
 */
function InitCharacters(world, characterSystem) {
  characterSystem.Init({
    originX: _originX,
    originY: _originY,
    gridCols: GRID_COLS,
    gridRows: GRID_ROWS,
    fieldWidth: FIELD_WIDTH,
    fieldHeight: FIELD_HEIGHT,
    spawnAreaHeight: SPAWN_AREA_HEIGHT,
    // 传递安全区信息，用于刷新区布局
    safeAreaBottom: _safeArea.bottom,
    screenWidth: world.width
  });

  // 生成初始 3 个角色
  characterSystem.SpawnCharacters();

  console.log('[BrickGame] 角色系统初始化完成',
    '刷新区高度:', SPAWN_AREA_HEIGHT);
}

module.exports = {
  Start,
  InitCharacters,
  // 导出常量供外部参考
  CELL_SIZE,
  GRID_COLS,
  GRID_ROWS,
  FIELD_WIDTH,
  FIELD_HEIGHT,
  SPAWN_AREA_HEIGHT,
  BRICK_HP,
  BALL_SPEED,
  // 导出场地原点访问器
  get originX() { return _originX; },
  get originY() { return _originY; }
};
