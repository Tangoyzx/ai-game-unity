/**
 * Component - 组件基类
 * 
 * 能力/属性，挂载到 Entity 上。可以包含数据和行为。
 * 子类必须定义 static ID 作为唯一标识。
 */
class Component {
  /** @type {string} 子类必须定义，唯一标识 */
  static ID = '';

  constructor() {
    /** @type {import('./Entity')|null} 所属 Entity（OnInit 后可用） */
    this.entity = null;
    /** @type {boolean} 是否已初始化 */
    this._initialized = false;
    /** @type {boolean} 是否重写了 OnUpdate（框架内部优化标记） */
    this._hasUpdate = false;
  }

  /**
   * 所属 World 的便捷访问
   * @returns {import('./World')|null}
   */
  get world() {
    return this.entity ? this.entity.world : null;
  }

  // ---- 生命周期（子类重写）----

  /** 添加到 Entity 后调用 */
  OnInit() {}

  /** 每帧调用（在 System.Update 之前） */
  OnUpdate(dt) {}

  /** 从 Entity 移除 / Entity 销毁时调用 */
  OnDispose() {}

  // ---- 便捷方法 ----

  /**
   * 获取同 Entity 上的其他组件
   * @param {string} componentId
   * @returns {Component|null}
   */
  GetComponent(componentId) {
    return this.entity ? this.entity.GetComponent(componentId) : null;
  }

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

module.exports = Component;
