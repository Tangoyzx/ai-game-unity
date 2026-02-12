/**
 * CircleCollider - 圆形碰撞体
 * 
 * 不重写 OnUpdate。
 */
const Component = require('../core/Component');

class CircleCollider extends Component {
  static ID = 'CircleCollider';

  /**
   * @param {number} [radius=16] - 碰撞半径
   * @param {object} [options]
   * @param {number} [options.offsetX=0]
   * @param {number} [options.offsetY=0]
   */
  constructor(radius, options) {
    super();
    /** @type {number} 碰撞半径 */
    this.radius = radius !== undefined ? radius : 16;
    const opts = options || {};
    /** @type {number} 相对 Transform 的偏移 X */
    this.offsetX = opts.offsetX || 0;
    /** @type {number} 相对 Transform 的偏移 Y */
    this.offsetY = opts.offsetY || 0;
  }

  /**
   * 获取世界空间下的碰撞圆心
   * @returns {{ x: number, y: number }}
   */
  GetCenter() {
    const transform = this.GetComponent('Transform');
    if (!transform) {
      return { x: 0, y: 0 };
    }
    return {
      x: transform.worldX + this.offsetX,
      y: transform.worldY + this.offsetY
    };
  }
}

module.exports = CircleCollider;
