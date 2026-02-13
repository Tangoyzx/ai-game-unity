/**
 * MonsterFactory - 怪物实体工厂
 * 
 * 提供创建怪物实体的工厂函数。
 */
const SpriteRenderer = require('../../../framework/components/SpriteRenderer');
const MonsterComponent = require('../components/MonsterComponent');
const { getMonsterType } = require('./MonsterDefs');

/**
 * 创建怪物实体
 * 
 * @param {import('../../../framework/core/World')} world - 游戏世界
 * @param {string} typeId - 怪物类型 ID
 * @param {number} pathOffset - 路径圈层 (0=内圈/1=中圈/2=外圈)
 * @returns {import('../../../framework/core/Entity')|null} 创建的怪物实体，类型不存在则返回 null
 */
function createMonster(world, typeId, pathOffset) {
  const typeDef = getMonsterType(typeId);
  if (!typeDef) {
    console.error(`[MonsterFactory] Unknown monster type: ${typeId}`);
    return null;
  }

  // 创建怪物实体
  const monster = world.CreateEntity('monster');
  const transform = monster.GetComponent('Transform');
  
  // 初始位置会由 MonsterSystem 在生成时设置
  transform.x = 0;
  transform.y = 0;

  // 添加圆形渲染器
  monster.AddComponent(new SpriteRenderer({
    shape: 'circle',
    radius: typeDef.radius,
    color: typeDef.color,
    borderColor: '#000000',
    borderWidth: 1
  }));

  // 添加怪物组件
  monster.AddComponent(new MonsterComponent({
    typeId: typeId,
    hp: typeDef.hp,
    speed: typeDef.speed,
    attack: typeDef.attack,
    pathOffset: pathOffset
  }));

  return monster;
}

module.exports = {
  createMonster
};
