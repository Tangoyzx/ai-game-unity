/**
 * DebugSystem - 调试系统（可选）
 * 
 * 绘制碰撞框、Entity ID/tag、FPS、活跃 Entity 数量。
 * 建议在 RenderSystem 之后注册，以叠加绘制调试信息。
 */
const System = require('../core/System');

class DebugSystem extends System {
  static ID = 'DebugSystem';
  static Query = ['Transform'];

  constructor(options) {
    super();
    const opts = options || {};
    /** @type {boolean} 是否绘制碰撞框 */
    this.showColliders = opts.showColliders !== undefined ? opts.showColliders : true;
    /** @type {boolean} 是否显示 Entity ID/tag */
    this.showLabels = opts.showLabels !== undefined ? opts.showLabels : true;
    /** @type {boolean} 是否显示 FPS */
    this.showFPS = opts.showFPS !== undefined ? opts.showFPS : true;
    /** @type {boolean} 是否显示活跃 Entity 数量 */
    this.showEntityCount = opts.showEntityCount !== undefined ? opts.showEntityCount : true;

    /** @type {number[]} 最近的帧 dt 值，用于计算平均 FPS */
    this._frameTimes = [];
    /** @type {number} FPS 采样数量 */
    this._maxFrameSamples = 60;
  }

  Update(dt) {
    const ctx = this.world.ctx;
    if (!ctx) return;

    // 更新 FPS 计算
    this._frameTimes.push(dt);
    if (this._frameTimes.length > this._maxFrameSamples) {
      this._frameTimes.shift();
    }

    // 绘制碰撞框
    if (this.showColliders) {
      this._drawColliders(ctx);
    }

    // 绘制 Entity 标签
    if (this.showLabels) {
      this._drawLabels(ctx);
    }

    // 绘制 HUD 信息
    this._drawHUD(ctx);
  }

  /**
   * 绘制所有碰撞框（红色线框）
   * @private
   */
  _drawColliders(ctx) {
    ctx.save();
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    for (let i = 0; i < this.entities.length; i++) {
      const entity = this.entities[i];

      const boxCollider = entity.GetComponent('BoxCollider');
      if (boxCollider) {
        const bounds = boxCollider.GetBounds();
        ctx.strokeRect(
          bounds.left, bounds.top,
          bounds.right - bounds.left,
          bounds.bottom - bounds.top
        );
      }

      const circleCollider = entity.GetComponent('CircleCollider');
      if (circleCollider) {
        const center = circleCollider.GetCenter();
        ctx.beginPath();
        ctx.arc(center.x, center.y, circleCollider.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.setLineDash([]);
    ctx.restore();
  }

  /**
   * 绘制 Entity 标签
   * @private
   */
  _drawLabels(ctx) {
    ctx.save();
    ctx.font = '10px monospace';
    ctx.fillStyle = '#00ff00';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';

    for (let i = 0; i < this.entities.length; i++) {
      const entity = this.entities[i];
      const transform = entity.GetComponent('Transform');
      if (!transform) continue;

      const label = `#${entity.id}${entity.tag ? ' ' + entity.tag : ''}`;
      ctx.fillText(label, transform.worldX + 2, transform.worldY - 2);
    }

    ctx.restore();
  }

  /**
   * 绘制 HUD 信息（FPS、Entity 数量）
   * @private
   */
  _drawHUD(ctx) {
    ctx.save();
    ctx.font = '12px monospace';
    ctx.fillStyle = '#00ff00';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let y = 4;

    if (this.showFPS) {
      const avgDt = this._frameTimes.reduce((a, b) => a + b, 0) / this._frameTimes.length;
      const fps = avgDt > 0 ? Math.round(1 / avgDt) : 0;
      ctx.fillText(`FPS: ${fps}`, 4, y);
      y += 16;
    }

    if (this.showEntityCount) {
      ctx.fillText(`Entities: ${this.entities.length}`, 4, y);
    }

    ctx.restore();
  }
}

module.exports = DebugSystem;
