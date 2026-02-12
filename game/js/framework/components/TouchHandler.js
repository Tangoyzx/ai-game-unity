/**
 * TouchHandler - 触摸交互
 * 
 * 配置触摸回调和行为。由 InputSystem 统一处理命中检测和回调派发。
 * 不重写 OnUpdate。
 */
const Component = require('../core/Component');

class TouchHandler extends Component {
  static ID = 'TouchHandler';

  /**
   * @param {object} [options]
   * @param {Function|null} [options.onTouchDown=null]
   * @param {Function|null} [options.onTouchUp=null]
   * @param {Function|null} [options.onClick=null]
   * @param {Function|null} [options.onDragStart=null]
   * @param {Function|null} [options.onDrag=null]
   * @param {Function|null} [options.onDragEnd=null]
   * @param {boolean} [options.enabled=true]
   * @param {boolean} [options.draggable=false]
   * @param {boolean} [options.swallowTouch=true]
   * @param {number} [options.dragThreshold=5]
   */
  constructor(options) {
    super();
    const opts = options || {};
    /** @type {Function|null} 触摸按下回调 (x, y) */
    this.onTouchDown = opts.onTouchDown || null;
    /** @type {Function|null} 触摸抬起回调 (x, y) */
    this.onTouchUp = opts.onTouchUp || null;
    /** @type {Function|null} 点击回调 (x, y) */
    this.onClick = opts.onClick || null;
    /** @type {Function|null} 拖动开始回调 (x, y) */
    this.onDragStart = opts.onDragStart || null;
    /** @type {Function|null} 拖动中回调 (x, y, dx, dy) */
    this.onDrag = opts.onDrag || null;
    /** @type {Function|null} 拖动结束回调 (x, y) */
    this.onDragEnd = opts.onDragEnd || null;

    /** @type {boolean} 是否启用 */
    this.enabled = opts.enabled !== undefined ? opts.enabled : true;
    /** @type {boolean} 拖动时自动更新 Transform.x/y */
    this.draggable = opts.draggable || false;
    /** @type {boolean} 阻止触摸穿透到下层 Entity */
    this.swallowTouch = opts.swallowTouch !== undefined ? opts.swallowTouch : true;
    /** @type {number} 拖动判定阈值（像素） */
    this.dragThreshold = opts.dragThreshold !== undefined ? opts.dragThreshold : 5;
  }
}

module.exports = TouchHandler;
