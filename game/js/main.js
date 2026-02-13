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

  world.AddSystem(new fw.RenderSystem());         // 渲染

  // ---- 5. 注册角色系统（在 RenderSystem 之后，叠加绘制影子和角色预览）----
  const characterSystem = new CharacterSystem();
  world.AddSystem(characterSystem);
  BrickGame.InitCharacters(world, characterSystem);

  // ---- 6. 启动主循环 ----
  const looper = new Looper(world);
  looper.Start();

  console.log('[Game] 启动完成', world.width, 'x', world.height);
};
