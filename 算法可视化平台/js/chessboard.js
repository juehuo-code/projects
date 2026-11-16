/**
 * 棋盘覆盖 — 引擎与渲染器
 */
var App = window.App || {};

/* ========== ChessboardEngine ========== */
App.ChessboardEngine = class ChessboardEngine {
  constructor() {
    this._steps = [];
    this._currentStep = 0;
    this._board = [];
    this._size = 0;
    this._tileId = 0;
  }

  initialize(params) {
    const k = Number(params.k);
    const sr = Number(params.special_r);
    const sc = Number(params.special_c);
    this._size = 1 << k;
    this._tileId = 0;
    this._board = Array.from({length: this._size}, () => new Array(this._size).fill(0));
    this._board[sr][sc] = -1; // -1 标记特殊格
    this._steps = [];
    this._currentStep = 0;

    let sid = 0;

    this._steps.push(new App.AlgorithmStep(
      sid++, StepType.INIT,
      `初始化：${this._size}×${this._size} 棋盘，特殊格位于 (${sr},${sc})`,
      { board: this._cloneBoard(), size: this._size, tileId: 0 },
      { board: this._cloneBoard(), size: this._size, specialCell: [sr, sc], highlight: [] },
      `棋盘覆盖问题：在一个 2ᵏ×2ᵏ 的棋盘上，恰好有一个特殊方格。要求用L型骨牌（每个覆盖3个方格）覆盖棋盘上除特殊方格外的所有方格。L型骨牌可以旋转，共有4种形态。使用递归分治策略解决。`,
      [0]
    ));

    this._cover(0, 0, sr, sc, this._size, sid);

    this._steps.push(new App.AlgorithmStep(
      this._steps.length, StepType.COMPLETE,
      `棋盘覆盖完成！共使用 ${this._tileId} 个L型骨牌`,
      { board: this._cloneBoard(), size: this._size, tileId: this._tileId },
      { board: this._cloneBoard(), size: this._size, specialCell: [sr, sc], highlight: [], completed: true },
      `棋盘覆盖完成！每个L型骨牌覆盖3个方格，总计用了 ${this._tileId} 个骨牌。总方格数为 ${this._size * this._size}，一个特殊格不需覆盖，所以骨牌覆盖了 ${this._size * this._size - 1} 个方格，正好需要 (${this._size * this._size} - 1) / 3 = ${Math.floor((this._size * this._size - 1) / 3)} 个L型骨牌。`,
      []
    ));

    return true;
  }

  _cover(tr, tc, sr, sc, size, sidBase) {
    if (size === 1) return;

    this._tileId++;
    const t = this._tileId;
    const s = size / 2;

    // 确定特殊格在哪个象限，在中心放置L型骨牌
    const midR = tr + s - 1;
    const midC = tc + s - 1;
    const quadrantH = [];

    this._steps.push(new App.AlgorithmStep(
      this._steps.length, StepType.SUB_BOARD,
      `处理 ${size}×${size} 子棋盘（左上角位于(${tr},${tc})），中心L型骨牌编号=${t}`,
      { board: this._cloneBoard(), size: this._size, tileId: this._tileId },
      { board: this._cloneBoard(), size: this._size, highlight: this._subBoardCells(tr, tc, size), centerL: { tr: midR, tc: midC, tileId: t } },
      `将当前 ${size}×${size} 棋盘分成4个 ${s}×${s} 的子棋盘。在中心位置放置一个L型骨牌（编号${t}），它的三个方格分别位于没有特殊格的那个象限的相邻位置。这样每个子棋盘都恰好有一个"特殊"方格。`,
      [1, 2, 3]
    ));

    // 判断特殊格在哪个象限
    // 左上象限: (sr < tr + s && sc < tc + s)
    if (sr < tr + s && sc < tc + s) {
      // 特殊格在左上，L型放在其他三个象限
      this._board[midR + 1][midC] = t;     // 左下
      this._board[midR][midC + 1] = t;     // 右上
      this._board[midR + 1][midC + 1] = t; // 右下
      quadrantH.push(
        { r: midR, c: midC, desc: '左上（含特殊格）' },
        { r: midR, c: midC + 1, desc: '右上' },
        { r: midR + 1, c: midC, desc: '左下' },
        { r: midR + 1, c: midC + 1, desc: '右下' }
      );
    } else if (sr < tr + s && sc >= tc + s) {
      // 特殊格在右上
      this._board[midR][midC] = t;
      this._board[midR + 1][midC] = t;
      this._board[midR + 1][midC + 1] = t;
    } else if (sr >= tr + s && sc < tc + s) {
      // 特殊格在左下
      this._board[midR][midC] = t;
      this._board[midR][midC + 1] = t;
      this._board[midR + 1][midC + 1] = t;
    } else {
      // 特殊格在右下
      this._board[midR][midC] = t;
      this._board[midR][midC + 1] = t;
      this._board[midR + 1][midC] = t;
    }

    this._steps.push(new App.AlgorithmStep(
      this._steps.length, StepType.COVER_PLACE,
      `在中心放置L型骨牌 #${t}，覆盖三个非特殊格象限的角格`,
      { board: this._cloneBoard(), size: this._size, tileId: this._tileId },
      { board: this._cloneBoard(), size: this._size, highlight: this._subBoardCells(tr, tc, size), centerL: { tr: midR, tc: midC, tileId: t }, placed: true },
      `L型骨牌#${t}被放置在棋盘中心。它由三个方格组成，形状像字母"L"，正好覆盖了不在特殊格所在象限的三个相邻方格。这样，剩下的四个子棋盘每个都恰好有一个"特殊方格"（原始的特殊格或新放置的骨牌格）。`,
      [4]
    ));

    // 递归处理四个子棋盘
    var inTL = sr < tr + s && sc < tc + s;
    var inTR = sr < tr + s && sc >= tc + s;
    var inBL = sr >= tr + s && sc < tc + s;
    var inBR = sr >= tr + s && sc >= tc + s;
    const subs = [
      { r: tr, c: tc,         sr: inTL ? sr : tr + s - 1, sc: inTL ? sc : tc + s - 1 },
      { r: tr, c: tc + s,     sr: inTR ? sr : tr + s - 1, sc: inTR ? sc : tc + s },
      { r: tr + s, c: tc,     sr: inBL ? sr : tr + s,     sc: inBL ? sc : tc + s - 1 },
      { r: tr + s, c: tc + s, sr: inBR ? sr : tr + s,     sc: inBR ? sc : tc + s }
    ];

    for (const sub of subs) {
      this._cover(sub.r, sub.c, sub.sr, sub.sc, s, sidBase);
    }
  }

  _subBoardCells(tr, tc, size) {
    const cells = [];
    for (let r = tr; r < tr + size; r++) {
      for (let c = tc; c < tc + size; c++) {
        cells.push([r, c]);
      }
    }
    return cells;
  }

  _cloneBoard() {
    return this._board.map(r => [...r]);
  }

  step() {
    if (this._currentStep < this._steps.length) {
      const s = this._steps[this._currentStep];
      this._currentStep++;
      return s;
    }
    return null;
  }

  step_back() {
    if (this._currentStep > 1) {
      this._currentStep--;
      const step = this._steps[this._currentStep - 1];
      if (step && step.stateSnapshot) {
        this._board = step.stateSnapshot.board.map(r => [...r]);
        this._tileId = step.stateSnapshot.tileId;
      }
      return step;
    }
    return null;
  }

  get_current_state() {
    if (this._steps.length === 0) return null;
    return this._steps[Math.min(this._currentStep, this._steps.length - 1)];
  }

  is_finished() {
    return this._currentStep >= this._steps.length;
  }

  reset() {
    this._currentStep = 0;
    this._tileId = 0;
    if (this._steps.length > 0) {
      const init = this._steps[0];
      if (init && init.stateSnapshot) {
        this._board = init.stateSnapshot.board.map(r => [...r]);
        this._size = init.stateSnapshot.size;
        this._tileId = init.stateSnapshot.tileId;
      }
    }
  }

  get_complexity() {
    return { time: 'O(4ᵏ) 即 O(n²)', space: 'O(k) 即 O(log n)' };
  }

  get_pseudocode() {
    return [
      { indent: 0, text: 'function cover(board, tr, tc, sr, sc, size):' },
      { indent: 1, text: 'if size == 1: return' },
      { indent: 1, text: 'tileId = tileId + 1' },
      { indent: 1, text: 's = size / 2' },
      { indent: 1, text: 'place L-tile at center covering 3 quadrants' },
      { indent: 1, text: 'cover(board, tr, tc, sr1, sc1, s)' },
      { indent: 1, text: 'cover(board, tr, tc+s, sr2, sc2, s)' },
      { indent: 1, text: 'cover(board, tr+s, tc, sr3, sc3, s)' },
      { indent: 1, text: 'cover(board, tr+s, tc+s, sr4, sc4, s)' }
    ];
  }

  get_test_cases() {
    return [
      new App.TestCase(501, 'chessboard', '标准2×2棋盘', { k: 1, special_r: 0, special_c: 0 }, '使用1个L型骨牌', '系统预设', '最小规模的棋盘覆盖'),
      new App.TestCase(502, 'chessboard', '4×4棋盘（角落特殊格）', { k: 2, special_r: 0, special_c: 0 }, '使用5个L型骨牌', '系统预设', '4×4棋盘，特殊格在左上角'),
      new App.TestCase(503, 'chessboard', '4×4棋盘（中间特殊格）', { k: 2, special_r: 2, special_c: 2 }, '使用5个L型骨牌', '系统预设', '4×4棋盘，特殊格在偏中位置'),
      new App.TestCase(504, 'chessboard', '8×8棋盘', { k: 3, special_r: 3, special_c: 5 }, '使用21个L型骨牌', '系统预设', '8×8棋盘，展示深层递归')
    ];
  }
};

/* ========== ChessboardRenderer ========== */
App.ChessboardRenderer = class ChessboardRenderer {
  constructor() {
    this._engine = null;
    this._colors = [
      '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899',
      '#14b8a6', '#f97316', '#6366f1', '#e11d48', '#84cc16', '#06b6d4',
      '#a855f7', '#d946ef', '#10b981', '#f43f5e', '#0ea5e9', '#eab308',
      '#8b5cf6', '#ec4899', '#22c55e', '#ef4444'
    ];
  }

  render(step, canvas) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const vd = step.visualData;
    if (!vd || !vd.board || vd.board.length === 0) return;

    const board = vd.board;
    const size = vd.size || board.length;
    const cellSize = Math.floor(Math.min(W, H - 20) / size);
    const offsetX = (W - cellSize * size) / 2;
    const offsetY = 10;

    // 高亮区域
    if (vd.highlight && vd.highlight.length > 0) {
      const highlightSet = new Set(vd.highlight.map(c => `${c[0]},${c[1]}`));
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (highlightSet.has(`${r},${c}`)) {
            ctx.fillStyle = 'rgba(99,102,241,0.12)';
            ctx.fillRect(offsetX + c * cellSize, offsetY + r * cellSize, cellSize, cellSize);
          }
        }
      }
    }

    // 绘制棋盘网格和内容
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const x = offsetX + c * cellSize;
        const y = offsetY + r * cellSize;
        const val = board[r][c];

        if (val === -1) {
          // 特殊格
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(x, y, cellSize, cellSize);
          ctx.fillStyle = '#fbbf24';
          ctx.font = `bold ${Math.max(10, cellSize * 0.5)}px "Microsoft YaHei",sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('★', x + cellSize / 2, y + cellSize / 2);
        } else if (val > 0) {
          // L型骨牌
          const colorIdx = (val - 1) % this._colors.length;
          ctx.fillStyle = this._colors[colorIdx];
          ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
          ctx.fillStyle = '#fff';
          ctx.font = `${Math.max(9, cellSize * 0.35)}px "Consolas",sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(val, x + cellSize / 2, y + cellSize / 2);
        } else {
          // 空格
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(x, y, cellSize, cellSize);
        }

        // 网格线
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, cellSize, cellSize);
      }
    }

    // 图例
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(W - 150, 10, 12, 12);
    ctx.fillStyle = '#d1d5db';
    ctx.font = '11px "Microsoft YaHei",sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('特殊格(★)', W - 134, 20);

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(W - 150, 28, 12, 12);
    ctx.fillText('L型骨牌(编号)', W - 134, 38);
  }

  renderTransition(from, to, canvas, progress) {
    this.render(to, canvas);
  }

  clear(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
};
