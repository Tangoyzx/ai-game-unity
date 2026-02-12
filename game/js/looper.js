/**
 * Looper - requestAnimationFrame 主循环封装
 * 
 * 负责驱动游戏主循环，计算帧间隔 dt（秒），调用 World.Update(dt)。
 */
class Looper {
  /**
   * @param {import('./framework/core/World')} world - 游戏世界实例
   */
  constructor(world) {
    /** @type {import('./framework/core/World')} */
    this.world = world;
    /** @type {number} 上一帧时间戳（毫秒） */
    this._lastTime = 0;
    /** @type {number} requestAnimationFrame ID */
    this._rafId = 0;
    /** @type {boolean} 是否正在运行 */
    this._running = false;
    /** @type {Function} 绑定的循环函数 */
    this._loopBound = this._loop.bind(this);
  }

  /**
   * 启动主循环
   */
  Start() {
    if (this._running) return;
    this._running = true;
    this._lastTime = Date.now();
    this._rafId = requestAnimationFrame(this._loopBound);
  }

  /**
   * 停止主循环
   */
  Stop() {
    if (!this._running) return;
    this._running = false;
    cancelAnimationFrame(this._rafId);
  }

  /**
   * 主循环函数
   * @private
   */
  _loop() {
    if (!this._running) return;

    const now = Date.now();
    const dt = (now - this._lastTime) / 1000; // 转为秒
    this._lastTime = now;

    // 更新游戏世界
    this.world.Update(dt);

    // 请求下一帧
    this._rafId = requestAnimationFrame(this._loopBound);
  }
}

module.exports = Looper;
