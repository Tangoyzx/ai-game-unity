/**
 * BrickFactory - 打砖块游戏的实体工厂
 * 
 * 提供 createBall 和 createBrick 两个工厂函数，
 * 封装小球和砖块的 Entity + Component 组合创建逻辑，便于复用。
 */
const SpriteRenderer = require('../../../framework/components/SpriteRenderer');
const RigidBody = require('../../../framework/components/RigidBody');
const CircleCollider = require('../../../framework/components/CircleCollider');
const BoxCollider = require('../../../framework/components/BoxCollider');
const BrickComponent = require('../components/BrickComponent');

/**
 * 创建小球 Entity
 * 
 * 组件组合: Transform + SpriteRenderer(circle) + CircleCollider + RigidBody
 * 
 * @param {import('../../../framework/core/World')} world - 游戏世界
 * @param {number} x - 初始位置 X
 * @param {number} y - 初始位置 Y
 * @param {number} [speed=200] - 小球速度（像素/秒）
 * @returns {import('../../../framework/core/Entity')} 创建的小球 Entity
 */
function createBall(world, x, y, speed) {
  speed = speed || 200;

  const ball = world.CreateEntity('ball');
  const transform = ball.GetComponent('Transform');
  transform.x = x;
  transform.y = y;

  // 随机方向，排除接近水平/垂直的角度（避免无聊的往返弹跳）
  // 排除每个象限轴线附近 15 度（约 0.26 弧度）
  const angle = _randomAngleAvoidAxes();

  ball.AddComponent(new RigidBody({
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    bounce: 1
  }));

  ball.AddComponent(new SpriteRenderer({
    shape: 'circle',
    radius: 5,
    color: '#ffffff'
  }));

  ball.AddComponent(new CircleCollider(5));

  return ball;
}

/**
 * 创建砖块 Entity
 * 
 * 组件组合: Transform + SpriteRenderer(rect) + BoxCollider + BrickComponent
 * 不添加 RigidBody，作为静态碰撞体参与碰撞检测。
 * 
 * @param {import('../../../framework/core/World')} world - 游戏世界
 * @param {number} x - 砖块中心 X
 * @param {number} y - 砖块中心 Y
 * @param {object} [options]
 * @param {boolean} [options.destructible=true] - 是否可破坏
 * @param {number} [options.hp=20] - 耐久度（仅可破坏砖块有效）
 * @param {string} [options.color='#00cc44'] - 初始颜色
 * @returns {import('../../../framework/core/Entity')} 创建的砖块 Entity
 */
function createBrick(world, x, y, options) {
  const opts = options || {};
  const destructible = opts.destructible !== undefined ? opts.destructible : true;
  const hp = opts.hp !== undefined ? opts.hp : 20;
  const color = opts.color || (destructible ? '#00cc44' : '#555555');

  const tag = destructible ? 'brick' : 'wall';
  const brick = world.CreateEntity(tag);
  const transform = brick.GetComponent('Transform');
  transform.x = x;
  transform.y = y;

  brick.AddComponent(new SpriteRenderer({
    shape: 'rect',
    width: 32,
    height: 32,
    color: color,
    borderColor: '#333333',
    borderWidth: 1
  }));

  brick.AddComponent(new BoxCollider(32, 32));

  brick.AddComponent(new BrickComponent({
    destructible: destructible,
    hp: hp
  }));

  return brick;
}

/**
 * 生成一个随机角度，避免接近四个轴线方向
 * 排除 0, PI/2, PI, 3PI/2 附近各 15 度（约 0.26 弧度）
 * @returns {number} 角度（弧度）
 */
function _randomAngleAvoidAxes() {
  const AVOID = 0.26; // ~15 degrees in radians
  // 在四个象限的安全范围内随机选择
  // 安全范围: [AVOID, PI/2 - AVOID] 对应每个象限
  const quadrant = Math.floor(Math.random() * 4);
  const halfPi = Math.PI / 2;
  const rangeStart = quadrant * halfPi + AVOID;
  const rangeEnd = (quadrant + 1) * halfPi - AVOID;
  return rangeStart + Math.random() * (rangeEnd - rangeStart);
}

module.exports = {
  createBall,
  createBrick
};
