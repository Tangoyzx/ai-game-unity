/**
 * 游戏主入口
 * 
 * 由 game.js 调用: require('./js/main')()
 * 负责初始化框架、创建游戏对象、注册 System、启动主循环。
 */
const fw = require('./framework/index');
const Looper = require('./looper');
const BrickGame = require('./games/BrickGame/BrickGame');
const CharacterSystem = require('./games/BrickGame/systems/CharacterSystem');
const PathSystem = require('./games/BrickGame/systems/PathSystem');
const MonsterSystem = require('./games/BrickGame/systems/MonsterSystem');
const BaseSystem = require('./games/BrickGame/systems/BaseSystem');
const BulletSystem = require('./games/BrickGame/systems/BulletSystem');
const GameStateManager = require('./games/BrickGame/utils/GameStateManager');
const GameOverUI = require('./games/BrickGame/ui/GameOverUI');

module.exports = function main() {
  // ---- 1. 获取画布 ----
  const canvas = wx.createCanvas();
  
  // ---- 2. 创建并初始化 World ----
  const world = new fw.World();
  world.Init(canvas);

  // ---- 3. 注册内置 System（顺序重要）----
  world.AddSystem(new fw.InputSystem());          // 输入处理
  world.AddSystem(new fw.PhysicsSystem());        // 物理移动 + 碰撞

  // ---- 4. 启动打砖块游戏（内部注册 BrickGameSystem，需在 RenderSystem 之前）----
  BrickGame.Start(world);

  // ---- 5. 初始化路径数据（在注册塔防系统之前） ----
  const pathSystem = new PathSystem();
  
  // 路径系统必须先初始化数据，MonsterSystem/BaseSystem 的 OnInit 会通过 GetSystem 获取路径数据
  pathSystem.Init({
    originX: BrickGame.originX,
    originY: BrickGame.originY,
    fieldWidth: BrickGame.FIELD_WIDTH,
    fieldHeight: BrickGame.FIELD_HEIGHT,
    cellSize: BrickGame.CELL_SIZE
  });
  
  const monsterSystem = new MonsterSystem();
  const baseSystem = new BaseSystem();
  const bulletSystem = new BulletSystem();

  // 注册子弹逻辑系统（在 RenderSystem 之前）
  world.AddSystem(bulletSystem);

  // ---- 6. RenderSystem（清屏 + 绘制实体） ----
  world.AddSystem(new fw.RenderSystem());         // 渲染

  // ---- 7. PathSystem / MonsterSystem / BaseSystem 在 RenderSystem 之后注册 ----
  // 确保路径、怪物血条、基地血条等 UI 绘制不被清屏覆盖
  world.AddSystem(pathSystem);
  world.AddSystem(monsterSystem);
  world.AddSystem(baseSystem);

  // ---- 6. 注册角色系统（在 RenderSystem 之后，叠加绘制影子和角色预览）----
  const characterSystem = new CharacterSystem();
  world.AddSystem(characterSystem);
  
  // ---- 7. 初始化角色系统 ----
  BrickGame.InitCharacters(world, characterSystem);

  // ---- 8. 游戏结束 UI 和重启逻辑 ----
  const gameStateManager = GameStateManager.getInstance();
  
  // 通过 InputSystem 的全局事件监听点击（避免与 InputSystem 冲突）
  const inputSystem = world.GetSystem('InputSystem');
  
  inputSystem.On('click', (data) => {
    if (gameStateManager.isGameOver()) {
      // 检查是否点击了重启按钮
      if (GameOverUI.isRestartButtonClicked(data.x, data.y)) {
        console.log('[Game] Restarting game...');
        restartGame();
      }
    }
  });
  
  // 重启游戏函数
  function restartGame() {
    gameStateManager.reset();
    monsterSystem.Reset();
    baseSystem.Reset();
    bulletSystem.Reset();
    GameOverUI.reset();
  }
  
  // 扩展 World 的 Update 方法，在游戏结束时渲染 UI
  const originalUpdate = world.Update.bind(world);
  world.Update = function(dt) {
    originalUpdate(dt);
    
    // 游戏结束时渲染 GameOver UI
    if (gameStateManager.isGameOver() && world.ctx) {
      GameOverUI.render(
        world.ctx,
        gameStateManager.killCount,
        world.width,
        world.height
      );
    }
  };

  // ---- 9. 启动主循环 ----
  const looper = new Looper(world);
  looper.Start();

  console.log('[Game] 启动完成', world.width, 'x', world.height);
};
