/**
 * BulletComponent - 子弹组件
 * 
 * 存储子弹的数据，包括伤害、速度、生命周期等。
 * 注意：不存储固定目标ID，每帧动态追踪最前方怪物。
 */
const Component = require('../../../framework/core/Component');

class BulletComponent extends Component {
  static ID = 'BulletComponent';

  /**
   * @param {object} options
   * @param {number} options.damage - 伤害值
   * @param {number} [options.speed=300] - 飞行速度（像素/秒）
   */
  constructor(options) {
    super();
    
    /** @type {number} 伤害值 */
    this.damage = options.damage;
    
    /** @type {number} 飞行速度（像素/秒）*/
    this.speed = options.speed !== undefined ? options.speed : 300;
    
    /** @type {number} 已存活时间（秒）*/
    this.lifetime = 0;
    
    // 注意：不存储 targetMonsterId，每帧动态查找目标
  }
}

module.exports = BulletComponent;
