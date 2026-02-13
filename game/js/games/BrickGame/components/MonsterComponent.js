/**
 * MonsterComponent - 怪物组件
 * 
 * 存储怪物的状态数据，包括血量、移速、攻击力、路径进度等。
 */
const Component = require('../../../framework/core/Component');
const GameStateManager = require('../utils/GameStateManager');

class MonsterComponent extends Component {
  static ID = 'MonsterComponent';

  /**
   * @param {object} options
   * @param {string} options.typeId - 怪物类型 ID
   * @param {number} options.hp - 初始血量
   * @param {number} options.speed - 移动速度（像素/秒）
   * @param {number} options.attack - 攻击力
   * @param {number} [options.pathOffset=0] - 路径圈层 (0=内圈/1=中圈/2=外圈)
   */
  constructor(options) {
    super();
    
    /** @type {string} 怪物类型 ID */
    this.typeId = options.typeId;
    
    /** @type {number} 当前血量 */
    this.hp = options.hp;
    
    /** @type {number} 最大血量 */
    this.maxHp = options.hp;
    
    /** @type {number} 移动速度（像素/秒）*/
    this.speed = options.speed;
    
    /** @type {number} 攻击力 */
    this.attack = options.attack;
    
    /** @type {number} 路径行走距离 */
    this.pathProgress = 0;
    
    /** @type {number} 路径圈层: 0=内圈, 1=中圈, 2=外圈 */
    this.pathOffset = options.pathOffset || 0;
    
    /** @type {string} 状态: moving | attacking | dead */
    this.state = 'moving';
    
    /** @type {number} 攻击基地计时器 */
    this.attackTimer = 0;
  }

  /**
   * 受到伤害
   * @param {number} damage - 伤害值
   */
  TakeDamage(damage) {
    if (this.state === 'dead') return;
    
    this.hp -= damage;
    
    if (this.hp <= 0) {
      this.hp = 0;
      this.state = 'dead';
      
      // 增加击杀计数
      GameStateManager.getInstance().incrementKills();
      
      console.log(`[Monster] Killed ${this.typeId}, total kills: ${GameStateManager.getInstance().killCount}`);
      
      // 销毁实体
      this.entity.Destroy();
    }
  }
}

module.exports = MonsterComponent;
