/**
 * CharacterSystem - 角色系统
 * 
 * 注册在 RenderSystem 之后，其 Update 可在渲染完成后叠加绘制。
 * 
 * 核心职责：
 * 1. 刷新管理：初始生成 3 个随机角色到底部槽位，3 个全部放置后自动刷新
 * 2. 预览渲染：在底部刷新区绘制角色预览
 * 3. 拖拽中渲染：绘制跟随手指的角色方块（不吸附网格）
 * 4. 影子渲染：将角色投影到网格，吸附到最近格子，按占用状态标绿/红
 * 5. 放置校验：松手时检查所有单元格是否可用，决定放置或回退
 * 6. 放置/拾起：创建或销毁幻影砖块实体
 * 7. 碰撞路由：监听 collision 事件，通过 CharacterBrickComponent 定位角色后调用 onHit
 */
const System = require('../../../framework/core/System');
const SpriteRenderer = require('../../../framework/components/SpriteRenderer');
const BoxCollider = require('../../../framework/components/BoxCollider');
const TouchHandler = require('../../../framework/components/TouchHandler');
const { CharacterComponent, CharacterBrickComponent } = require('../components/CharacterComponent');
const { CHARACTER_TYPES, getRandomTypeId } = require('../utils/CharacterDefs');

const CELL_SIZE = 32;

class CharacterSystem extends System {
  static ID = 'CharacterSystem';
  static Query = null; // 事件驱动 + 手动管理

  constructor() {
    super();

    // ---- 布局常量（由 Init 方法设置） ----
    /** @type {number} 场地原点 X */
    this._originX = 0;
    /** @type {number} 场地原点 Y */
    this._originY = 0;
    /** @type {number} 场地列数 */
    this._gridCols = 10;
    /** @type {number} 场地行数 */
    this._gridRows = 15;
    /** @type {number} 场地宽度 */
    this._fieldWidth = 320;
    /** @type {number} 场地高度 */
    this._fieldHeight = 480;
    /** @type {number} 刷新区高度 */
    this._spawnAreaHeight = 80;

    // ---- 角色管理 ----
    /** @type {(import('../../../framework/core/Entity')|null)[]} 3 个刷新槽位对应的角色实体 */
    this._slots = [null, null, null];

    // ---- 拖拽状态 ----
    /** @type {import('../../../framework/core/Entity')|null} 当前拖拽中的角色实体 */
    this._draggingEntity = null;
    /** @type {{row: number, col: number}|null} 当前影子吸附的网格位置 */
    this._shadowGridPos = null;
    /** @type {boolean[]|null} 影子各 cell 是否可放置 */
    this._shadowCellValid = null;
  }

  /**
   * 初始化角色系统
   * 由外部调用，传入场地布局参数
   * 
   * @param {object} layout
   * @param {number} layout.originX
   * @param {number} layout.originY
   * @param {number} layout.gridCols
   * @param {number} layout.gridRows
   * @param {number} layout.fieldWidth
   * @param {number} layout.fieldHeight
   * @param {number} layout.spawnAreaHeight
   */
  Init(layout) {
    this._originX = layout.originX;
    this._originY = layout.originY;
    this._gridCols = layout.gridCols;
    this._gridRows = layout.gridRows;
    this._fieldWidth = layout.fieldWidth;
    this._fieldHeight = layout.fieldHeight;
    this._spawnAreaHeight = layout.spawnAreaHeight;
  }

  OnInit() {
    // 监听碰撞事件用于碰撞路由
    this._onCollision = this._onCollision.bind(this);
    this.On('collision', this._onCollision);
  }

  OnDispose() {
    this.Off('collision', this._onCollision);
  }

  // ============================================================
  //  刷新管理
  // ============================================================

  /**
   * 生成 3 个随机角色到刷新区槽位
   */
  SpawnCharacters() {
    for (let i = 0; i < 3; i++) {
      if (this._slots[i] === null) {
        this._spawnOneCharacter(i);
      }
    }
  }

  /**
   * 在指定槽位生成一个随机角色
   * @param {number} slotIndex
   * @private
   */
  _spawnOneCharacter(slotIndex) {
    const typeId = getRandomTypeId();
    const typeDef = CHARACTER_TYPES[typeId];
    if (!typeDef) return;

    // 确定 Component 类（基类或子类）
    const CompClass = typeDef.componentClass || CharacterComponent;

    // 创建角色实体
    const entity = this.world.CreateEntity();
    const transform = entity.GetComponent('Transform');

    // 计算槽位中心坐标
    const slotPos = this._getSlotCenter(slotIndex);
    transform.x = slotPos.x;
    transform.y = slotPos.y;

    // 添加 CharacterComponent
    const charComp = new CompClass({
      typeId: typeId,
      cells: typeDef.cells,
      color: typeDef.color,
      slotIndex: slotIndex
    });
    entity.AddComponent(charComp);

    // 添加不可见的 SpriteRenderer（用于 InputSystem 命中检测）
    // 注意：SpriteRenderer 构造函数中 color 使用 || 运算符，空字符串会回退为白色，
    // 因此需要构造后手动覆盖为空字符串，使 RenderSystem 的 if (sprite.color) 检查跳过渲染
    const hitSprite = new SpriteRenderer({
      shape: 'rect',
      width: charComp.bboxWidth,
      height: charComp.bboxHeight,
      visible: true     // 保持 visible 以参与命中检测
    });
    hitSprite.color = '';        // 构造后覆盖：不渲染填充
    hitSprite.borderColor = '';  // 构造后覆盖：不渲染边框
    entity.AddComponent(hitSprite);

    // 添加 TouchHandler（拖拽交互）
    entity.AddComponent(new TouchHandler({
      draggable: true,
      dragThreshold: 3,
      onDragStart: this._onCharacterDragStart.bind(this, entity),
      onDrag: this._onCharacterDrag.bind(this, entity),
      onDragEnd: this._onCharacterDragEnd.bind(this, entity)
    }));

    charComp.state = 'spawn';
    this._slots[slotIndex] = entity;
  }

  /**
   * 检查是否所有槽位都已放置（为空），若是则刷新
   * @private
   */
  _checkRefill() {
    for (let i = 0; i < 3; i++) {
      if (this._slots[i] !== null) return;
    }
    // 所有槽位都空了，刷新
    this.SpawnCharacters();
  }

  /**
   * 计算刷新区槽位中心坐标
   * @param {number} slotIndex 0/1/2
   * @returns {{x: number, y: number}}
   * @private
   */
  _getSlotCenter(slotIndex) {
    const slotWidth = this._fieldWidth / 3;
    return {
      x: this._originX + (slotIndex + 0.5) * slotWidth,
      y: this._originY + this._fieldHeight + this._spawnAreaHeight / 2
    };
  }

  // ============================================================
  //  拖拽处理
  // ============================================================

  /**
   * 拖拽开始回调
   * @param {import('../../../framework/core/Entity')} entity
   * @param {number} x
   * @param {number} y
   * @private
   */
  _onCharacterDragStart(entity, x, y) {
    const charComp = entity.GetComponent('CharacterComponent');
    if (!charComp) return;

    // 记录拖拽起始状态
    charComp._dragOrigin = charComp.state;

    if (charComp.state === 'placed') {
      // 从网格上拾起：销毁幻影砖块
      this._destroyPhantoms(charComp);
    }

    if (charComp.state === 'spawn') {
      // 从刷新区拖出：清空槽位
      this._slots[charComp.slotIndex] = null;
    }

    charComp.state = 'dragging';
    this._draggingEntity = entity;
  }

  /**
   * 拖拽中回调（InputSystem 已自动更新 Transform）
   * @param {import('../../../framework/core/Entity')} entity
   * @param {number} x
   * @param {number} y
   * @param {number} dx
   * @param {number} dy
   * @private
   */
  _onCharacterDrag(entity, x, y, dx, dy) {
    // 影子吸附计算在 Update 中执行（每帧绘制前计算）
  }

  /**
   * 拖拽结束回调
   * @param {import('../../../framework/core/Entity')} entity
   * @param {number} x
   * @param {number} y
   * @private
   */
  _onCharacterDragEnd(entity, x, y) {
    const charComp = entity.GetComponent('CharacterComponent');
    if (!charComp) return;

    // 计算当前影子位置是否可放置
    const gridPos = this._calcGridSnap(entity);
    const canPlace = gridPos && this._checkAllCellsFree(charComp, gridPos.row, gridPos.col);

    if (canPlace) {
      // 放置成功
      this._placeCharacter(entity, charComp, gridPos.row, gridPos.col);
    } else {
      // 放置失败：回退
      if (charComp._dragOrigin === 'placed' && charComp.prevGridPos) {
        // 从网格上拾起的：回到原网格位置
        this._placeCharacter(entity, charComp, charComp.prevGridPos.row, charComp.prevGridPos.col);
      } else {
        // 从刷新区拖出的：回到刷新区
        this._returnToSpawn(entity, charComp);
      }
    }

    this._draggingEntity = null;
    this._shadowGridPos = null;
    this._shadowCellValid = null;
  }

  /**
   * 放置角色到指定网格位置
   * @param {import('../../../framework/core/Entity')} entity
   * @param {CharacterComponent} charComp
   * @param {number} anchorRow - cell(0,0) 所在的网格行
   * @param {number} anchorCol - cell(0,0) 所在的网格列
   * @private
   */
  _placeCharacter(entity, charComp, anchorRow, anchorCol) {
    // 计算角色实体的目标位置（包围盒中心）
    const cell00CenterX = this._originX + anchorCol * CELL_SIZE + CELL_SIZE / 2;
    const cell00CenterY = this._originY + anchorRow * CELL_SIZE + CELL_SIZE / 2;
    // 包围盒中心 = cell(0,0)中心 - _anchorOffset
    const entityX = cell00CenterX - charComp._anchorOffsetX;
    const entityY = cell00CenterY - charComp._anchorOffsetY;

    const transform = entity.GetComponent('Transform');
    transform.x = entityX;
    transform.y = entityY;

    // 创建幻影砖块
    this._createPhantoms(entity, charComp, anchorRow, anchorCol);

    charComp.state = 'placed';
    charComp.prevGridPos = { row: anchorRow, col: anchorCol };
    charComp.slotIndex = -1;

    // 检查是否需要刷新
    this._checkRefill();
  }

  /**
   * 将角色退回到刷新区
   * @param {import('../../../framework/core/Entity')} entity
   * @param {CharacterComponent} charComp
   * @private
   */
  _returnToSpawn(entity, charComp) {
    const slotIndex = charComp.slotIndex >= 0 ? charComp.slotIndex : this._findEmptySlot();
    if (slotIndex < 0) {
      // 没有空槽位，强制放回第一个
      charComp.slotIndex = 0;
    } else {
      charComp.slotIndex = slotIndex;
    }

    const slotPos = this._getSlotCenter(charComp.slotIndex);
    const transform = entity.GetComponent('Transform');
    transform.x = slotPos.x;
    transform.y = slotPos.y;

    charComp.state = 'spawn';
    this._slots[charComp.slotIndex] = entity;
  }

  /**
   * 查找空闲的刷新槽位
   * @returns {number} 槽位索引，-1 表示无空闲
   * @private
   */
  _findEmptySlot() {
    for (let i = 0; i < 3; i++) {
      if (this._slots[i] === null) return i;
    }
    return -1;
  }

  // ============================================================
  //  幻影砖块管理
  // ============================================================

  /**
   * 创建幻影砖块
   * @param {import('../../../framework/core/Entity')} charEntity
   * @param {CharacterComponent} charComp
   * @param {number} anchorRow
   * @param {number} anchorCol
   * @private
   */
  _createPhantoms(charEntity, charComp, anchorRow, anchorCol) {
    charComp.phantomIds = [];

    for (let i = 0; i < charComp.cells.length; i++) {
      const cell = charComp.cells[i];
      const row = anchorRow + cell.r;
      const col = anchorCol + cell.c;

      // 砖块中心坐标
      const cx = this._originX + col * CELL_SIZE + CELL_SIZE / 2;
      const cy = this._originY + row * CELL_SIZE + CELL_SIZE / 2;

      const phantom = this.world.CreateEntity('character');
      const pt = phantom.GetComponent('Transform');
      pt.x = cx;
      pt.y = cy;

      phantom.AddComponent(new SpriteRenderer({
        shape: 'rect',
        width: CELL_SIZE,
        height: CELL_SIZE,
        color: charComp.color,
        borderColor: charComp.borderColor,
        borderWidth: 1
      }));

      phantom.AddComponent(new BoxCollider(CELL_SIZE, CELL_SIZE));

      phantom.AddComponent(new CharacterBrickComponent({
        characterEntityId: charEntity.id,
        typeId: charComp.typeId,
        cellIndex: i
      }));

      charComp.phantomIds.push(phantom.id);
    }
  }

  /**
   * 销毁所有幻影砖块
   * @param {CharacterComponent} charComp
   * @private
   */
  _destroyPhantoms(charComp) {
    for (let i = 0; i < charComp.phantomIds.length; i++) {
      const phantom = this.world.GetEntity(charComp.phantomIds[i]);
      if (phantom) {
        phantom.Destroy();
      }
    }
    charComp.phantomIds = [];
  }

  // ============================================================
  //  网格吸附与占用检测
  // ============================================================

  /**
   * 计算角色实体当前位置对应的网格吸附位置
   * @param {import('../../../framework/core/Entity')} entity
   * @returns {{row: number, col: number}|null} cell(0,0) 的网格 row/col，超出范围返回 null
   * @private
   */
  _calcGridSnap(entity) {
    const charComp = entity.GetComponent('CharacterComponent');
    if (!charComp) return null;

    const transform = entity.GetComponent('Transform');
    // 实体位置是包围盒中心，反推 cell(0,0) 中心的世界坐标
    const anchorX = transform.x + charComp._anchorOffsetX;
    const anchorY = transform.y + charComp._anchorOffsetY;

    // 吸附到最近网格
    const snapCol = Math.round((anchorX - this._originX - CELL_SIZE / 2) / CELL_SIZE);
    const snapRow = Math.round((anchorY - this._originY - CELL_SIZE / 2) / CELL_SIZE);

    // 检查所有 cell 是否在网格范围内
    for (let i = 0; i < charComp.cells.length; i++) {
      const r = snapRow + charComp.cells[i].r;
      const c = snapCol + charComp.cells[i].c;
      if (r < 0 || r >= this._gridRows || c < 0 || c >= this._gridCols) {
        return null;
      }
    }

    return { row: snapRow, col: snapCol };
  }

  /**
   * 检查角色所有 cell 在指定网格位置是否都空闲
   * @param {CharacterComponent} charComp
   * @param {number} anchorRow
   * @param {number} anchorCol
   * @returns {boolean}
   * @private
   */
  _checkAllCellsFree(charComp, anchorRow, anchorCol) {
    for (let i = 0; i < charComp.cells.length; i++) {
      const r = anchorRow + charComp.cells[i].r;
      const c = anchorCol + charComp.cells[i].c;
      if (this._isCellOccupied(r, c)) {
        return false;
      }
    }
    return true;
  }

  /**
   * 检查某个网格位置上的每个 cell 是否被占用
   * @param {CharacterComponent} charComp
   * @param {number} anchorRow
   * @param {number} anchorCol
   * @returns {boolean[]} 每个 cell 的占用状态（true=被占用）
   * @private
   */
  _checkCellsOccupied(charComp, anchorRow, anchorCol) {
    const result = [];
    for (let i = 0; i < charComp.cells.length; i++) {
      const r = anchorRow + charComp.cells[i].r;
      const c = anchorCol + charComp.cells[i].c;
      result.push(this._isCellOccupied(r, c));
    }
    return result;
  }

  /**
   * 检查单个网格位置是否被占用
   * 检查所有 BoxCollider 实体和 ball 实体
   * @param {number} row
   * @param {number} col
   * @returns {boolean}
   * @private
   */
  _isCellOccupied(row, col) {
    const cellCenterX = this._originX + col * CELL_SIZE + CELL_SIZE / 2;
    const cellCenterY = this._originY + row * CELL_SIZE + CELL_SIZE / 2;
    const tolerance = CELL_SIZE / 2 - 1; // 略小于半个格子，避免边缘误判

    // 检查所有有 BoxCollider 的实体（砖块、墙壁、其他角色的幻影砖块）
    const boxEntities = this.world.Query('BoxCollider');
    for (let i = 0; i < boxEntities.length; i++) {
      const entity = boxEntities[i];
      if (!entity.active) continue;
      const t = entity.GetComponent('Transform');
      if (Math.abs(t.worldX - cellCenterX) < tolerance &&
          Math.abs(t.worldY - cellCenterY) < tolerance) {
        return true;
      }
    }

    // 检查小球
    const balls = this.world.GetEntitiesByTag('ball');
    for (let i = 0; i < balls.length; i++) {
      const ball = balls[i];
      if (!ball.active) continue;
      const t = ball.GetComponent('Transform');
      if (Math.abs(t.worldX - cellCenterX) < tolerance &&
          Math.abs(t.worldY - cellCenterY) < tolerance) {
        return true;
      }
    }

    return false;
  }

  // ============================================================
  //  碰撞路由
  // ============================================================

  /**
   * 碰撞事件处理：路由到角色的 onHit
   * @param {string} eventId
   * @param {{ entityA: Entity, entityB: Entity, normal: { x: number, y: number } }} params
   * @private
   */
  _onCollision(eventId, params) {
    const { entityA, entityB, normal } = params;

    // 检查是否有 CharacterBrickComponent
    const cbCompB = entityB.GetComponent('CharacterBrickComponent');
    const cbCompA = entityA.GetComponent('CharacterBrickComponent');
    const cbComp = cbCompB || cbCompA;
    if (!cbComp) return;

    const charEntity = this.world.GetEntity(cbComp.characterEntityId);
    if (!charEntity) return;
    const charComp = charEntity.GetComponent('CharacterComponent');
    if (!charComp) return;

    const ball = cbComp === cbCompB ? entityA : entityB;
    // 直接调用虚方法，由子类多态决定行为
    charComp.onHit(ball, cbComp.entity, normal);
  }

  // ============================================================
  //  渲染（在 RenderSystem 之后叠加绘制）
  // ============================================================

  Update(dt) {
    const ctx = this.world.ctx;
    if (!ctx) return;

    // 1. 计算影子位置（如果有拖拽中的角色）
    if (this._draggingEntity) {
      const charComp = this._draggingEntity.GetComponent('CharacterComponent');
      if (charComp && charComp.state === 'dragging') {
        const gridPos = this._calcGridSnap(this._draggingEntity);
        this._shadowGridPos = gridPos;
        if (gridPos) {
          this._shadowCellValid = this._checkCellsOccupied(charComp, gridPos.row, gridPos.col);
        } else {
          this._shadowCellValid = null;
        }
      }
    }

    // 2. 绘制刷新区背景
    this._drawSpawnArea(ctx);

    // 3. 绘制刷新区中的角色预览
    for (let i = 0; i < 3; i++) {
      const entity = this._slots[i];
      if (!entity) continue;
      const charComp = entity.GetComponent('CharacterComponent');
      if (!charComp || charComp.state !== 'spawn') continue;
      const transform = entity.GetComponent('Transform');
      this._drawCells(ctx, charComp, transform.x, transform.y, 1);
    }

    // 4. 绘制拖拽中的角色（跟随手指）
    if (this._draggingEntity) {
      const charComp = this._draggingEntity.GetComponent('CharacterComponent');
      if (charComp && charComp.state === 'dragging') {
        const transform = this._draggingEntity.GetComponent('Transform');
        this._drawCells(ctx, charComp, transform.x, transform.y, 0.8);
      }
    }

    // 5. 绘制影子
    if (this._draggingEntity && this._shadowGridPos && this._shadowCellValid) {
      this._drawShadow(ctx);
    }
  }

  /**
   * 绘制刷新区背景
   * @param {CanvasRenderingContext2D} ctx
   * @private
   */
  _drawSpawnArea(ctx) {
    const x = this._originX;
    const y = this._originY + this._fieldHeight;
    ctx.save();
    ctx.fillStyle = 'rgba(40, 40, 40, 0.6)';
    ctx.fillRect(x, y, this._fieldWidth, this._spawnAreaHeight);
    ctx.restore();
  }

  /**
   * 绘制角色的所有 cell
   * @param {CanvasRenderingContext2D} ctx
   * @param {CharacterComponent} charComp
   * @param {number} centerX - 包围盒中心世界 X
   * @param {number} centerY - 包围盒中心世界 Y
   * @param {number} [alpha=1] - 透明度
   * @private
   */
  _drawCells(ctx, charComp, centerX, centerY, alpha) {
    ctx.save();
    if (alpha !== undefined && alpha < 1) {
      ctx.globalAlpha = alpha;
    }

    const halfCell = CELL_SIZE / 2;

    for (let i = 0; i < charComp._cellOffsets.length; i++) {
      const offset = charComp._cellOffsets[i];
      const cx = centerX + offset.x;
      const cy = centerY + offset.y;

      // 填充
      ctx.fillStyle = charComp.color;
      ctx.fillRect(cx - halfCell, cy - halfCell, CELL_SIZE, CELL_SIZE);

      // 边框
      if (charComp.borderColor) {
        ctx.strokeStyle = charComp.borderColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - halfCell, cy - halfCell, CELL_SIZE, CELL_SIZE);
      }
    }

    ctx.restore();
  }

  /**
   * 绘制影子（半透明绿/红）
   * @param {CanvasRenderingContext2D} ctx
   * @private
   */
  _drawShadow(ctx) {
    const charComp = this._draggingEntity.GetComponent('CharacterComponent');
    if (!charComp) return;

    const gridPos = this._shadowGridPos;
    const cellValid = this._shadowCellValid;
    const halfCell = CELL_SIZE / 2;

    ctx.save();
    for (let i = 0; i < charComp.cells.length; i++) {
      const cell = charComp.cells[i];
      const row = gridPos.row + cell.r;
      const col = gridPos.col + cell.c;
      const cx = this._originX + col * CELL_SIZE + CELL_SIZE / 2;
      const cy = this._originY + row * CELL_SIZE + CELL_SIZE / 2;

      // cellValid[i] = true 表示被占用（红色），false 表示空闲（绿色）
      if (cellValid[i]) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.35)';
      } else {
        ctx.fillStyle = 'rgba(0, 255, 0, 0.35)';
      }
      ctx.fillRect(cx - halfCell, cy - halfCell, CELL_SIZE, CELL_SIZE);
    }
    ctx.restore();
  }
}

module.exports = CharacterSystem;
