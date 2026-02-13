/**
 * CharacterDefs - 角色类型注册表
 * 
 * 纯数据配置，描述每种角色的形状和初始参数。
 * 运行时所有属性都在 CharacterComponent 实例上，此文件仅作为初始配置表。
 * 
 * 每个类型包含:
 *   - cells: 单元偏移数组 {r, c}，相对锚点 cell(0,0)
 *   - color: 初始填充色
 *   - componentClass（可选）: CharacterComponent 子类，未指定则用基类
 * 
 * 新增角色类型只需在 CHARACTER_TYPES 中添加条目。
 * 新增碰撞行为则新建 CharacterComponent 子类文件并在 componentClass 中指定。
 */

const CHARACTER_TYPES = {
  /** 1x1 方块 */
  'block_1x1': {
    cells: [{ r: 0, c: 0 }],
    color: '#6699ff',
    attack: 15
  },

  /** 1x2 横条 */
  'block_1x2': {
    cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }],
    color: '#ff9933',
    attack: 20
  },

  /** 2x1 竖条 */
  'block_2x1': {
    cells: [{ r: 0, c: 0 }, { r: 1, c: 0 }],
    color: '#33cc99',
    attack: 18
  },

  /** 2x2 缺右上角（L 形） */
  'block_2x2_L': {
    cells: [{ r: 0, c: 0 }, { r: 1, c: 0 }, { r: 1, c: 1 }],
    color: '#cc66ff',
    attack: 25
  }
};

/**
 * 获取所有可用的类型 ID 列表
 * @returns {string[]}
 */
function getTypeIds() {
  return Object.keys(CHARACTER_TYPES);
}

/**
 * 随机获取一个类型 ID
 * @returns {string}
 */
function getRandomTypeId() {
  const ids = getTypeIds();
  return ids[Math.floor(Math.random() * ids.length)];
}

module.exports = {
  CHARACTER_TYPES,
  getTypeIds,
  getRandomTypeId
};
