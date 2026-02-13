/**
 * BaseComponent - 基地组件
 * 
 * 存储基地的血量数据。
 */
const Component = require('../../../framework/core/Component');

class BaseComponent extends Component {
  static ID = 'BaseComponent';

  /**
   * @param {object} [options]
   * @param {number} [options.maxHp=1000] - 最大血量
   */
  constructor(options) {
    super();
    
    const opts = options || {};
    
    /** @type {number} 最大血量 */
    this.maxHp = opts.maxHp !== undefined ? opts.maxHp : 1000;
    
    /** @type {number} 当前血量 */
    this.hp = this.maxHp;
  }

  /**
   * 受到伤害
   * @param {number} damage - 伤害值
   * @returns {boolean} 是否已被摧毁
   */
  TakeDamage(damage) {
    this.hp -= damage;
    
    if (this.hp <= 0) {
      this.hp = 0;
      return true; // 基地被摧毁
    }
    
    return false;
  }

  /**
   * 获取血量百分比
   * @returns {number} 0-1 之间的值
   */
  GetHpRatio() {
    return this.hp / this.maxHp;
  }

  /**
   * 重置血量
   */
  Reset() {
    this.hp = this.maxHp;
  }
}

module.exports = BaseComponent;
