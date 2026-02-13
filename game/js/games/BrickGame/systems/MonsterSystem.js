/**
 * MonsterSystem - 怪物系统
 * 
 * 负责：
 * 1. 管理怪物生成策略计时器
 * 2. 创建怪物实体
 * 3. 更新怪物沿路径移动
 * 4. 检测到达终点触发攻击基地
 * 5. 管理怪物攻击计时器
 */
const System = require('../../../framework/core/System');
const { SPAWN_STRATEGIES } = require('../utils/MonsterDefs');
const { createMonster } = require('../utils/MonsterFactory');
const GameStateManager = require('../utils/GameStateManager');

class MonsterSystem extends System {
  static ID = 'MonsterSystem';
  static Query = ['MonsterComponent'];

  constructor() {
    super();
    
    /** @type {import('./PathSystem')} PathSystem 引用 */
    this._pathSystem = null;
    
    /** @type {Array<{strategy: object, delayTimer: number, intervalTimer: number}>} 生成策略状态 */
    this._spawnStates = [];
    
    /** @type {number} 同屏怪物数量限制 */
    this._maxMonsters = 30;
  }

  OnInit() {
    // 初始化生成策略状态
    this._initSpawnStrategies();
    
    console.log('[MonsterSystem] Initialized with', this._spawnStates.length, 'spawn strategies');
  }

  /**
   * 延迟获取 PathSystem 引用（因为初始化顺序问题）
   * @returns {import('./PathSystem')|null}
   * @private
   */
  _getPathSystem() {
    if (!this._pathSystem) {
      this._pathSystem = this.world.GetSystem('PathSystem');
    }
    return this._pathSystem;
  }

  /**
   * 初始化生成策略状态
   * @private
   */
  _initSpawnStrategies() {
    this._spawnStates = SPAWN_STRATEGIES.map(strategy => ({
      strategy: strategy,
      delayTimer: strategy.delay,      // 延时计时器
      intervalTimer: 0,                // 间隔计时器
      hasStarted: false                // 是否已开始生成
    }));
  }

  Update(dt) {
    const gameState = GameStateManager.getInstance();
    
    // 游戏结束时不生成和移动怪物
    if (!gameState.isPlaying()) {
      return;
    }
    
    // 1. 更新生成策略
    this._updateSpawnStrategies(dt);
    
    // 2. 更新所有怪物
    const monsters = this.entities;
    for (let i = 0; i < monsters.length; i++) {
      this._updateMonster(monsters[i], dt);
    }
  }

  /**
   * 更新生成策略
   * @param {number} dt
   * @private
   */
  _updateSpawnStrategies(dt) {
    // 检查当前怪物数量
    const currentMonsterCount = this.entities.length;
    if (currentMonsterCount >= this._maxMonsters) {
      return; // 达到数量上限，暂停生成
    }
    
    for (let i = 0; i < this._spawnStates.length; i++) {
      const state = this._spawnStates[i];
      
      // 延时阶段
      if (!state.hasStarted) {
        state.delayTimer -= dt;
        if (state.delayTimer <= 0) {
          state.hasStarted = true;
          state.intervalTimer = 0; // 立即生成第一个
        }
        continue;
      }
      
      // 间隔生成阶段
      state.intervalTimer -= dt;
      if (state.intervalTimer <= 0) {
        // 生成怪物
        this._spawnMonster(state.strategy);
        // 重置间隔计时器
        state.intervalTimer = state.strategy.interval;
      }
    }
  }

  /**
   * 生成一个怪物
   * @param {object} strategy - 生成策略
   * @private
   */
  _spawnMonster(strategy) {
    const { monsterId, pathOffset } = strategy;
    const pathSystem = this._getPathSystem();
    if (!pathSystem) return;
    
    // 创建怪物实体
    const monster = createMonster(this.world, monsterId, pathOffset);
    if (!monster) return;
    
    // 设置初始位置（路径起点）
    const startPos = pathSystem.GetPositionAtProgress(0, pathOffset);
    if (startPos) {
      const transform = monster.GetComponent('Transform');
      transform.x = startPos.x;
      transform.y = startPos.y;
    }
    
    console.log(`[Monster] Spawned ${monsterId} on path ${pathOffset} (0=inner/1=middle/2=outer)`);
  }

  /**
   * 更新单个怪物
   * @param {import('../../../framework/core/Entity')} monster
   * @param {number} dt
   * @private
   */
  _updateMonster(monster, dt) {
    const monsterComp = monster.GetComponent('MonsterComponent');
    if (!monsterComp) return;
    
    const pathSystem = this._getPathSystem();
    if (!pathSystem) return;
    
    const transform = monster.GetComponent('Transform');
    
    if (monsterComp.state === 'moving') {
      // 移动状态：沿路径前进
      monsterComp.pathProgress += monsterComp.speed * dt;
      
      // 检查是否到达终点（每条路径长度不同）
      const totalLen = pathSystem.GetTotalLength(monsterComp.pathOffset);
      if (monsterComp.pathProgress >= totalLen) {
        // 到达终点，切换到攻击状态
        monsterComp.state = 'attacking';
        monsterComp.attackTimer = 1.0; // 1 秒后第一次攻击
        
        // 固定在终点位置
        const endPos = pathSystem.GetPositionAtProgress(totalLen, monsterComp.pathOffset);
        if (endPos) {
          transform.x = endPos.x;
          transform.y = endPos.y;
        }
        
        console.log(`[Monster] ${monsterComp.typeId} reached base, starting attack`);
      } else {
        // 更新位置
        const pos = pathSystem.GetPositionAtProgress(
          monsterComp.pathProgress,
          monsterComp.pathOffset
        );
        if (pos) {
          transform.x = pos.x;
          transform.y = pos.y;
        }
      }
    } else if (monsterComp.state === 'attacking') {
      // 攻击状态：停在终点，定时攻击基地
      monsterComp.attackTimer -= dt;
      if (monsterComp.attackTimer <= 0) {
        // 发出攻击基地事件
        this.Emit('monster_attack_base', {
          monster: monster,
          attack: monsterComp.attack
        });
        // 重置攻击计时器
        monsterComp.attackTimer = 1.0; // 每秒攻击一次
      }
    }
  }

  /**
   * 重置怪物系统（用于重新开始游戏）
   */
  Reset() {
    // 销毁所有怪物
    const monsters = this.entities.slice(); // 复制数组避免迭代中修改
    for (let i = 0; i < monsters.length; i++) {
      monsters[i].Destroy();
    }
    
    // 重置生成策略
    this._initSpawnStrategies();
    
    console.log('[MonsterSystem] Reset');
  }
}

module.exports = MonsterSystem;
