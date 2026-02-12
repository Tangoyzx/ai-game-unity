/**
 * BoxCollider - 矩形碰撞体
 * 
 * 不重写 OnUpdate。
 */
const Component = require('../core/Component');

class BoxCollider extends Component {
  static ID = 'BoxCollider';

  /**
   * @param {number} [width=32] - 碰撞区域宽
   * @param {number} [height=32] - 碰撞区域高
   * @param {object} [options]
   * @param {number} [options.offsetX=0]
   * @param {number} [options.offsetY=0]
   */
  constructor(width, height, options) {
    super();
    /** @type {number} 碰撞区域宽 */
    this.width = width !== undefined ? width : 32;
    /** @type {number} 碰撞区域高 */
    this.height = height !== undefined ? height : 32;
    const opts = options || {};
    /** @type {number} 相对 Transform 的偏移 X */
    this.offsetX = opts.offsetX || 0;
    /** @type {number} 相对 Transform 的偏移 Y */
    this.offsetY = opts.offsetY || 0;
  }

  /**
   * 获取世界空间下的碰撞矩形
   * @returns {{ left: number, right: number, top: number, bottom: number }}
   */
  GetBounds() {
    const transform = this.GetComponent('Transform');
    if (!transform) {
      return { left: 0, right: 0, top: 0, bottom: 0 };
    }
    const wx = transform.worldX + this.offsetX;
    const wy = transform.worldY + this.offsetY;
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    return {
      left: wx - halfW,
      right: wx + halfW,
      top: wy - halfH,
      bottom: wy + halfH
    };
  }
}

module.exports = BoxCollider;
