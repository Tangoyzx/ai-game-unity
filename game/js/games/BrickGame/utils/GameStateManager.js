/**
 * GameStateManager - 游戏状态管理单例
 * 
 * 管理游戏状态、击杀计数等全局游戏数据。
 */
class GameStateManager {
  static instance = null;

  /**
   * 获取单例实例
   * @returns {GameStateManager}
   */
  static getInstance() {
    if (!this.instance) {
      this.instance = new GameStateManager();
    }
    return this.instance;
  }

  constructor() {
    if (GameStateManager.instance) {
      return GameStateManager.instance;
    }

    /** @type {string} 游戏状态: playing | gameover */
    this.state = 'playing';

    /** @type {number} 击杀计数 */
    this.killCount = 0;

    GameStateManager.instance = this;
  }

  /**
   * 设置游戏状态
   * @param {string} newState - 新状态 (playing | gameover)
   */
  setState(newState) {
    if (this.state !== newState) {
      console.log(`[GameState] State changed: ${this.state} -> ${newState}`);
      this.state = newState;
    }
  }

  /**
   * 获取当前游戏状态
   * @returns {string}
   */
  getState() {
    return this.state;
  }

  /**
   * 是否正在游戏中
   * @returns {boolean}
   */
  isPlaying() {
    return this.state === 'playing';
  }

  /**
   * 是否游戏结束
   * @returns {boolean}
   */
  isGameOver() {
    return this.state === 'gameover';
  }

  /**
   * 增加击杀计数
   */
  incrementKills() {
    this.killCount++;
  }

  /**
   * 重置游戏状态
   */
  reset() {
    console.log('[GameState] Reset game state');
    this.state = 'playing';
    this.killCount = 0;
  }
}

module.exports = GameStateManager;
