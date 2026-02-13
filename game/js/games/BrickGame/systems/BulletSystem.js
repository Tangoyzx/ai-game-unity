/**
 * BulletSystem - 子弹系统
 * 
 * 负责：
 * 1. 监听角色发射子弹请求
 * 2. 创建子弹实体
 * 3. 每帧动态查找最前方怪物
 * 4. 计算子弹到目标的方向向量
 * 5. 更新子弹位置实现追踪
 * 6. 检测子弹与怪物距离判断命中
 * 7. 命中后对怪物造成伤害并销毁子弹
 * 8. 场景无怪物时自动销毁子弹
 */
const System = require('../../../framework/core/System');
const { createBullet } = require('../utils/BulletFactory');
const GameStateManager = require('../utils/GameStateManager');

class BulletSystem extends System {
  static ID = 'BulletSystem';
  static Query = ['BulletComponent'];

  constructor() {
    super();
    
    /** @type {number} 子弹最大存活时间（秒）*/
    this._maxLifetime = 5;
    
    /** @type {number} 命中检测半径 */
    this._hitRadius = 10;
  }

  OnInit() {
    // 监听发射子弹事件
    this._onShootBullet = this._onShootBullet.bind(this);
    this.On('shoot_bullet', this._onShootBullet);
    
    console.log('[BulletSystem] Initialized');
  }

  OnDispose() {
    this.Off('shoot_bullet', this._onShootBullet);
  }

  /**
   * 处理发射子弹事件
   * @param {string} eventId
   * @param {{x: number, y: number, damage: number}} params
   * @private
   */
  _onShootBullet(eventId, params) {
    const { x, y, damage } = params;
    createBullet(this.world, x, y, damage);
  }

  Update(dt) {
    const gameState = GameStateManager.getInstance();
    
    // 游戏结束时不更新子弹
    if (!gameState.isPlaying()) {
      return;
    }
    
    // 获取所有子弹
    const bullets = this.entities;
    if (bullets.length === 0) return;
    
    // 查找最前方的怪物（只查一次，所有子弹共享）
    const targetMonster = this._findFrontmostMonster();
    
    // 如果没有怪物，销毁所有子弹
    if (!targetMonster) {
      for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].Destroy();
      }
      return;
    }
    
    // 更新每个子弹
    const targetTransform = targetMonster.GetComponent('Transform');
    const targetX = targetTransform.x;
    const targetY = targetTransform.y;
    
    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];
      const bulletComp = bullet.GetComponent('BulletComponent');
      const bulletTransform = bullet.GetComponent('Transform');
      
      // 更新生命周期
      bulletComp.lifetime += dt;
      if (bulletComp.lifetime > this._maxLifetime) {
        bullet.Destroy();
        continue;
      }
      
      // 计算到目标的方向向量
      const dx = targetX - bulletTransform.x;
      const dy = targetY - bulletTransform.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // 检测命中
      if (distance < this._hitRadius) {
        // 命中目标
        const monsterComp = targetMonster.GetComponent('MonsterComponent');
        if (monsterComp) {
          monsterComp.TakeDamage(bulletComp.damage);
        }
        bullet.Destroy();
        continue;
      }
      
      // 归一化方向向量
      if (distance > 0) {
        const dirX = dx / distance;
        const dirY = dy / distance;
        
        // 更新子弹位置
        bulletTransform.x += dirX * bulletComp.speed * dt;
        bulletTransform.y += dirY * bulletComp.speed * dt;
      }
    }
  }

  /**
   * 查找路径最前方的怪物（pathProgress 最大）
   * @returns {import('../../../framework/core/Entity')|null}
   * @private
   */
  _findFrontmostMonster() {
    const monsters = this.world.Query('MonsterComponent');
    if (monsters.length === 0) return null;
    
    let frontmost = null;
    let maxProgress = -1;
    
    for (let i = 0; i < monsters.length; i++) {
      const monster = monsters[i];
      if (!monster.active) continue;
      
      const monsterComp = monster.GetComponent('MonsterComponent');
      if (!monsterComp || monsterComp.state === 'dead') continue;
      
      if (monsterComp.pathProgress > maxProgress) {
        maxProgress = monsterComp.pathProgress;
        frontmost = monster;
      }
    }
    
    return frontmost;
  }

  /**
   * 重置子弹系统（用于重新开始游戏）
   */
  Reset() {
    // 销毁所有子弹
    const bullets = this.entities.slice(); // 复制数组避免迭代中修改
    for (let i = 0; i < bullets.length; i++) {
      bullets[i].Destroy();
    }
    
    console.log('[BulletSystem] Reset');
  }
}

module.exports = BulletSystem;
