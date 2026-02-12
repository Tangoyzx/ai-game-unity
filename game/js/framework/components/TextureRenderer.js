/**
 * TextureRenderer - 贴图渲染
 * 
 * 纯数据组件，由 RenderSystem 统一绘制。
 * 与 SpriteRenderer 互斥：同一个 Entity 上只挂其中一个。
 * 不重写 OnUpdate。
 */
const Component = require('../core/Component');

class TextureRenderer extends Component {
  static ID = 'TextureRenderer';

  /**
   * @param {object} [options]
   * @param {string} [options.src='']
   * @param {number} [options.width=32]
   * @param {number} [options.height=32]
   * @param {number} [options.offsetX=0]
   * @param {number} [options.offsetY=0]
   * @param {boolean} [options.flipX=false]
   * @param {boolean} [options.flipY=false]
   * @param {boolean} [options.visible=true]
   * @param {number} [options.frameWidth=0]
   * @param {number} [options.frameHeight=0]
   * @param {number} [options.frameIndex=0]
   * @param {number} [options.frameCount=1]
   * @param {number} [options.frameRate=0]
   */
  constructor(options) {
    super();
    const opts = options || {};
    /** @type {string} 图片路径 */
    this.src = opts.src || '';
    /** @type {number} 绘制宽度 */
    this.width = opts.width !== undefined ? opts.width : 32;
    /** @type {number} 绘制高度 */
    this.height = opts.height !== undefined ? opts.height : 32;
    /** @type {number} 相对 Transform 的绘制偏移 X */
    this.offsetX = opts.offsetX || 0;
    /** @type {number} 相对 Transform 的绘制偏移 Y */
    this.offsetY = opts.offsetY || 0;
    /** @type {boolean} 水平翻转 */
    this.flipX = opts.flipX || false;
    /** @type {boolean} 垂直翻转 */
    this.flipY = opts.flipY || false;
    /** @type {boolean} 是否可见 */
    this.visible = opts.visible !== undefined ? opts.visible : true;

    // 帧动画支持
    /** @type {number} 单帧宽（0 = 整张图，非 0 = spritesheet 模式） */
    this.frameWidth = opts.frameWidth || 0;
    /** @type {number} 单帧高 */
    this.frameHeight = opts.frameHeight || 0;
    /** @type {number} 当前帧索引 */
    this.frameIndex = opts.frameIndex || 0;
    /** @type {number} 总帧数 */
    this.frameCount = opts.frameCount !== undefined ? opts.frameCount : 1;
    /** @type {number} 帧率（帧/秒，0 = 不自动播放） */
    this.frameRate = opts.frameRate || 0;

    /** @type {any} 已加载的图片对象（由 RenderSystem 管理） */
    this._image = null;
    /** @type {boolean} 图片是否已加载 */
    this._loaded = false;
    /** @type {number} 帧动画计时器 */
    this._frameTimer = 0;
  }
}

module.exports = TextureRenderer;
