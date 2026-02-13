/**
 * CharacterComponent - 角色主组件（基类）
 * CharacterBrickComponent - 幻影砖块反向引用组件
 * 
 * CharacterComponent 挂在角色实体上，管理角色全生命周期。
 * 子类可重写 onHit() 实现不同碰撞行为。
 * 
 * CharacterBrickComponent 挂在每个幻影砖块上，
 * 存储反向引用以便碰撞时定位所属角色。
 */
const Component = require('../../../framework/core/Component');

const CELL_SIZE = 32;

// ============================================================
//  CharacterComponent（基类）
// ============================================================

class CharacterComponent extends Component {
  static ID = 'CharacterComponent';

  /**
   * @param {object} options
   * @param {string} options.typeId - 类型 ID（对应 CharacterDefs 中的 key）
   * @param {Array<{r:number, c:number}>} options.cells - 单元偏移数组
   * @param {string} [options.color='#ffffff'] - 填充色
   * @param {string} [options.borderColor='#333333'] - 边框色
   * @param {number} [options.slotIndex=-1] - 刷新区槽位索引
   */
  constructor(options) {
    super();
    const opts = options || {};

    // ---- 状态属性 ----
    /** @type {string} 角色类型 ID */
    this.typeId = opts.typeId || '';
    /** @type {'spawn'|'dragging'|'placed'} 当前状态 */
    this.state = 'spawn';
    /** @type {number} 刷新区槽位索引（0/1/2），-1 表示无槽位 */
    this.slotIndex = opts.slotIndex !== undefined ? opts.slotIndex : -1;
    /** @type {number[]} 幻影砖块 Entity ID 列表（仅 placed 状态有值） */
    this.phantomIds = [];
    /** @type {{row: number, col: number}|null} 上次放置的网格位置（cell(0,0) 的 row/col） */
    this.prevGridPos = null;
    /** @type {'spawn'|'placed'} 拖拽开始前的状态，用于放置失败时回退 */
    this._dragOrigin = 'spawn';

    // ---- 视觉属性 ----
    /** @type {Array<{r:number, c:number}>} 单元偏移数组 */
    this.cells = opts.cells || [{ r: 0, c: 0 }];
    /** @type {string} 填充色 */
    this.color = opts.color || '#ffffff';
    /** @type {string} 边框色 */
    this.borderColor = opts.borderColor !== undefined ? opts.borderColor : '#333333';

    // ---- 布局属性（自动计算） ----
    this._computeLayout();
  }

  /**
   * 根据 cells 数组计算布局属性
   * @private
   */
  _computeLayout() {
    let maxRow = 0;
    let maxCol = 0;
    for (let i = 0; i < this.cells.length; i++) {
      if (this.cells[i].r > maxRow) maxRow = this.cells[i].r;
      if (this.cells[i].c > maxCol) maxCol = this.cells[i].c;
    }

    /** @type {number} 包围盒宽（像素） */
    this.bboxWidth = (maxCol + 1) * CELL_SIZE;
    /** @type {number} 包围盒高（像素） */
    this.bboxHeight = (maxRow + 1) * CELL_SIZE;

    /**
     * 从包围盒中心到 cell(0,0) 中心的偏移
     * 包围盒中心 = cell(0,0)左上角 + (bboxWidth/2, bboxHeight/2)
     * cell(0,0)中心 = cell(0,0)左上角 + (16, 16)
     * 偏移 = cell(0,0)中心 - 包围盒中心 = (16 - bboxWidth/2, 16 - bboxHeight/2)
     * @type {number}
     */
    this._anchorOffsetX = CELL_SIZE / 2 - this.bboxWidth / 2;
    this._anchorOffsetY = CELL_SIZE / 2 - this.bboxHeight / 2;

    /**
     * 每个 cell 相对于包围盒中心的像素偏移
     * @type {Array<{x: number, y: number}>}
     */
    this._cellOffsets = [];
    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i];
      // cell 中心在包围盒坐标系中的位置
      const cellCenterX = cell.c * CELL_SIZE + CELL_SIZE / 2;
      const cellCenterY = cell.r * CELL_SIZE + CELL_SIZE / 2;
      // 相对包围盒中心的偏移
      this._cellOffsets.push({
        x: cellCenterX - this.bboxWidth / 2,
        y: cellCenterY - this.bboxHeight / 2
      });
    }
  }

  /**
   * 碰撞回调虚方法
   * 当小球碰撞角色的幻影砖块时由 CharacterSystem 调用。
   * 基类默认空实现（不可破坏，无效果）。
   * 子类可重写此方法实现不同碰撞行为。
   * 
   * @param {import('../../../framework/core/Entity')} ball - 碰撞的小球实体
   * @param {import('../../../framework/core/Entity')} hitBrick - 被碰撞的幻影砖块实体
   * @param {{x: number, y: number}} normal - 碰撞法线
   */
  onHit(ball, hitBrick, normal) {
    // 基类默认：不做任何事（不可破坏）
  }
}

// ============================================================
//  CharacterBrickComponent（幻影砖块反向引用）
// ============================================================

class CharacterBrickComponent extends Component {
  static ID = 'CharacterBrickComponent';

  /**
   * @param {object} options
   * @param {number} options.characterEntityId - 所属角色实体 ID
   * @param {string} options.typeId - 角色类型 ID
   * @param {number} options.cellIndex - 在角色 cells 数组中的索引
   */
  constructor(options) {
    super();
    const opts = options || {};
    /** @type {number} 所属角色实体 ID */
    this.characterEntityId = opts.characterEntityId || 0;
    /** @type {string} 角色类型 ID */
    this.typeId = opts.typeId || '';
    /** @type {number} 在角色 cells 中的索引 */
    this.cellIndex = opts.cellIndex !== undefined ? opts.cellIndex : 0;
  }
}

module.exports = {
  CharacterComponent,
  CharacterBrickComponent
};
