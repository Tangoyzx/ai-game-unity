/**
 * World - 游戏世界
 * 
 * 一切的容器和入口。管理所有 Entity、System 和全局事件。
 */
const EventBus = require('./EventBus');
const Entity = require('./Entity');
const Transform = require('../components/Transform');

class World {
  constructor() {
    /** @type {EventBus} 全局事件总线 */
    this.eventBus = new EventBus();

    // ---- 画布 ----
    /** @type {HTMLCanvasElement|null} 主画布 */
    this.canvas = null;
    /** @type {CanvasRenderingContext2D|null} 主画布 context */
    this.ctx = null;
    /** @type {number} 画布宽 */
    this.width = 0;
    /** @type {number} 画布高 */
    this.height = 0;

    // ---- 内部状态 ----
    /** @type {Map<number, Entity>} 所有 Entity 映射表 */
    this._entities = new Map();
    /** @type {Entity[]} 所有 Entity 列表（有序） */
    this._entityList = [];
    /** @type {import('./System')[]} 已注册的 System 列表（按添加顺序） */
    this._systems = [];
    /** @type {Entity[]} 延迟销毁队列 */
    this._destroyQueue = [];
    /** @type {boolean} Query 缓存脏位 */
    this._queryDirty = true;
    /** @type {Map<string, Entity[]>} Query 缓存 */
    this._queryCache = new Map();
    /** @type {boolean} 是否已初始化 */
    this._initialized = false;
  }

  // ---- 生命周期 ----

  /**
   * 初始化，传入画布
   * @param {HTMLCanvasElement} canvas - 画布对象
   */
  Init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this._initialized = true;
  }

  /**
   * 销毁世界，释放所有资源
   */
  Dispose() {
    // 销毁所有 System
    for (let i = this._systems.length - 1; i >= 0; i--) {
      this._systems[i].OnDispose();
      this._systems[i].world = null;
    }
    this._systems.length = 0;

    // 销毁所有 Entity
    for (const entity of this._entityList) {
      entity._doDestroy();
    }
    this._entities.clear();
    this._entityList.length = 0;
    this._destroyQueue.length = 0;

    // 清空事件
    this.eventBus.Clear();

    // 清空缓存
    this._queryCache.clear();
    this._queryDirty = true;
    this._initialized = false;
  }

  /**
   * 主循环：更新所有 Component → 更新所有 System → 处理延迟销毁
   * @param {number} dt - 帧间隔（秒）
   */
  Update(dt) {
    // 1. 遍历所有 active Entity 的所有有 OnUpdate 的 Component
    for (let i = 0; i < this._entityList.length; i++) {
      const entity = this._entityList[i];
      if (!entity.active || entity._destroyed) continue;
      const updatables = entity._updatableComponents;
      for (let j = 0; j < updatables.length; j++) {
        updatables[j].OnUpdate(dt);
      }
    }

    // 2. 按注册顺序执行所有 System.Update
    for (let i = 0; i < this._systems.length; i++) {
      const system = this._systems[i];
      // 刷新 System 的 entities 列表
      this._refreshSystemEntities(system);
      system.Update(dt);
    }

    // 3. 处理延迟销毁队列
    this._processDestroyQueue();
  }

  // ---- Entity 管理 ----

  /**
   * 创建 Entity，可选标签
   * @param {string} [tag=''] - 标签
   * @returns {Entity}
   */
  CreateEntity(tag) {
    const entity = new Entity(this, tag);

    // 默认添加 Transform
    const transform = new Transform();
    transform.entity = entity;
    entity._components.set('Transform', transform);
    transform._initialized = true;
    transform.OnInit();

    this._entities.set(entity.id, entity);
    this._entityList.push(entity);
    this._markQueryDirty();

    return entity;
  }

  /**
   * 销毁 Entity（标记延迟销毁）
   * @param {Entity|number} entityOrId
   */
  DestroyEntity(entityOrId) {
    const entity = typeof entityOrId === 'number'
      ? this._entities.get(entityOrId)
      : entityOrId;
    if (entity) {
      entity.Destroy();
    }
  }

  /**
   * 按 ID 获取 Entity
   * @param {number} id
   * @returns {Entity|null}
   */
  GetEntity(id) {
    return this._entities.get(id) || null;
  }

  /**
   * 按标签获取 Entity 列表
   * @param {string} tag
   * @returns {Entity[]}
   */
  GetEntitiesByTag(tag) {
    const result = [];
    for (let i = 0; i < this._entityList.length; i++) {
      const entity = this._entityList[i];
      if (entity.tag === tag && entity.active && !entity._destroyed) {
        result.push(entity);
      }
    }
    return result;
  }

  // ---- System 管理 ----

  /**
   * 注册 System（按添加顺序执行）
   * @param {import('./System')} system
   * @returns {import('./System')}
   */
  AddSystem(system) {
    system.world = this;
    this._systems.push(system);
    system.OnInit();
    return system;
  }

  /**
   * 移除 System
   * @param {import('./System')} system
   */
  RemoveSystem(system) {
    const idx = this._systems.indexOf(system);
    if (idx !== -1) {
      system.OnDispose();
      system.world = null;
      system.entities = [];
      this._systems.splice(idx, 1);
    }
  }

  /**
   * 按 ID 获取已注册的 System
   * @param {string} systemId - System 的静态 ID
   * @returns {import('./System')|null}
   */
  GetSystem(systemId) {
    for (let i = 0; i < this._systems.length; i++) {
      if (this._systems[i].constructor.ID === systemId) {
        return this._systems[i];
      }
    }
    return null;
  }

  // ---- 查询 ----

  /**
   * 查询拥有指定 Component 组合的所有活跃 Entity
   * @param {...string} componentIds - Component ID 列表
   * @returns {Entity[]}
   */
  Query(...componentIds) {
    if (componentIds.length === 0) return [];

    const key = componentIds.sort().join('+');

    if (!this._queryDirty && this._queryCache.has(key)) {
      return this._queryCache.get(key);
    }

    const result = [];
    for (let i = 0; i < this._entityList.length; i++) {
      const entity = this._entityList[i];
      if (!entity.active || entity._destroyed) continue;
      let match = true;
      for (let j = 0; j < componentIds.length; j++) {
        if (!entity.HasComponent(componentIds[j])) {
          match = false;
          break;
        }
      }
      if (match) {
        result.push(entity);
      }
    }

    this._queryCache.set(key, result);
    return result;
  }

  /**
   * 查询第一个匹配的 Entity（适合单例）
   * @param {...string} componentIds
   * @returns {Entity|null}
   */
  QueryOne(...componentIds) {
    const results = this.Query(...componentIds);
    return results.length > 0 ? results[0] : null;
  }

  // ---- 内部方法 ----

  /**
   * 标记 Query 缓存脏位
   * @private
   */
  _markQueryDirty() {
    this._queryDirty = true;
    this._queryCache.clear();
  }

  /**
   * 将 Entity 加入延迟销毁队列
   * @param {Entity} entity
   * @private
   */
  _scheduleDestroy(entity) {
    this._destroyQueue.push(entity);
  }

  /**
   * 处理延迟销毁队列
   * @private
   */
  _processDestroyQueue() {
    if (this._destroyQueue.length === 0) return;

    // 复制队列，因为销毁子 Entity 可能会添加新的
    const queue = this._destroyQueue.slice();
    this._destroyQueue.length = 0;

    for (let i = 0; i < queue.length; i++) {
      const entity = queue[i];
      if (!this._entities.has(entity.id)) continue;

      // 从列表中移除
      this._entities.delete(entity.id);
      const idx = this._entityList.indexOf(entity);
      if (idx !== -1) {
        this._entityList.splice(idx, 1);
      }

      // 实际销毁
      entity._doDestroy();
    }

    // 如果销毁过程中有新的待销毁 Entity，递归处理
    if (this._destroyQueue.length > 0) {
      this._processDestroyQueue();
    }

    this._markQueryDirty();
  }

  /**
   * 刷新 System 的 entities 列表
   * @param {import('./System')} system
   * @private
   */
  _refreshSystemEntities(system) {
    const queryIds = system.constructor.Query;
    if (!queryIds || queryIds.length === 0) {
      system.entities = [];
      return;
    }
    system.entities = this.Query(...queryIds);
  }
}

module.exports = World;
