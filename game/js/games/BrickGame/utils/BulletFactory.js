/**
 * BulletFactory - 子弹实体工厂
 * 
 * 提供创建子弹实体的工厂函数。
 */
const SpriteRenderer = require('../../../framework/components/SpriteRenderer');
const BulletComponent = require('../components/BulletComponent');

/**
 * 创建子弹实体
 * 
 * @param {import('../../../framework/core/World')} world - 游戏世界
 * @param {number} x - 初始位置 X
 * @param {number} y - 初始位置 Y
 * @param {number} damage - 伤害值
 * @returns {import('../../../framework/core/Entity')} 创建的子弹实体
 */
function createBullet(world, x, y, damage) {
  const bullet = world.CreateEntity('bullet');
  const transform = bullet.GetComponent('Transform');
  transform.x = x;
  transform.y = y;

  // 添加小圆形渲染器
  bullet.AddComponent(new SpriteRenderer({
    shape: 'circle',
    radius: 3,
    color: '#ffff00',      // 黄色子弹
    borderColor: '#ff8800',
    borderWidth: 1
  }));

  // 添加子弹组件
  bullet.AddComponent(new BulletComponent({
    damage: damage,
    speed: 300
  }));

  return bullet;
}

module.exports = {
  createBullet
};
