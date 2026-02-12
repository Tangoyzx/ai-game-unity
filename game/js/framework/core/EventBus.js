/**
 * EventBus - 全局事件总线
 * 
 * 提供发布/订阅模式的事件系统，用于解耦模块间通信。
 */
class EventBus {
  constructor() {
    /** @type {Map<string, Array<{callback: Function, context: any}>>} */
    this._listeners = new Map();
  }

  /**
   * 注册事件监听
   * @param {string} eventId - 事件标识
   * @param {Function} callback - 回调函数，签名 (eventId, params)
   * @param {any} [context] - 回调的 this 上下文
   */
  On(eventId, callback, context) {
    if (!this._listeners.has(eventId)) {
      this._listeners.set(eventId, []);
    }
    this._listeners.get(eventId).push({ callback, context: context || null });
  }

  /**
   * 取消事件监听
   * @param {string} eventId - 事件标识
   * @param {Function} callback - 要取消的回调函数
   * @param {any} [context] - 回调的 this 上下文
   */
  Off(eventId, callback, context) {
    const list = this._listeners.get(eventId);
    if (!list) return;
    const ctx = context || null;
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].callback === callback && list[i].context === ctx) {
        list.splice(i, 1);
      }
    }
    if (list.length === 0) {
      this._listeners.delete(eventId);
    }
  }

  /**
   * 广播事件
   * @param {string} eventId - 事件标识
   * @param {any} [params] - 事件参数
   */
  Emit(eventId, params) {
    const list = this._listeners.get(eventId);
    if (!list) return;
    // 复制一份避免回调中修改列表
    const snapshot = list.slice();
    for (let i = 0; i < snapshot.length; i++) {
      const entry = snapshot[i];
      if (entry.context) {
        entry.callback.call(entry.context, eventId, params);
      } else {
        entry.callback(eventId, params);
      }
    }
  }

  /**
   * 清空所有监听
   */
  Clear() {
    this._listeners.clear();
  }
}

module.exports = EventBus;
