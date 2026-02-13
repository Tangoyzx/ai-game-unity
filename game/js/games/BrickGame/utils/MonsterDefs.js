/**
 * MonsterDefs - 怪物类型配置表
 * 
 * 定义怪物类型和生成策略的配置数据。
 */

/**
 * 怪物类型定义
 * @type {Object<string, {hp: number, speed: number, attack: number, color: string, radius: number}>}
 */
const MONSTER_TYPES = {
  /** 史莱姆 - 基础怪物 */
  'slime': {
    hp: 50,
    speed: 40,        // 像素/秒
    attack: 10,
    color: '#44ff44',
    radius: 8
  },

  /** 哥布林 - 强力怪物 */
  'goblin': {
    hp: 100,
    speed: 30,
    attack: 20,
    color: '#ff4444',
    radius: 10
  },

  /** 骷髅 - 快速怪物 */
  'skeleton': {
    hp: 30,
    speed: 60,
    attack: 8,
    color: '#cccccc',
    radius: 7
  }
};

/**
 * 生成策略配置
 * @type {Array<{delay: number, interval: number, pathOffset: number, monsterId: string}>}
 */
const SPAWN_STRATEGIES = [
  // 内圈路径：史莱姆持续生成
  {
    delay: 2,          // 游戏开始 2 秒后开始生成
    interval: 3,       // 每 3 秒生成一个
    pathOffset: 0,     // 内圈路径
    monsterId: 'slime'
  },
  
  // 中圈路径：史莱姆持续生成
  {
    delay: 5,
    interval: 3,
    pathOffset: 1,     // 中圈路径
    monsterId: 'slime'
  },
  
  // 外圈路径：哥布林定期生成
  {
    delay: 10,
    interval: 5,
    pathOffset: 2,     // 外圈路径
    monsterId: 'goblin'
  },
  
  // 内圈路径：骷髅快速生成
  {
    delay: 15,
    interval: 4,
    pathOffset: 0,
    monsterId: 'skeleton'
  }
];

/**
 * 获取怪物类型配置
 * @param {string} typeId - 怪物类型 ID
 * @returns {Object|null} 怪物配置对象，不存在则返回 null
 */
function getMonsterType(typeId) {
  return MONSTER_TYPES[typeId] || null;
}

/**
 * 获取所有怪物类型 ID
 * @returns {string[]}
 */
function getMonsterTypeIds() {
  return Object.keys(MONSTER_TYPES);
}

module.exports = {
  MONSTER_TYPES,
  SPAWN_STRATEGIES,
  getMonsterType,
  getMonsterTypeIds
};
