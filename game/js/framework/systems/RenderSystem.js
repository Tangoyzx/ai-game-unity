/**
 * RenderSystem - 统一渲染系统
 * 
 * 统一读取 Renderer 组件绘制画面。
 * 优先检查 TextureRenderer，没有则检查 SpriteRenderer。
 */
const System = require('../core/System');

class RenderSystem extends System {
  static ID = 'RenderSystem';
  static Query = ['Transform'];

  constructor() {
    super();
    /** @type {Map<string, any>} 图片缓存 (src -> image object) */
    this._imageCache = new Map();
  }

  Update(dt) {
    const ctx = this.world.ctx;
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, this.world.width, this.world.height);

    // 遍历所有有 Transform 的 Entity
    for (let i = 0; i < this.entities.length; i++) {
      const entity = this.entities[i];
      const transform = entity.GetComponent('Transform');

      // 优先绘制 TextureRenderer
      const textureRenderer = entity.GetComponent('TextureRenderer');
      if (textureRenderer && textureRenderer.visible) {
        this._renderTexture(ctx, transform, textureRenderer, dt);
        continue;
      }

      // 其次绘制 SpriteRenderer
      const spriteRenderer = entity.GetComponent('SpriteRenderer');
      if (spriteRenderer && spriteRenderer.visible) {
        this._renderSprite(ctx, transform, spriteRenderer);
      }
    }
  }

  /**
   * 绘制 SpriteRenderer（矩形/圆形）
   * @private
   */
  _renderSprite(ctx, transform, sprite) {
    const wx = transform.worldX;
    const wy = transform.worldY;

    ctx.save();
    ctx.translate(wx, wy);

    if (transform.rotation !== 0) {
      ctx.rotate(transform.rotation);
    }
    if (transform.scaleX !== 1 || transform.scaleY !== 1) {
      ctx.scale(transform.scaleX, transform.scaleY);
    }

    if (sprite.shape === 'rect') {
      const halfW = sprite.width / 2;
      const halfH = sprite.height / 2;

      if (sprite.color) {
        ctx.fillStyle = sprite.color;
        ctx.fillRect(-halfW, -halfH, sprite.width, sprite.height);
      }
      if (sprite.borderColor) {
        ctx.strokeStyle = sprite.borderColor;
        ctx.lineWidth = sprite.borderWidth;
        ctx.strokeRect(-halfW, -halfH, sprite.width, sprite.height);
      }
    } else if (sprite.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, sprite.radius, 0, Math.PI * 2);

      if (sprite.color) {
        ctx.fillStyle = sprite.color;
        ctx.fill();
      }
      if (sprite.borderColor) {
        ctx.strokeStyle = sprite.borderColor;
        ctx.lineWidth = sprite.borderWidth;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  /**
   * 绘制 TextureRenderer（贴图）
   * @private
   */
  _renderTexture(ctx, transform, texture, dt) {
    // 确保图片已加载
    if (!texture._loaded) {
      this._loadImage(texture);
      return;
    }

    if (!texture._image) return;

    // 帧动画更新
    if (texture.frameRate > 0 && texture.frameCount > 1) {
      texture._frameTimer += dt;
      const frameInterval = 1 / texture.frameRate;
      if (texture._frameTimer >= frameInterval) {
        texture._frameTimer -= frameInterval;
        texture.frameIndex = (texture.frameIndex + 1) % texture.frameCount;
      }
    }

    const wx = transform.worldX + texture.offsetX;
    const wy = transform.worldY + texture.offsetY;

    ctx.save();
    ctx.translate(wx, wy);

    if (transform.rotation !== 0) {
      ctx.rotate(transform.rotation);
    }

    const sx = (texture.flipX ? -1 : 1) * transform.scaleX;
    const sy = (texture.flipY ? -1 : 1) * transform.scaleY;
    if (sx !== 1 || sy !== 1) {
      ctx.scale(sx, sy);
    }

    const halfW = texture.width / 2;
    const halfH = texture.height / 2;

    if (texture.frameWidth > 0 && texture.frameHeight > 0) {
      // Spritesheet 模式
      const cols = Math.floor(texture._image.width / texture.frameWidth);
      const frameCol = texture.frameIndex % cols;
      const frameRow = Math.floor(texture.frameIndex / cols);
      ctx.drawImage(
        texture._image,
        frameCol * texture.frameWidth,
        frameRow * texture.frameHeight,
        texture.frameWidth,
        texture.frameHeight,
        -halfW, -halfH,
        texture.width, texture.height
      );
    } else {
      // 整张图模式
      ctx.drawImage(texture._image, -halfW, -halfH, texture.width, texture.height);
    }

    ctx.restore();
  }

  /**
   * 加载图片
   * @private
   */
  _loadImage(texture) {
    if (!texture.src) return;

    // 检查缓存
    if (this._imageCache.has(texture.src)) {
      texture._image = this._imageCache.get(texture.src);
      texture._loaded = true;
      return;
    }

    // 创建图片对象
    let img;
    if (typeof wx !== 'undefined') {
      img = wx.createImage();
    } else {
      img = new Image();
    }

    img.onload = () => {
      texture._image = img;
      texture._loaded = true;
      this._imageCache.set(texture.src, img);
    };

    img.onerror = () => {
      console.warn(`[RenderSystem] 图片加载失败: ${texture.src}`);
      texture._loaded = true; // 标记已尝试加载，避免重复请求
    };

    img.src = texture.src;
    // 标记正在加载中，防止重复触发
    texture._loaded = true;
    texture._image = null;
  }

  OnDispose() {
    this._imageCache.clear();
  }
}

module.exports = RenderSystem;
