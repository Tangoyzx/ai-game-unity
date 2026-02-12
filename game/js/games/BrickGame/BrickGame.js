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
const BrickGameSystem = require('./BrickGameSystem');
const { createBall, createBrick } = require('./BrickFactory');

/** 网格常量 */
const CELL_SIZE = 32;       // 每个网格单元的像素大小
const GRID_COLS = 10;       // 网格列数
const GRID_ROWS = 15;       // 网格行数
const FIELD_WIDTH = GRID_COLS * CELL_SIZE;   // 场地宽度 320px
const FIELD_HEIGHT = GRID_ROWS * CELL_SIZE;  // 场地高度 480px

/** 砖块配置 */
const BRICK_HP = 20;        // 可破坏砖块的耐久度
const BALL_SPEED = 200;     // 小球速度（像素/秒）

/**
 * 启动打砖块游戏
 * 
 * @param {import('../../framework/core/World')} world - 已初始化的游戏世界
 */
function Start(world) {
  // ---- 1. 注册游戏系统（在 PhysicsSystem 之后、RenderSystem 之前）----
  world.AddSystem(new BrickGameSystem());

  // ---- 2. 计算场地原点（居中） ----
  const originX = (world.width - FIELD_WIDTH) / 2;
  const originY = (world.height - FIELD_HEIGHT) / 2;

  // ---- 3. 遍历网格，创建砖块 ----
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

  // ---- 4. 在场地正中心创建小球 ----
  const ballX = originX + FIELD_WIDTH / 2;
  const ballY = originY + FIELD_HEIGHT / 2;
  createBall(world, ballX, ballY, BALL_SPEED);

  console.log('[BrickGame] 游戏初始化完成',
    '场地:', FIELD_WIDTH, 'x', FIELD_HEIGHT,
    '原点:', originX, originY);
}

module.exports = {
  Start,
  // 导出常量供外部参考
  CELL_SIZE,
  GRID_COLS,
  GRID_ROWS,
  FIELD_WIDTH,
  FIELD_HEIGHT,
  BRICK_HP,
  BALL_SPEED
};
