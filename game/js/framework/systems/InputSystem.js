/**
 * InputSystem - 触摸输入处理
 * 
 * 缓冲平台触摸事件，在 Update 中统一处理命中检测和回调派发。
 * 初始版本只支持单点触控。
 */
const System = require('../core/System');

class InputSystem extends System {
  static ID = 'InputSystem';
  static Query = ['TouchHandler'];

  constructor() {
    super();
    /** @type {Array<{type: string, x: number, y: number}>} 触摸事件缓冲队列 */
    this._touchQueue = [];

    // 触摸状态跟踪（单点触控）
    /** @type {boolean} 是否有手指按下 */
    this._isDown = false;
    /** @type {number} 按下时的 X */
    this._startX = 0;
    /** @type {number} 按下时的 Y */
    this._startY = 0;
    /** @type {number} 上一次移动的 X */
    this._lastX = 0;
    /** @type {number} 上一次移动的 Y */
    this._lastY = 0;
    /** @type {boolean} 是否已进入拖动状态 */
    this._isDragging = false;
    /** @type {number} 累计移动距离 */
    this._totalDistance = 0;
    /** @type {import('../core/Entity')|null} 当前命中的 Entity */
    this._hitEntity = null;

    // 绑定事件处理函数（保存引用以便移除）
    this._onTouchStartBound = this._onTouchStart.bind(this);
    this._onTouchMoveBound = this._onTouchMove.bind(this);
    this._onTouchEndBound = this._onTouchEnd.bind(this);
  }

  OnInit() {
    // 注册微信小游戏触摸事件
    if (typeof wx !== 'undefined') {
      wx.onTouchStart(this._onTouchStartBound);
      wx.onTouchMove(this._onTouchMoveBound);
      wx.onTouchEnd(this._onTouchEndBound);
    } else if (this.world && this.world.canvas) {
      // 浏览器环境兼容
      const canvas = this.world.canvas;
      canvas.addEventListener('touchstart', this._onTouchStartBound);
      canvas.addEventListener('touchmove', this._onTouchMoveBound);
      canvas.addEventListener('touchend', this._onTouchEndBound);
      // 鼠标兼容
      canvas.addEventListener('mousedown', this._onMouseDownBound = (e) => {
        this._touchQueue.push({ type: 'start', x: e.offsetX, y: e.offsetY });
      });
      canvas.addEventListener('mousemove', this._onMouseMoveBound = (e) => {
        if (this._isDown) {
          this._touchQueue.push({ type: 'move', x: e.offsetX, y: e.offsetY });
        }
      });
      canvas.addEventListener('mouseup', this._onMouseUpBound = (e) => {
        this._touchQueue.push({ type: 'end', x: e.offsetX, y: e.offsetY });
      });
    }
  }

  /**
   * 平台触摸回调 - 只缓冲，不立即处理
   * @private
   */
  _onTouchStart(e) {
    const touch = e.touches ? e.touches[0] : e;
    const x = touch.clientX !== undefined ? touch.clientX : touch.pageX;
    const y = touch.clientY !== undefined ? touch.clientY : touch.pageY;
    this._touchQueue.push({ type: 'start', x, y });
  }

  _onTouchMove(e) {
    const touch = e.touches ? e.touches[0] : e;
    const x = touch.clientX !== undefined ? touch.clientX : touch.pageX;
    const y = touch.clientY !== undefined ? touch.clientY : touch.pageY;
    this._touchQueue.push({ type: 'move', x, y });
  }

  _onTouchEnd(e) {
    const touch = e.changedTouches ? e.changedTouches[0] : e;
    const x = touch.clientX !== undefined ? touch.clientX : touch.pageX;
    const y = touch.clientY !== undefined ? touch.clientY : touch.pageY;
    this._touchQueue.push({ type: 'end', x, y });
  }

  Update(dt) {
    // 处理缓冲的触摸事件
    while (this._touchQueue.length > 0) {
      const evt = this._touchQueue.shift();
      this._processTouchEvent(evt);
    }
  }

  /**
   * 处理单个触摸事件
   * @private
   */
  _processTouchEvent(evt) {
    const { type, x, y } = evt;

    switch (type) {
      case 'start':
        this._handleTouchStart(x, y);
        break;
      case 'move':
        this._handleTouchMove(x, y);
        break;
      case 'end':
        this._handleTouchEnd(x, y);
        break;
    }
  }

  /**
   * 处理触摸按下
   * @private
   */
  _handleTouchStart(x, y) {
    this._isDown = true;
    this._startX = x;
    this._startY = y;
    this._lastX = x;
    this._lastY = y;
    this._isDragging = false;
    this._totalDistance = 0;

    // 命中检测
    this._hitEntity = this._hitTest(x, y);

    if (this._hitEntity) {
      const handler = this._hitEntity.GetComponent('TouchHandler');
      if (handler && handler.enabled && handler.onTouchDown) {
        handler.onTouchDown(x, y);
      }
    } else {
      // 未命中任何 Entity，发出全局事件
      this.Emit('touch_down', { x, y });
    }
  }

  /**
   * 处理触摸移动
   * @private
   */
  _handleTouchMove(x, y) {
    if (!this._isDown) return;

    const dx = x - this._lastX;
    const dy = y - this._lastY;
    this._totalDistance += Math.sqrt(dx * dx + dy * dy);

    if (this._hitEntity) {
      const handler = this._hitEntity.GetComponent('TouchHandler');
      if (handler && handler.enabled) {
        if (!this._isDragging) {
          // 检查是否达到拖动阈值
          const distFromStart = Math.sqrt(
            (x - this._startX) * (x - this._startX) +
            (y - this._startY) * (y - this._startY)
          );
          if (distFromStart >= handler.dragThreshold) {
            this._isDragging = true;
            if (handler.onDragStart) {
              handler.onDragStart(x, y);
            }
          }
        }

        if (this._isDragging) {
          // 自动更新位置
          if (handler.draggable) {
            const transform = this._hitEntity.GetComponent('Transform');
            if (transform) {
              transform.x += dx;
              transform.y += dy;
            }
          }
          if (handler.onDrag) {
            handler.onDrag(x, y, dx, dy);
          }
        }
      }
    } else {
      // 未命中任何 Entity，发出全局事件
      this.Emit('touch_move', { x, y });
    }

    this._lastX = x;
    this._lastY = y;
  }

  /**
   * 处理触摸抬起
   * @private
   */
  _handleTouchEnd(x, y) {
    if (!this._isDown) return;

    if (this._hitEntity) {
      const handler = this._hitEntity.GetComponent('TouchHandler');
      if (handler && handler.enabled) {
        if (handler.onTouchUp) {
          handler.onTouchUp(x, y);
        }
        if (this._isDragging) {
          if (handler.onDragEnd) {
            handler.onDragEnd(x, y);
          }
        } else {
          // 未拖动过，触发 onClick
          if (handler.onClick) {
            handler.onClick(x, y);
          }
        }
      }
    } else {
      // 未命中任何 Entity
      this.Emit('touch_up', { x, y });
      if (!this._isDragging) {
        this.Emit('click', { x, y });
      }
    }

    this._isDown = false;
    this._isDragging = false;
    this._hitEntity = null;
  }

  /**
   * 命中检测：从上层到下层遍历有 TouchHandler 的 Entity
   * 后创建的 Entity（上层）优先
   * @param {number} x
   * @param {number} y
   * @returns {import('../core/Entity')|null}
   * @private
   */
  _hitTest(x, y) {
    // 从后往前遍历（后创建的优先）
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const entity = this.entities[i];
      const handler = entity.GetComponent('TouchHandler');
      if (!handler || !handler.enabled) continue;

      if (this._isPointInEntity(entity, x, y)) {
        return entity;
      }
    }
    return null;
  }

  /**
   * 判断触摸点是否在 Entity 范围内
   * 优先使用 Collider，其次使用 Renderer 尺寸
   * @private
   */
  _isPointInEntity(entity, px, py) {
    // 1. 优先检查 BoxCollider
    const boxCollider = entity.GetComponent('BoxCollider');
    if (boxCollider) {
      const bounds = boxCollider.GetBounds();
      return px >= bounds.left && px <= bounds.right &&
             py >= bounds.top && py <= bounds.bottom;
    }

    // 2. 检查 CircleCollider
    const circleCollider = entity.GetComponent('CircleCollider');
    if (circleCollider) {
      const center = circleCollider.GetCenter();
      const dx = px - center.x;
      const dy = py - center.y;
      return (dx * dx + dy * dy) <= (circleCollider.radius * circleCollider.radius);
    }

    // 3. 检查 SpriteRenderer / TextureRenderer
    const transform = entity.GetComponent('Transform');
    if (!transform) return false;

    const spriteRenderer = entity.GetComponent('SpriteRenderer');
    if (spriteRenderer && spriteRenderer.visible) {
      const wx = transform.worldX;
      const wy = transform.worldY;
      if (spriteRenderer.shape === 'rect') {
        const halfW = spriteRenderer.width / 2;
        const halfH = spriteRenderer.height / 2;
        return px >= wx - halfW && px <= wx + halfW &&
               py >= wy - halfH && py <= wy + halfH;
      } else if (spriteRenderer.shape === 'circle') {
        const dx = px - wx;
        const dy = py - wy;
        return (dx * dx + dy * dy) <= (spriteRenderer.radius * spriteRenderer.radius);
      }
    }

    const textureRenderer = entity.GetComponent('TextureRenderer');
    if (textureRenderer && textureRenderer.visible) {
      const wx = transform.worldX + textureRenderer.offsetX;
      const wy = transform.worldY + textureRenderer.offsetY;
      const halfW = textureRenderer.width / 2;
      const halfH = textureRenderer.height / 2;
      return px >= wx - halfW && px <= wx + halfW &&
             py >= wy - halfH && py <= wy + halfH;
    }

    return false;
  }

  OnDispose() {
    // 移除平台触摸事件监听
    if (typeof wx !== 'undefined') {
      wx.offTouchStart(this._onTouchStartBound);
      wx.offTouchMove(this._onTouchMoveBound);
      wx.offTouchEnd(this._onTouchEndBound);
    } else if (this.world && this.world.canvas) {
      const canvas = this.world.canvas;
      canvas.removeEventListener('touchstart', this._onTouchStartBound);
      canvas.removeEventListener('touchmove', this._onTouchMoveBound);
      canvas.removeEventListener('touchend', this._onTouchEndBound);
      if (this._onMouseDownBound) {
        canvas.removeEventListener('mousedown', this._onMouseDownBound);
        canvas.removeEventListener('mousemove', this._onMouseMoveBound);
        canvas.removeEventListener('mouseup', this._onMouseUpBound);
      }
    }
    this._touchQueue.length = 0;
  }
}

module.exports = InputSystem;
