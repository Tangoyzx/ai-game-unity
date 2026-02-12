/**
 * RigidBody - 物理属性
 * 
 * 存储速度和弹性系数。位置更新和碰撞解算由 PhysicsSystem 统一处理。
 * 不重写 OnUpdate。
 */
const Component = require('../core/Component');

class RigidBody extends Component {
  static ID = 'RigidBody';

  /**
   * @param {object} [options]
   * @param {number} [options.vx=0]
   * @param {number} [options.vy=0]
   * @param {number} [options.bounce=1]
   */
  constructor(options) {
    super();
    const opts = options || {};
    /** @type {number} X 速度（像素/秒） */
    this.vx = opts.vx || 0;
    /** @type {number} Y 速度（像素/秒） */
    this.vy = opts.vy || 0;
    /** @type {number} 弹性系数（0 = 不弹，1 = 完美反弹） */
    this.bounce = opts.bounce !== undefined ? opts.bounce : 1;
  }

  /**
   * 设置速度
   * @param {number} vx
   * @param {number} vy
   */
  SetVelocity(vx, vy) {
    this.vx = vx;
    this.vy = vy;
  }

  /**
   * 按角度设置速度
   * @param {number} angle - 角度（弧度）
   * @param {number} speed - 速率
   */
  SetVelocityFromAngle(angle, speed) {
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  /**
   * 获取当前速率
   * @returns {number}
   */
  get speed() {
    return Math.sqrt(this.vx * this.vx + this.vy * this.vy);
  }
}

module.exports = RigidBody;
