/**
 * SpriteRenderer - 矩形/圆形渲染
 * 
 * 纯数据组件，不自己绘制，由 RenderSystem 统一读取并绘制。
 * 不重写 OnUpdate。
 */
const Component = require('../core/Component');

class SpriteRenderer extends Component {
  static ID = 'SpriteRenderer';

  /**
   * @param {object} [options]
   * @param {'rect'|'circle'} [options.shape='rect']
   * @param {number} [options.width=32]
   * @param {number} [options.height=32]
   * @param {number} [options.radius=16]
   * @param {string} [options.color='#ffffff']
   * @param {string} [options.borderColor='']
   * @param {number} [options.borderWidth=1]
   * @param {boolean} [options.visible=true]
   */
  constructor(options) {
    super();
    const opts = options || {};
    /** @type {'rect'|'circle'} 形状 */
    this.shape = opts.shape || 'rect';
    /** @type {number} 宽（rect 时使用） */
    this.width = opts.width !== undefined ? opts.width : 32;
    /** @type {number} 高（rect 时使用） */
    this.height = opts.height !== undefined ? opts.height : 32;
    /** @type {number} 半径（circle 时使用） */
    this.radius = opts.radius !== undefined ? opts.radius : 16;
    /** @type {string} 填充色 */
    this.color = opts.color || '#ffffff';
    /** @type {string} 边框色（空则无边框） */
    this.borderColor = opts.borderColor || '';
    /** @type {number} 边框宽 */
    this.borderWidth = opts.borderWidth !== undefined ? opts.borderWidth : 1;
    /** @type {boolean} 是否可见 */
    this.visible = opts.visible !== undefined ? opts.visible : true;
  }
}

module.exports = SpriteRenderer;
