/**
 * Entity - 游戏对象
 * 
 * Component 的容器。不允许继承，通过 Component 组合定义行为。
 */

let _entityIdCounter = 0;

class Entity {
  /**
   * @param {import('./World')} world - 所属 World
   * @param {string} [tag=''] - 标签
   */
  constructor(world, tag) {
    /** @type {number} 唯一 ID（自增） */
    this.id = ++_entityIdCounter;
    /** @type {string} 标签 */
    this.tag = tag || '';
    /** @type {boolean} 是否激活 */
    this.active = true;
    /** @type {import('./World')} 所属 World */
    this.world = world;

    /** @type {Map<string, import('./Component')>} 组件映射表 */
    this._components = new Map();
    /** @type {import('./Component')[]} 有 OnUpdate 的组件列表（优化用） */
    this._updatableComponents = [];
    /** @type {boolean} 是否标记为待销毁 */
    this._destroyed = false;
  }

  // ---- Component 管理 ----

  /**
   * 添加组件，自动调用 OnInit
   * @param {import('./Component')} component - 组件实例
   * @returns {import('./Component')} 返回添加的组件
   */
  AddComponent(component) {
    const id = component.constructor.ID;
    if (!id) {
      console.warn('[Entity] Component 缺少 static ID 定义');
      return component;
    }

    if (this._components.has(id)) {
      console.warn(`[Entity] Entity(${this.id}) 已存在 Component "${id}"，请勿重复添加`);
      return this._components.get(id);
    }

    // Renderer 互斥检查
    if ((id === 'SpriteRenderer' && this._components.has('TextureRenderer')) ||
        (id === 'TextureRenderer' && this._components.has('SpriteRenderer'))) {
      console.warn(`[Entity] Entity(${this.id}) SpriteRenderer 与 TextureRenderer 互斥，只能挂载其中一个`);
      return component;
    }

    component.entity = this;
    this._components.set(id, component);

    // 检测是否重写了 OnUpdate
    const proto = Object.getPrototypeOf(component);
    const baseProto = require('./Component').prototype;
    if (proto.OnUpdate !== baseProto.OnUpdate) {
      component._hasUpdate = true;
      this._updatableComponents.push(component);
    }

    // 通知 World 标记 Query 缓存脏位
    if (this.world) {
      this.world._markQueryDirty();
    }

    // 调用 OnInit
    component._initialized = true;
    component.OnInit();

    return component;
  }

  /**
   * 移除组件，自动调用 OnDispose
   * @param {string} componentId - 组件 ID
   */
  RemoveComponent(componentId) {
    const component = this._components.get(componentId);
    if (!component) return;

    // 不允许移除 Transform
    if (componentId === 'Transform') {
      console.warn(`[Entity] Entity(${this.id}) 不允许移除 Transform 组件`);
      return;
    }

    component.OnDispose();
    component.entity = null;
    component._initialized = false;
    this._components.delete(componentId);

    // 从可更新列表中移除
    if (component._hasUpdate) {
      const idx = this._updatableComponents.indexOf(component);
      if (idx !== -1) {
        this._updatableComponents.splice(idx, 1);
      }
    }

    // 通知 World 标记 Query 缓存脏位
    if (this.world) {
      this.world._markQueryDirty();
    }
  }

  /**
   * 获取组件
   * @param {string} componentId
   * @returns {import('./Component')|null}
   */
  GetComponent(componentId) {
    return this._components.get(componentId) || null;
  }

  /**
   * 是否拥有某组件
   * @param {string} componentId
   * @returns {boolean}
   */
  HasComponent(componentId) {
    return this._components.has(componentId);
  }

  // ---- 层级（委托给 Transform）----

  /**
   * 设置父 Entity
   * @param {Entity|null} parent
   */
  SetParent(parent) {
    const transform = this.GetComponent('Transform');
    if (transform) {
      transform.SetParent(parent);
    }
  }

  /**
   * 获取父 Entity
   * @returns {Entity|null}
   */
  GetParent() {
    const transform = this.GetComponent('Transform');
    return transform ? transform.GetParent() : null;
  }

  /**
   * 添加子 Entity
   * @param {Entity} child
   */
  AddChild(child) {
    const transform = this.GetComponent('Transform');
    if (transform) {
      transform.AddChild(child);
    }
  }

  /**
   * 移除子 Entity
   * @param {Entity} child
   */
  RemoveChild(child) {
    const transform = this.GetComponent('Transform');
    if (transform) {
      transform.RemoveChild(child);
    }
  }

  /**
   * 获取所有子 Entity
   * @returns {Entity[]}
   */
  GetChildren() {
    const transform = this.GetComponent('Transform');
    return transform ? transform.GetChildren() : [];
  }

  // ---- 生命周期 ----

  /**
   * 设置激活状态
   * @param {boolean} active
   */
  SetActive(active) {
    if (this.active !== active) {
      this.active = active;
      if (this.world) {
        this.world._markQueryDirty();
      }
    }
  }

  /**
   * 标记销毁（延迟到帧末处理）
   */
  Destroy() {
    if (!this._destroyed) {
      this._destroyed = true;
      if (this.world) {
        this.world._scheduleDestroy(this);
      }
    }
  }

  /**
   * 内部方法：实际执行销毁，清理所有组件
   * @private
   */
  _doDestroy() {
    // 销毁所有子 Entity
    const children = this.GetChildren();
    for (let i = children.length - 1; i >= 0; i--) {
      children[i].Destroy();
    }

    // 从父级移除
    const parent = this.GetParent();
    if (parent) {
      parent.RemoveChild(this);
    }

    // 销毁所有组件（调用 OnDispose）
    for (const [id, component] of this._components) {
      component.OnDispose();
      component.entity = null;
      component._initialized = false;
    }
    this._components.clear();
    this._updatableComponents.length = 0;

    this.active = false;
    this.world = null;
  }
}

/**
 * 重置 Entity ID 计数器（仅测试用）
 */
Entity._resetIdCounter = function () {
  _entityIdCounter = 0;
};

module.exports = Entity;
