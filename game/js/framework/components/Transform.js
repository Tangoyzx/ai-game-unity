/**
 * Transform - 位置/旋转/缩放 + 父子层级
 * 
 * 默认组件，每个 Entity 自动持有。不重写 OnUpdate。
 */
const Component = require('../core/Component');

class Transform extends Component {
  static ID = 'Transform';

  /**
   * @param {object} [options]
   * @param {number} [options.x=0]
   * @param {number} [options.y=0]
   * @param {number} [options.rotation=0]
   * @param {number} [options.scaleX=1]
   * @param {number} [options.scaleY=1]
   */
  constructor(options) {
    super();
    const opts = options || {};
    /** @type {number} 本地 X */
    this.x = opts.x || 0;
    /** @type {number} 本地 Y */
    this.y = opts.y || 0;
    /** @type {number} 旋转角度（弧度） */
    this.rotation = opts.rotation || 0;
    /** @type {number} X 缩放 */
    this.scaleX = opts.scaleX !== undefined ? opts.scaleX : 1;
    /** @type {number} Y 缩放 */
    this.scaleY = opts.scaleY !== undefined ? opts.scaleY : 1;

    /** @type {Entity|null} 父 Entity */
    this._parent = null;
    /** @type {Entity[]} 子 Entity 列表 */
    this._children = [];
  }

  /**
   * 世界 X 坐标（考虑父级）
   * @returns {number}
   */
  get worldX() {
    if (this._parent) {
      const parentTransform = this._parent.GetComponent('Transform');
      if (parentTransform) {
        return parentTransform.worldX + this.x;
      }
    }
    return this.x;
  }

  /**
   * 世界 Y 坐标（考虑父级）
   * @returns {number}
   */
  get worldY() {
    if (this._parent) {
      const parentTransform = this._parent.GetComponent('Transform');
      if (parentTransform) {
        return parentTransform.worldY + this.y;
      }
    }
    return this.y;
  }

  /**
   * 设置父 Entity
   * @param {import('../core/Entity')|null} parentEntity
   */
  SetParent(parentEntity) {
    // 从旧父级移除
    if (this._parent) {
      const oldParentTransform = this._parent.GetComponent('Transform');
      if (oldParentTransform) {
        const idx = oldParentTransform._children.indexOf(this.entity);
        if (idx !== -1) {
          oldParentTransform._children.splice(idx, 1);
        }
      }
    }

    this._parent = parentEntity;

    // 添加到新父级
    if (parentEntity) {
      const newParentTransform = parentEntity.GetComponent('Transform');
      if (newParentTransform && newParentTransform._children.indexOf(this.entity) === -1) {
        newParentTransform._children.push(this.entity);
      }
    }
  }

  /**
   * 添加子 Entity
   * @param {import('../core/Entity')} childEntity
   */
  AddChild(childEntity) {
    const childTransform = childEntity.GetComponent('Transform');
    if (childTransform) {
      childTransform.SetParent(this.entity);
    }
  }

  /**
   * 移除子 Entity
   * @param {import('../core/Entity')} childEntity
   */
  RemoveChild(childEntity) {
    const childTransform = childEntity.GetComponent('Transform');
    if (childTransform && childTransform._parent === this.entity) {
      childTransform.SetParent(null);
    }
  }

  /**
   * 获取父 Entity
   * @returns {import('../core/Entity')|null}
   */
  GetParent() {
    return this._parent;
  }

  /**
   * 获取所有子 Entity
   * @returns {import('../core/Entity')[]}
   */
  GetChildren() {
    return this._children.slice();
  }
}

module.exports = Transform;
