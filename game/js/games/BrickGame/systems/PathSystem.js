/**
 * PathSystem - 路径管理系统
 * 
 * 负责：
 * 1. 定义三条道路路径（内圈/中圈/外圈）
 * 2. 计算路径总长度
 * 3. 提供路径插值方法供怪物移动使用
 * 4. 渲染道路背景
 * 
 * 路径走向：沿打砖块场地外边缘，从右上方 → 左上方 → 左下方 → 右下方
 * 三条路径按离场地中心的距离分为内圈/中圈/外圈
 */
const System = require('../../../framework/core/System');

class PathSystem extends System {
  static ID = 'PathSystem';
  static Query = null;

  constructor() {
    super();
    
    /** @type {Object} 场地布局参数 */
    this._layout = null;
    
    /** @type {Object<string, Array<{x: number, y: number}>>} 三条路径的路径点 */
    this._pathPoints = null;
    
    /** @type {Object<string, number>} 三条路径的总长度 */
    this._totalLengths = null;
    
    /** @type {Object<string, Array<number>>} 三条路径的累计段长度 */
    this._segmentLengthsMap = null;
    
    /** @type {boolean} 是否已初始化 */
    this._inited = false;
  }

  /**
   * 初始化路径系统
   * @param {object} layout
   * @param {number} layout.originX - 场地原点 X（左上角）
   * @param {number} layout.originY - 场地原点 Y（左上角）
   * @param {number} layout.fieldWidth - 场地宽度
   * @param {number} layout.fieldHeight - 场地高度
   * @param {number} layout.cellSize - 网格单元大小
   */
  Init(layout) {
    this._layout = layout;
    this._calculateAllPaths(layout);
    this._inited = true;
    
    console.log('[PathSystem] Initialized, path lengths:', JSON.stringify(this._totalLengths));
  }

  /**
   * 计算三条路径
   * 
   * 路径沿场地外边缘走：右上角 → 左上角 → 左下角 → 右下角
   * 上、左、下三个方向在场地外侧；右侧贴场地右边缘（不超出安全区域）
   * 内圈最靠近场地，外圈离场地最远
   * 
   * @param {object} layout
   * @private
   */
  _calculateAllPaths(layout) {
    const { originX, originY, fieldWidth, fieldHeight, cellSize } = layout;
    
    // 场地边界
    const fieldLeft = originX;
    const fieldRight = originX + fieldWidth;
    const fieldTop = originY;
    const fieldBottom = originY + fieldHeight;
    
    // 三条路径在场地外侧分布（向外偏移），额外再往外 5px
    // 内圈最靠近场地边缘，外圈离场地最远
    const extra = 5; // 额外向外偏移
    const offsets = [
      cellSize * 0.25 + extra,   // 内圈 - 最靠近场地
      cellSize * 0.5  + extra,   // 中圈 - 居中
      cellSize * 0.75 + extra    // 外圈 - 最远离场地
    ];
    
    const pathNames = ['inner', 'middle', 'outer'];
    this._pathPoints = {};
    this._totalLengths = {};
    this._segmentLengthsMap = {};
    
    for (let i = 0; i < 3; i++) {
      const d = offsets[i]; // 到场地边缘的距离（向外偏移）
      const name = pathNames[i];
      
      // 路径关键点：右上 → 左上 → 左下 → 右下
      // 上、左、下向场地外侧偏移；右侧贴场地右边缘（向内偏移，避免超出安全区域）
      const points = [
        { x: fieldRight - d, y: fieldTop - d },      // 右上角（起点）—— 右侧向内，上方向外
        { x: fieldLeft - d,  y: fieldTop - d },      // 左上角 —— 左侧向外，上方向外
        { x: fieldLeft - d,  y: fieldBottom + d },    // 左下角 —— 左侧向外，下方向外
        { x: fieldRight - d, y: fieldBottom + d }     // 右下角（终点）—— 右侧向内，下方向外
      ];
      
      this._pathPoints[name] = points;
      
      // 计算每段的累计长度
      let totalLen = 0;
      const segLens = [0];
      for (let j = 1; j < points.length; j++) {
        const dx = points[j].x - points[j - 1].x;
        const dy = points[j].y - points[j - 1].y;
        totalLen += Math.sqrt(dx * dx + dy * dy);
        segLens.push(totalLen);
      }
      
      this._totalLengths[name] = totalLen;
      this._segmentLengthsMap[name] = segLens;
    }
  }

  /**
   * 根据行走距离和路径圈层计算世界坐标
   * @param {number} progress - 已行走距离
   * @param {number} [pathOffset=0] - 路径圈层 (0=内圈/1=中圈/2=外圈)
   * @returns {{x: number, y: number}|null} 世界坐标，超出范围返回终点
   */
  GetPositionAtProgress(progress, pathOffset = 0) {
    if (!this._inited) return null;
    
    const pathNames = ['inner', 'middle', 'outer'];
    const name = pathNames[Math.min(pathOffset, 2)];
    const points = this._pathPoints[name];
    const segLens = this._segmentLengthsMap[name];
    const totalLen = this._totalLengths[name];
    
    // 限制 progress 范围
    if (progress <= 0) {
      return { x: points[0].x, y: points[0].y };
    }
    if (progress >= totalLen) {
      return { x: points[points.length - 1].x, y: points[points.length - 1].y };
    }
    
    // 找到当前进度所在的线段
    let segIdx = 0;
    for (let i = 1; i < segLens.length; i++) {
      if (progress <= segLens[i]) {
        segIdx = i - 1;
        break;
      }
    }
    
    // 计算在当前线段内的插值比例
    const segStart = segLens[segIdx];
    const segEnd = segLens[segIdx + 1];
    const t = (progress - segStart) / (segEnd - segStart);
    
    const p1 = points[segIdx];
    const p2 = points[segIdx + 1];
    
    return {
      x: p1.x + (p2.x - p1.x) * t,
      y: p1.y + (p2.y - p1.y) * t
    };
  }

  /**
   * 获取指定圈层的路径总长度
   * @param {number} [pathOffset=0]
   * @returns {number}
   */
  GetTotalLength(pathOffset = 0) {
    if (!this._inited) return 0;
    const pathNames = ['inner', 'middle', 'outer'];
    const name = pathNames[Math.min(pathOffset, 2)];
    return this._totalLengths[name] || 0;
  }

  /**
   * 获取路径终点位置（基地位置）
   * 使用中圈路径的终点
   * @returns {{x: number, y: number}}
   */
  GetEndPosition() {
    if (!this._inited) return { x: 0, y: 0 };
    const pts = this._pathPoints.middle;
    return { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y };
  }

  /**
   * 获取路径起点位置（怪物出生点）
   * @param {number} [pathOffset=0]
   * @returns {{x: number, y: number}}
   */
  GetStartPosition(pathOffset = 0) {
    if (!this._inited) return { x: 0, y: 0 };
    const pathNames = ['inner', 'middle', 'outer'];
    const name = pathNames[Math.min(pathOffset, 2)];
    const pts = this._pathPoints[name];
    return { x: pts[0].x, y: pts[0].y };
  }

  Update(dt) {
    if (!this._inited) return;
    
    const ctx = this.world.ctx;
    if (!ctx) return;
    
    this._renderPath(ctx);
  }

  /**
   * 渲染道路背景
   * @param {CanvasRenderingContext2D} ctx
   * @private
   */
  _renderPath(ctx) {
    if (!this._pathPoints) return;
    
    ctx.save();
    
    // 先绘制一条宽的道路底色（把三条路径区域连成一整条路）
    // 用外圈和内圈之间的区域作为道路整体
    const outerPts = this._pathPoints.outer;
    const innerPts = this._pathPoints.inner;
    
    // 绘制道路底色：用外圈路径围成的区域填充
    ctx.fillStyle = 'rgba(160, 140, 100, 0.35)';
    ctx.beginPath();
    // 外圈正向
    ctx.moveTo(outerPts[0].x, outerPts[0].y);
    for (let j = 1; j < outerPts.length; j++) {
      ctx.lineTo(outerPts[j].x, outerPts[j].y);
    }
    // 内圈反向闭合
    for (let j = innerPts.length - 1; j >= 0; j--) {
      ctx.lineTo(innerPts[j].x, innerPts[j].y);
    }
    ctx.closePath();
    ctx.fill();
    
    // 绘制道路边缘线（外圈外边和内圈内边）
    ctx.strokeStyle = 'rgba(200, 180, 120, 0.6)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // 外圈边线
    ctx.beginPath();
    ctx.moveTo(outerPts[0].x, outerPts[0].y);
    for (let j = 1; j < outerPts.length; j++) {
      ctx.lineTo(outerPts[j].x, outerPts[j].y);
    }
    ctx.stroke();
    
    // 内圈边线
    ctx.beginPath();
    ctx.moveTo(innerPts[0].x, innerPts[0].y);
    for (let j = 1; j < innerPts.length; j++) {
      ctx.lineTo(innerPts[j].x, innerPts[j].y);
    }
    ctx.stroke();
    
    // 中圈虚线（路径中心线参考）
    const midPts = this._pathPoints.middle;
    ctx.strokeStyle = 'rgba(255, 255, 200, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(midPts[0].x, midPts[0].y);
    for (let j = 1; j < midPts.length; j++) {
      ctx.lineTo(midPts[j].x, midPts[j].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    
    // 绘制起点标记（右上角，绿色）
    const startPt = midPts[0];
    ctx.fillStyle = 'rgba(0, 220, 50, 0.8)';
    ctx.beginPath();
    ctx.arc(startPt.x, startPt.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // 绘制终点标记（右下角，红色）
    const endPt = midPts[midPts.length - 1];
    ctx.fillStyle = 'rgba(220, 30, 30, 0.8)';
    ctx.beginPath();
    ctx.arc(endPt.x, endPt.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    ctx.restore();
  }
}

module.exports = PathSystem;
