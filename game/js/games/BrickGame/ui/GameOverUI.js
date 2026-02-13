/**
 * GameOverUI - 游戏结束界面渲染模块
 * 
 * 提供游戏结束时的 UI 渲染和交互检测。
 */

/**
 * 游戏结束界面配置
 */
const UI_CONFIG = {
  // 遮罩
  overlayColor: 'rgba(0, 0, 0, 0.7)',
  
  // 标题
  titleText: '游戏结束',
  titleColor: '#ffffff',
  titleFontSize: 48,
  titleY: 200,
  
  // 统计信息
  statsColor: '#ffcc00',
  statsFontSize: 32,
  statsY: 280,
  
  // 按钮
  buttonText: '重新再来',
  buttonWidth: 200,
  buttonHeight: 60,
  buttonY: 380,
  buttonBgColor: '#4CAF50',
  buttonBgHoverColor: '#45a049',
  buttonTextColor: '#ffffff',
  buttonFontSize: 28,
  buttonBorderRadius: 8
};

/**
 * 按钮状态
 */
let isButtonHovered = false;
let buttonBounds = null;

/**
 * 渲染游戏结束界面
 * @param {CanvasRenderingContext2D} ctx - Canvas 上下文
 * @param {number} killCount - 击杀数量
 * @param {number} screenWidth - 屏幕宽度
 * @param {number} screenHeight - 屏幕高度
 */
function render(ctx, killCount, screenWidth, screenHeight) {
  ctx.save();
  
  // 1. 绘制半透明遮罩
  ctx.fillStyle = UI_CONFIG.overlayColor;
  ctx.fillRect(0, 0, screenWidth, screenHeight);
  
  const centerX = screenWidth / 2;
  
  // 2. 绘制标题
  ctx.fillStyle = UI_CONFIG.titleColor;
  ctx.font = `bold ${UI_CONFIG.titleFontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(UI_CONFIG.titleText, centerX, UI_CONFIG.titleY);
  
  // 3. 绘制统计信息
  ctx.fillStyle = UI_CONFIG.statsColor;
  ctx.font = `${UI_CONFIG.statsFontSize}px sans-serif`;
  ctx.fillText(`消灭怪物: ${killCount} 个`, centerX, UI_CONFIG.statsY);
  
  // 4. 绘制按钮
  const buttonX = centerX - UI_CONFIG.buttonWidth / 2;
  const buttonY = UI_CONFIG.buttonY - UI_CONFIG.buttonHeight / 2;
  
  // 保存按钮边界用于点击检测
  buttonBounds = {
    left: buttonX,
    top: buttonY,
    right: buttonX + UI_CONFIG.buttonWidth,
    bottom: buttonY + UI_CONFIG.buttonHeight
  };
  
  // 按钮背景（带圆角）
  ctx.fillStyle = isButtonHovered ? UI_CONFIG.buttonBgHoverColor : UI_CONFIG.buttonBgColor;
  _roundRect(ctx, buttonX, buttonY, UI_CONFIG.buttonWidth, UI_CONFIG.buttonHeight, UI_CONFIG.buttonBorderRadius);
  ctx.fill();
  
  // 按钮文本
  ctx.fillStyle = UI_CONFIG.buttonTextColor;
  ctx.font = `bold ${UI_CONFIG.buttonFontSize}px sans-serif`;
  ctx.fillText(UI_CONFIG.buttonText, centerX, UI_CONFIG.buttonY);
  
  ctx.restore();
}

/**
 * 检测点击是否在重启按钮上
 * @param {number} x - 点击 X 坐标
 * @param {number} y - 点击 Y 坐标
 * @returns {boolean}
 */
function isRestartButtonClicked(x, y) {
  if (!buttonBounds) return false;
  
  return x >= buttonBounds.left &&
         x <= buttonBounds.right &&
         y >= buttonBounds.top &&
         y <= buttonBounds.bottom;
}

/**
 * 更新按钮悬停状态
 * @param {number} x - 鼠标/触摸 X 坐标
 * @param {number} y - 鼠标/触摸 Y 坐标
 */
function updateButtonHover(x, y) {
  if (!buttonBounds) {
    isButtonHovered = false;
    return;
  }
  
  isButtonHovered = x >= buttonBounds.left &&
                    x <= buttonBounds.right &&
                    y >= buttonBounds.top &&
                    y <= buttonBounds.bottom;
}

/**
 * 重置 UI 状态
 */
function reset() {
  isButtonHovered = false;
  buttonBounds = null;
}

/**
 * 绘制圆角矩形路径
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {number} radius
 * @private
 */
function _roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

module.exports = {
  render,
  isRestartButtonClicked,
  updateButtonHover,
  reset
};
