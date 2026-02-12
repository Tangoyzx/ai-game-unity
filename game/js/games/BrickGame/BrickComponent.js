/**
 * BrickComponent - 砖块状态组件
 * 
 * 存储砖块的耐久度和是否可破坏。
 * 提供 Hit() 方法供 BrickGameSystem 调用，自动更新颜色和销毁。
 */
const Component = require('../../framework/core/Component');

class BrickComponent extends Component {
  static ID = 'BrickComponent';

  /**
   * @param {object} [options]
   * @param {boolean} [options.destructible=true] - 是否可破坏
   * @param {number} [options.hp=20] - 耐久度
   */
  constructor(options) {
    super();
    const opts = options || {};
    /** @type {boolean} 是否可破坏 */
    this.destructible = opts.destructible !== undefined ? opts.destructible : true;
    /** @type {number} 当前耐久度 */
    this.hp = opts.hp !== undefined ? opts.hp : 20;
    /** @type {number} 最大耐久度（用于计算颜色比例） */
    this.maxHp = this.hp;
  }

  /**
   * 被小球碰撞时调用
   * 不可破坏砖块不做任何处理。
   * 可破坏砖块：减 HP、更新颜色、HP <= 0 时销毁。
   */
  Hit() {
    if (!this.destructible) return;

    this.hp--;
    if (this.hp <= 0) {
      this.entity.Destroy();
    } else {
      this._updateColor();
    }
  }

  /**
   * 根据当前 HP 比例更新 SpriteRenderer 的颜色
   * - > 66%: 绿色 #00cc44
   * - 33% ~ 66%: 黄色 #cccc00
   * - < 33%: 红色 #cc2200
   */
  _updateColor() {
    const sprite = this.GetComponent('SpriteRenderer');
    if (!sprite) return;

    const ratio = this.hp / this.maxHp;
    if (ratio > 0.66) {
      sprite.color = '#00cc44';
    } else if (ratio > 0.33) {
      sprite.color = '#cccc00';
    } else {
      sprite.color = '#cc2200';
    }
  }
}

module.exports = BrickComponent;
