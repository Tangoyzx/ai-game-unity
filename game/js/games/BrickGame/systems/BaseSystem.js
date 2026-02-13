/**
 * BaseSystem - 基地系统
 * 
 * 负责：
 * 1. 创建和管理基地实体
 * 2. 监听怪物攻击事件并扣除血量
 * 3. 血量归零时触发游戏结束
 * 4. 渲染基地血条 UI
 */
const System = require('../../../framework/core/System');
const SpriteRenderer = require('../../../framework/components/SpriteRenderer');
const BaseComponent = require('../components/BaseComponent');
const GameStateManager = require('../utils/GameStateManager');

class BaseSystem extends System {
  static ID = 'BaseSystem';
  static Query = null;

  constructor() {
    super();
    
    /** @type {import('../../../framework/core/Entity')|null} 基地实体 */
    this._baseEntity = null;
    
    /** @type {import('./PathSystem')} PathSystem 引用 */
    this._pathSystem = null;
  }

  OnInit() {
    // 获取 PathSystem 引用
    this._pathSystem = this.world.GetSystem('PathSystem');
    if (!this._pathSystem) {
      console.error('[BaseSystem] PathSystem not found!');
      return;
    }
    
    // 创建基地实体
    this._createBase();
    
    // 监听怪物攻击事件
    this._onMonsterAttack = this._onMonsterAttack.bind(this);
    this.On('monster_attack_base', this._onMonsterAttack);
    
    console.log('[BaseSystem] Initialized');
  }

  OnDispose() {
    this.Off('monster_attack_base', this._onMonsterAttack);
  }

  /**
   * 创建基地实体
   * @private
   */
  _createBase() {
    // 获取路径终点位置
    const endPos = this._pathSystem.GetEndPosition();
    
    this._baseEntity = this.world.CreateEntity('base');
    const transform = this._baseEntity.GetComponent('Transform');
    transform.x = endPos.x;
    transform.y = endPos.y;
    
    // 添加渲染器（矩形基地）
    this._baseEntity.AddComponent(new SpriteRenderer({
      shape: 'rect',
      width: 40,
      height: 40,
      color: '#0088ff',
      borderColor: '#0044aa',
      borderWidth: 2
    }));
    
    // 添加基地组件
    this._baseEntity.AddComponent(new BaseComponent({
      maxHp: 1000
    }));
    
    console.log('[BaseSystem] Base created at', endPos);
  }

  /**
   * 处理怪物攻击基地事件
   * @param {string} eventId
   * @param {{monster: Entity, attack: number}} params
   * @private
   */
  _onMonsterAttack(eventId, params) {
    if (!this._baseEntity || !this._baseEntity.active) return;
    
    const baseComp = this._baseEntity.GetComponent('BaseComponent');
    if (!baseComp) return;
    
    const { attack } = params;
    
    // 扣除血量
    const isDestroyed = baseComp.TakeDamage(attack);
    
    console.log(`[Base] HP: ${baseComp.hp}/${baseComp.maxHp}`);
    
    // 基地被摧毁
    if (isDestroyed) {
      this._onBaseDestroyed();
    }
  }

  /**
   * 基地被摧毁处理
   * @private
   */
  _onBaseDestroyed() {
    console.log('[Game] Game Over! Kills:', GameStateManager.getInstance().killCount);
    
    // 切换到游戏结束状态
    GameStateManager.getInstance().setState('gameover');
    
    // 发出游戏结束事件
    this.Emit('game_over');
  }

  Update(dt) {
    const ctx = this.world.ctx;
    if (!ctx || !this._baseEntity || !this._baseEntity.active) return;
    
    // 渲染基地血条
    this._renderHealthBar(ctx);
  }

  /**
   * 渲染基地血条
   * @param {CanvasRenderingContext2D} ctx
   * @private
   */
  _renderHealthBar(ctx) {
    const baseComp = this._baseEntity.GetComponent('BaseComponent');
    if (!baseComp) return;
    
    const transform = this._baseEntity.GetComponent('Transform');
    const hpRatio = baseComp.GetHpRatio();
    
    // 血条配置
    const barWidth = 60;
    const barHeight = 8;
    const barX = transform.x - barWidth / 2;
    const barY = transform.y - 35; // 基地上方
    
    ctx.save();
    
    // 血条背景（黑色）
    ctx.fillStyle = '#000000';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // 血条前景（根据血量变色）
    let barColor = '#00ff00'; // 绿色
    if (hpRatio < 0.3) {
      barColor = '#ff0000'; // 红色
    } else if (hpRatio < 0.6) {
      barColor = '#ffff00'; // 黄色
    }
    
    ctx.fillStyle = barColor;
    ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);
    
    // 血条边框
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
    
    // 血量文本
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${Math.ceil(baseComp.hp)}/${baseComp.maxHp}`, transform.x, barY + barHeight + 2);
    
    ctx.restore();
  }

  /**
   * 重置基地系统（用于重新开始游戏）
   */
  Reset() {
    if (!this._baseEntity || !this._baseEntity.active) {
      // 基地不存在，重新创建
      this._createBase();
    } else {
      // 重置血量
      const baseComp = this._baseEntity.GetComponent('BaseComponent');
      if (baseComp) {
        baseComp.Reset();
      }
    }
    
    console.log('[BaseSystem] Reset');
  }
}

module.exports = BaseSystem;
