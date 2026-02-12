/**
 * System - 系统基类
 * 
 * 跨 Entity 的全局逻辑处理器。可选的高级工具。
 * 子类必须定义 static ID 作为唯一标识。
 * 可选定义 static Query 声明需要的 Component ID 组合。
 */
class System {
  /** @type {string} 唯一标识 */
  static ID = '';

  /** @type {string[]|null} 声明需要的 Component ID 组合 */
  static Query = null;

  constructor() {
    /** @type {import('./World')|null} 所属 World */
    this.world = null;
    /** @type {import('./Entity')[]} 自动填充：匹配 Query 的 Entity 列表 */
    this.entities = [];
  }

  // ---- 生命周期（子类重写）----

  /** 添加到 World 后调用 */
  OnInit() {}

  /** 每帧调用，处理 this.entities */
  Update(dt) {}

  /** 从 World 移除时调用 */
  OnDispose() {}

  // ---- 便捷方法 ----

  /**
   * 通过 world.eventBus 发事件
   * @param {string} eventId
   * @param {any} [params]
   */
  Emit(eventId, params) {
    if (this.world) {
      this.world.eventBus.Emit(eventId, params);
    }
  }

  /**
   * 监听事件
   * @param {string} eventId
   * @param {Function} callback
   * @param {any} [context]
   */
  On(eventId, callback, context) {
    if (this.world) {
      this.world.eventBus.On(eventId, callback, context);
    }
  }

  /**
   * 取消监听事件
   * @param {string} eventId
   * @param {Function} callback
   * @param {any} [context]
   */
  Off(eventId, callback, context) {
    if (this.world) {
      this.world.eventBus.Off(eventId, callback, context);
    }
  }
}

module.exports = System;
