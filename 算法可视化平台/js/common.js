/**
 * 算法过程可视化系统 — 公共基础设施
 * 定义通用数据对象、步骤记录器、执行状态机等
 */
var App = window.App || {};

/* ========== 枚举与常量 ========== */
const ExecutorState = Object.freeze({ IDLE: 'IDLE', RUNNING: 'RUNNING', PAUSED: 'PAUSED', FINISHED: 'FINISHED' });
const StepType = Object.freeze({
  INIT: 'INIT',
  // 快速排序
  SELECT_PIVOT: 'SELECT_PIVOT', COMPARE: 'COMPARE', SWAP: 'SWAP',
  PIVOT_PLACED: 'PIVOT_PLACED', PARTITION_DONE: 'PARTITION_DONE',
  // 汉诺塔
  RECURSE_ENTER: 'RECURSE_ENTER', MOVE_DISK: 'MOVE_DISK', RECURSE_RETURN: 'RECURSE_RETURN',
  // 哈夫曼树
  SELECT_MIN_TWO: 'SELECT_MIN_TWO', MERGE_NODE: 'MERGE_NODE',
  // Dijkstra
  SELECT_VERTEX: 'SELECT_VERTEX', MARK_VISITED: 'MARK_VISITED',
  RELAX_CHECK: 'RELAX_CHECK', RELAX_UPDATE: 'RELAX_UPDATE',
  // 冒泡排序
  BUBBLE_COMPARE: 'BUBBLE_COMPARE', BUBBLE_SWAP: 'BUBBLE_SWAP', BUBBLE_PASS_DONE: 'BUBBLE_PASS_DONE',
  // 归并排序
  DIVIDE: 'DIVIDE', MERGE_STEP: 'MERGE_STEP', SUBARRAY_MERGE: 'SUBARRAY_MERGE',
  // Prim
  SELECT_MIN_EDGE: 'SELECT_MIN_EDGE', CANDIDATE_CHECK: 'CANDIDATE_CHECK',
  // Kruskal
  EDGE_ACCEPTED: 'EDGE_ACCEPTED', EDGE_REJECTED: 'EDGE_REJECTED', UNION_CHECK: 'UNION_CHECK',
  // 棋盘覆盖
  COVER_PLACE: 'COVER_PLACE', SUB_BOARD: 'SUB_BOARD',
  // 迷宫求解
  BACKTRACK: 'BACKTRACK', DEAD_END: 'DEAD_END', PATH_FOUND: 'PATH_FOUND', EXPLORE: 'EXPLORE',
  // 图通用
  EDGE_SELECTED: 'EDGE_SELECTED',
  // 通用
  COMPLETE: 'COMPLETE'
});

/* ========== 数据对象 ========== */
// AlgorithmStep — 算法步骤对象
App.AlgorithmStep = class AlgorithmStep {
  constructor(stepId, stepType, description, stateSnapshot, visualData = {}, explanation = '', activeLines = []) {
    this.stepId = stepId;
    this.stepType = stepType;
    this.description = description;
    this.stateSnapshot = stateSnapshot;
    this.visualData = visualData;
    this.explanation = explanation || '';
    this.activeLines = activeLines;
    this.timestamp = Date.now();
  }
};

// AlgorithmMeta — 算法元信息
App.AlgorithmMeta = class AlgorithmMeta {
  constructor(id, name, category, difficulty, timeComplexity, spaceComplexity, paramDefs) {
    this.algoId = id;
    this.algoName = name;
    this.category = category;
    this.difficulty = difficulty;
    this.timeComplexity = timeComplexity;
    this.spaceComplexity = spaceComplexity;
    this.paramDefs = paramDefs;
  }
};

// ParamDef — 参数定义
App.ParamDef = class ParamDef {
  constructor(name, type, min, max, defaultVal, required, description) {
    this.paramName = name;
    this.paramType = type;
    this.minValue = min;
    this.maxValue = max;
    this.defaultValue = defaultVal;
    this.isRequired = required;
    this.description = description;
  }
};

// TestCase — 测试用例
App.TestCase = class TestCase {
  constructor(id, algoId, name, params, expectedResult, caseType, description) {
    this.caseId = id;
    this.algoId = algoId;
    this.caseName = name;
    this.params = params;
    this.expectedResult = expectedResult;
    this.caseType = caseType;
    this.description = description;
  }
};

/* ========== StepRecorder — 步骤记录器 ========== */
App.StepRecorder = class StepRecorder {
  constructor() {
    this.steps = [];
    this.currentIndex = -1;
    this.snapshots = [];
  }

  record(step) {
    this.steps = this.steps.slice(0, this.currentIndex + 1);
    this.snapshots = this.snapshots.slice(0, this.currentIndex + 1);
    this.steps.push(step);
    this.snapshots.push(JSON.parse(JSON.stringify(step.stateSnapshot)));
    this.currentIndex = this.steps.length - 1;
  }

  getCurrent() {
    if (this.currentIndex >= 0 && this.currentIndex < this.steps.length) {
      return this.steps[this.currentIndex];
    }
    return null;
  }

  getCurrentIndex() { return this.currentIndex; }

  getTotalSteps() { return this.steps.length; }

  getAllSteps() { return this.steps.slice(0, this.currentIndex + 1); }

  canGoBack() { return this.currentIndex > 0; }

  canGoForward() { return this.currentIndex < this.steps.length - 1; }

  goBack() {
    if (this.canGoBack()) {
      this.currentIndex--;
      return this.steps[this.currentIndex];
    }
    return null;
  }

  clear() {
    this.steps = [];
    this.currentIndex = -1;
    this.snapshots = [];
  }
};

/* ========== StepExecutor — 步骤执行器（状态机） ========== */
App.StepExecutor = class StepExecutor {
  constructor() {
    this.state = ExecutorState.IDLE;
    this.engine = null;
    this.recorder = new App.StepRecorder();
    this.timerId = null;
    this.intervalMs = 800;
    this.onStepUpdate = null;
    this.onStateChange = null;
    this.onComplete = null;
  }

  setEngine(engine) {
    this.reset();
    this.engine = engine;
  }

  _setState(newState) {
    if (this.state !== newState) {
      this.state = newState;
      if (this.onStateChange) this.onStateChange(newState);
    }
  }

  play(intervalMs) {
    this.intervalMs = intervalMs || 800;
    if (this.state === ExecutorState.IDLE || this.state === ExecutorState.PAUSED) {
      if (this.state === ExecutorState.IDLE && this.engine) {
        const initStep = this.engine.get_current_state();
        if (initStep) {
          this.recorder.record(initStep);
          if (this.onStepUpdate) this.onStepUpdate(initStep);
          this.engine.step();
        }
      }
      this._setState(ExecutorState.RUNNING);
      this._scheduleNext();
    }
  }

  _scheduleNext() {
    if (this.state !== ExecutorState.RUNNING) return;
    this.timerId = setTimeout(() => {
      if (this.state !== ExecutorState.RUNNING) return;
      if (this.engine && !this.engine.is_finished()) {
        const step = this.engine.step();
        if (step) {
          this.recorder.record(step);
          if (this.onStepUpdate) this.onStepUpdate(step);
        }
      }
      if (this.engine && this.engine.is_finished()) {
        this._setState(ExecutorState.FINISHED);
        if (this.onComplete) this.onComplete();
      } else {
        this._scheduleNext();
      }
    }, this.intervalMs);
  }

  stepOnce() {
    if (this.state === ExecutorState.IDLE) {
      if (this.engine) {
        const initStep = this.engine.get_current_state();
        if (initStep) {
          this.recorder.record(initStep);
          if (this.onStepUpdate) this.onStepUpdate(initStep);
        }
      }
      this._setState(ExecutorState.PAUSED);
      return this.recorder.getCurrent();
    }
    if (this.state === ExecutorState.PAUSED && this.engine) {
      if (!this.engine.is_finished()) {
        const step = this.engine.step();
        if (step) {
          this.recorder.record(step);
          if (this.onStepUpdate) this.onStepUpdate(step);
        }
        if (this.engine.is_finished()) {
          this._setState(ExecutorState.FINISHED);
          if (this.onComplete) this.onComplete();
        }
        return step;
      }
    }
    return null;
  }

  pause() {
    if (this.state === ExecutorState.RUNNING) {
      if (this.timerId) clearTimeout(this.timerId);
      this.timerId = null;
      this._setState(ExecutorState.PAUSED);
    }
  }

  resume() {
    if (this.state === ExecutorState.PAUSED) {
      this._setState(ExecutorState.RUNNING);
      this._scheduleNext();
    }
  }

  stepBack() {
    if (this.state === ExecutorState.PAUSED || this.state === ExecutorState.FINISHED) {
      const step = this.recorder.goBack();
      if (step && this.onStepUpdate) this.onStepUpdate(step);
      if (this.state === ExecutorState.FINISHED) {
        this._setState(ExecutorState.PAUSED);
      }
      if (this.engine && this.engine.step_back) {
        this.engine.step_back();
      }
      return step;
    }
    return null;
  }

  reset() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.recorder.clear();
    if (this.engine) this.engine.reset();
    this._setState(ExecutorState.IDLE);
  }

  getState() { return this.state; }
};

/* ========== RandomDataGenerator — 随机数据生成器 ========== */
App.RandomDataGenerator = {
  randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  forQuickSort() {
    const len = this.randInt(6, 20);
    const arr = [];
    for (let i = 0; i < len; i++) arr.push(this.randInt(1, 99));
    return { arr: arr.join(',') };
  },

  forBubble() {
    return this.forQuickSort();
  },

  forMerge() {
    return this.forQuickSort();
  },

  forHanoi() {
    return { n: this.randInt(3, 6) };
  },

  forHuffman() {
    const len = this.randInt(4, 8);
    const chars = [];
    const weights = [];
    const used = new Set();
    for (let i = 0; i < len; i++) {
      chars.push(String.fromCharCode(65 + i));
      let w;
      do { w = this.randInt(1, 99); } while (used.has(w));
      used.add(w);
      weights.push(w);
    }
    return { chars: chars.join(''), weights: weights.join(',') };
  },

  forDijkstra() {
    const V = this.randInt(4, 10);
    const edges = [];
    const added = new Set();
    for (let i = 1; i < V; i++) {
      const from = this.randInt(0, i - 1);
      const weight = this.randInt(1, 20);
      edges.push(`${from},${i},${weight}`);
      added.add(`${from}-${i}`);
    }
    const extraEdges = this.randInt(0, V);
    for (let e = 0; e < extraEdges; e++) {
      const from = this.randInt(0, V - 1);
      const to = this.randInt(0, V - 1);
      if (from !== to && !added.has(`${from}-${to}`) && !added.has(`${to}-${from}`)) {
        const weight = this.randInt(1, 20);
        edges.push(`${from},${to},${weight}`);
        added.add(`${from}-${to}`);
      }
    }
    const start = this.randInt(0, V - 1);
    return { vertex_count: V, edges: edges.join(';'), start_vertex: start };
  },

  forPrim() {
    const V = this.randInt(4, 8);
    const edges = [];
    const added = new Set();
    for (let i = 1; i < V; i++) {
      const from = this.randInt(0, i - 1);
      const weight = this.randInt(1, 20);
      edges.push(`${from},${i},${weight}`);
      added.add(`${from}-${i}`);
    }
    const extraEdges = this.randInt(0, V);
    for (let e = 0; e < extraEdges; e++) {
      const from = this.randInt(0, V - 1);
      const to = this.randInt(0, V - 1);
      if (from !== to && !added.has(`${from}-${to}`) && !added.has(`${to}-${from}`)) {
        const weight = this.randInt(1, 20);
        edges.push(`${from},${to},${weight}`);
        added.add(`${from}-${to}`);
      }
    }
    const start = this.randInt(0, V - 1);
    return { vertex_count: V, edges: edges.join(';'), start_vertex: start };
  },

  forKruskal() {
    return this.forPrim();
  },

  forChessboard() {
    const k = this.randInt(2, 3);
    const size = 1 << k;
    const r = this.randInt(0, size - 1);
    const c = this.randInt(0, size - 1);
    return { k: k, special_r: r, special_c: c };
  },

  forMaze() {
    const presets = [
      { maze: '0,0,0,0,0;0,1,1,1,0;0,1,0,1,0;0,1,0,1,0;0,0,0,0,0', start_r: 1, start_c: 1, end_r: 3, end_c: 3 },
      { maze: '0,0,0,0,0,0,0;0,1,0,1,1,1,0;0,1,0,0,0,1,0;0,1,1,1,0,1,0;0,0,0,1,0,1,0;0,1,1,1,0,1,0;0,0,0,0,0,0,0', start_r: 1, start_c: 1, end_r: 5, end_c: 1 },
      { maze: '0,0,0,0,0;0,1,1,1,0;0,1,0,1,0;0,1,1,1,0;0,0,0,0,0', start_r: 1, start_c: 1, end_r: 1, end_c: 3 },
      { maze: '0,0,0,0,0,0;0,1,1,0,1,0;0,0,1,0,1,0;0,1,1,1,1,0;0,0,0,0,0,0', start_r: 1, start_c: 1, end_r: 1, end_c: 4 }
    ];
    return presets[this.randInt(0, presets.length - 1)];
  }
};

/* ========== ParamValidator — 参数校验器 ========== */
App.ParamValidator = {
  validateQuickSort(params) {
    const arrStr = (params.arr || '').trim();
    if (!arrStr) return { is_valid: false, error: '请输入排序数组，元素以逗号分隔' };
    const parts = arrStr.split(',').map(s => s.trim());
    if (parts.length < 2) return { is_valid: false, error: '数组元素个数至少为2，当前为' + parts.length };
    if (parts.length > 100) return { is_valid: false, error: '数组元素个数不能超过100' };
    for (let i = 0; i < parts.length; i++) {
      const v = Number(parts[i]);
      if (isNaN(v)) return { is_valid: false, error: `第${i + 1}个元素"${parts[i]}"不是有效数字` };
      if (v < -999 || v > 999) return { is_valid: false, error: `第${i + 1}个元素超出范围（-999~999）` };
    }
    return { is_valid: true };
  },

  validateBubble(params) {
    return this.validateQuickSort(params);
  },

  validateMerge(params) {
    return this.validateQuickSort(params);
  },

  validateHanoi(params) {
    const n = Number(params.n);
    if (isNaN(n) || !Number.isInteger(n)) return { is_valid: false, error: '盘子数量必须为整数' };
    if (n < 1 || n > 10) return { is_valid: false, error: '盘子数量必须在1~10之间' };
    return { is_valid: true };
  },

  validateHuffman(params) {
    const chars = (params.chars || '').trim();
    const weights = (params.weights || '').trim();
    if (!chars) return { is_valid: false, error: '请输入字符序列' };
    if (!weights) return { is_valid: false, error: '请输入权值序列，以逗号分隔' };
    const wParts = weights.split(',').map(s => s.trim());
    if (chars.length < 2) return { is_valid: false, error: '字符数量至少为2' };
    if (chars.length > 26) return { is_valid: false, error: '字符数量不能超过26' };
    if (chars.length !== wParts.length) return { is_valid: false, error: `字符数量(${chars.length})与权值数量(${wParts.length})不一致` };
    for (let i = 0; i < wParts.length; i++) {
      const v = Number(wParts[i]);
      if (isNaN(v)) return { is_valid: false, error: `第${i + 1}个权值"${wParts[i]}"不是有效数字` };
      if (v < 1 || v > 99) return { is_valid: false, error: `第${i + 1}个权值超出范围（1~99）` };
    }
    return { is_valid: true };
  },

  validateDijkstra(params) {
    const vc = Number(params.vertex_count);
    if (isNaN(vc) || !Number.isInteger(vc)) return { is_valid: false, error: '顶点数量必须为整数' };
    if (vc < 2 || vc > 20) return { is_valid: false, error: '顶点数量必须在2~20之间' };
    const edgesStr = (params.edges || '').trim();
    if (!edgesStr) return { is_valid: false, error: '请输入边信息' };
    const edgeParts = edgesStr.split(';').map(s => s.trim()).filter(s => s);
    if (edgeParts.length === 0) return { is_valid: false, error: '至少需要一条边' };
    for (let i = 0; i < edgeParts.length; i++) {
      const parts = edgeParts[i].split(',');
      if (parts.length !== 3) return { is_valid: false, error: `边"${edgeParts[i]}"格式不正确，应为"起点,终点,权重"` };
      const from = Number(parts[0]), to = Number(parts[1]), w = Number(parts[2]);
      if (isNaN(from) || isNaN(to) || isNaN(w)) return { is_valid: false, error: `边"${edgeParts[i]}"包含非数字值` };
      if (from < 0 || from >= vc || to < 0 || to >= vc) return { is_valid: false, error: `边"${edgeParts[i]}"顶点编号超出0~${vc - 1}范围` };
      if (w < 1 || w > 99) return { is_valid: false, error: `边"${edgeParts[i]}"权重超出范围（1~99）` };
    }
    const sv = Number(params.start_vertex);
    if (isNaN(sv) || !Number.isInteger(sv)) return { is_valid: false, error: '起始顶点必须为整数' };
    if (sv < 0 || sv >= vc) return { is_valid: false, error: `起始顶点必须在0~${vc - 1}之间` };
    return { is_valid: true };
  },

  validatePrim(params) {
    return this.validateDijkstra(params);
  },

  validateKruskal(params) {
    const vc = Number(params.vertex_count);
    if (isNaN(vc) || !Number.isInteger(vc)) return { is_valid: false, error: '顶点数量必须为整数' };
    if (vc < 2 || vc > 20) return { is_valid: false, error: '顶点数量必须在2~20之间' };
    const edgesStr = (params.edges || '').trim();
    if (!edgesStr) return { is_valid: false, error: '请输入边信息' };
    const edgeParts = edgesStr.split(';').map(s => s.trim()).filter(s => s);
    if (edgeParts.length === 0) return { is_valid: false, error: '至少需要一条边' };
    for (let i = 0; i < edgeParts.length; i++) {
      const parts = edgeParts[i].split(',');
      if (parts.length !== 3) return { is_valid: false, error: `边"${edgeParts[i]}"格式不正确，应为"起点,终点,权重"` };
      const from = Number(parts[0]), to = Number(parts[1]), w = Number(parts[2]);
      if (isNaN(from) || isNaN(to) || isNaN(w)) return { is_valid: false, error: `边"${edgeParts[i]}"包含非数字值` };
      if (from < 0 || from >= vc || to < 0 || to >= vc) return { is_valid: false, error: `边"${edgeParts[i]}"顶点编号超出0~${vc - 1}范围` };
      if (w < 1 || w > 99) return { is_valid: false, error: `边"${edgeParts[i]}"权重超出范围（1~99）` };
      if (from === to) return { is_valid: false, error: `边"${edgeParts[i]}"不能是自环` };
    }
    return { is_valid: true };
  },

  validateChessboard(params) {
    const k = Number(params.k);
    if (isNaN(k) || !Number.isInteger(k)) return { is_valid: false, error: '棋盘大小参数k必须为整数' };
    if (k < 1 || k > 4) return { is_valid: false, error: '棋盘大小参数k必须在1~4之间（即棋盘最大16×16）' };
    const size = 1 << k;
    const r = Number(params.special_r);
    const c = Number(params.special_c);
    if (isNaN(r) || !Number.isInteger(r)) return { is_valid: false, error: '特殊格行号必须为整数' };
    if (isNaN(c) || !Number.isInteger(c)) return { is_valid: false, error: '特殊格列号必须为整数' };
    if (r < 0 || r >= size) return { is_valid: false, error: `特殊格行号必须在0~${size - 1}之间` };
    if (c < 0 || c >= size) return { is_valid: false, error: `特殊格列号必须在0~${size - 1}之间` };
    return { is_valid: true };
  },

  validateMaze(params) {
    const mazeStr = (params.maze || '').trim();
    if (!mazeStr) return { is_valid: false, error: '请输入迷宫数据（0为墙，1为通路，行以分号分隔）' };
    const rows = mazeStr.split(';').map(s => s.trim()).filter(s => s);
    if (rows.length < 2) return { is_valid: false, error: '迷宫至少需要2行' };
    if (rows.length > 30) return { is_valid: false, error: '迷宫行数不能超过30' };
    const cols = rows[0].split(',').length;
    if (cols < 2) return { is_valid: false, error: '迷宫至少需要2列' };
    if (cols > 30) return { is_valid: false, error: '迷宫列数不能超过30' };
    for (let i = 0; i < rows.length; i++) {
      const cells = rows[i].split(',').map(s => s.trim());
      if (cells.length !== cols) return { is_valid: false, error: `第${i + 1}行列数(${cells.length})与第1行(${cols})不一致` };
      for (let j = 0; j < cells.length; j++) {
        const v = Number(cells[j]);
        if (isNaN(v) || (v !== 0 && v !== 1)) return { is_valid: false, error: `第${i + 1}行第${j + 1}列的值"${cells[j]}"无效，只能为0（墙）或1（通路）` };
      }
    }
    const sr = Number(params.start_r), sc = Number(params.start_c);
    const er = Number(params.end_r), ec = Number(params.end_c);
    if (isNaN(sr) || !Number.isInteger(sr)) return { is_valid: false, error: '起点行号必须为整数' };
    if (isNaN(sc) || !Number.isInteger(sc)) return { is_valid: false, error: '起点列号必须为整数' };
    if (isNaN(er) || !Number.isInteger(er)) return { is_valid: false, error: '终点行号必须为整数' };
    if (isNaN(ec) || !Number.isInteger(ec)) return { is_valid: false, error: '终点列号必须为整数' };
    if (sr < 0 || sr >= rows.length) return { is_valid: false, error: `起点行号必须在0~${rows.length - 1}之间` };
    if (sc < 0 || sc >= cols) return { is_valid: false, error: `起点列号必须在0~${cols - 1}之间` };
    if (er < 0 || er >= rows.length) return { is_valid: false, error: `终点行号必须在0~${rows.length - 1}之间` };
    if (ec < 0 || ec >= cols) return { is_valid: false, error: `终点列号必须在0~${cols - 1}之间` };
    const grid = rows.map(r => r.split(',').map(s => Number(s.trim())));
    if (grid[sr][sc] === 0) return { is_valid: false, error: '起点位于墙上，请选择通路位置作为起点' };
    if (grid[er][ec] === 0) return { is_valid: false, error: '终点位于墙上，请选择通路位置作为终点' };
    if (sr === er && sc === ec) return { is_valid: false, error: '起点和终点不能相同' };
    return { is_valid: true };
  }
};

/* ========== AlgorithmRegistry — 算法注册表 ========== */
App.AlgorithmRegistry = {
  algorithms: [
    // === 排序算法 ===
    new App.AlgorithmMeta('bubble', '冒泡排序', '排序算法', '基础',
      '平均 O(n²)，最好 O(n)', 'O(1)', [
        new App.ParamDef('arr', 'string', null, null, '', true, '待排序数组，元素以英文逗号分隔')
      ]),
    new App.AlgorithmMeta('quicksort', '快速排序', '排序算法', '基础',
      '平均 O(n log n)，最坏 O(n²)', 'O(log n)', [
        new App.ParamDef('arr', 'string', null, null, '', true, '待排序数组，元素以英文逗号分隔')
      ]),
    new App.AlgorithmMeta('merge', '归并排序', '排序算法', '基础',
      'O(n log n)', 'O(n)', [
        new App.ParamDef('arr', 'string', null, null, '', true, '待排序数组，元素以英文逗号分隔')
      ]),
    // === 递归算法 ===
    new App.AlgorithmMeta('hanoi', '汉诺塔', '递归算法', '基础',
      'O(2ⁿ)', 'O(n)', [
        new App.ParamDef('n', 'int', 1, 10, 3, true, '圆盘数量（1~10）')
      ]),
    new App.AlgorithmMeta('chessboard', '棋盘覆盖', '递归算法', '中等',
      'O(4ᵏ)', 'O(k)', [
        new App.ParamDef('k', 'int', 1, 4, 2, true, '棋盘大小指数k（棋盘为2ᵏ×2ᵏ）'),
        new App.ParamDef('special_r', 'int', 0, null, 0, true, '特殊方格行号（从0开始）'),
        new App.ParamDef('special_c', 'int', 0, null, 0, true, '特殊方格列号（从0开始）')
      ]),
    // === 树结构算法 ===
    new App.AlgorithmMeta('huffman', '哈夫曼树', '树结构算法', '中等',
      'O(n log n)', 'O(n)', [
        new App.ParamDef('chars', 'string', null, null, '', true, '字符序列（如ABCD）'),
        new App.ParamDef('weights', 'string', null, null, '', true, '权值序列，以英文逗号分隔（如5,2,8,3）')
      ]),
    // === 图算法 ===
    new App.AlgorithmMeta('dijkstra', 'Dijkstra最短路径', '图算法', '中等偏上',
      'O((V+E) log V)', 'O(V)', [
        new App.ParamDef('vertex_count', 'int', 2, 20, 5, true, '顶点数量（2~20）'),
        new App.ParamDef('edges', 'string', null, null, '', true, '边列表，格式: 起点,终点,权重;起点,终点,权重'),
        new App.ParamDef('start_vertex', 'int', 0, null, 0, true, '起始顶点编号')
      ]),
    new App.AlgorithmMeta('prim', 'Prim最小生成树', '图算法', '中等',
      'O(V²)', 'O(V)', [
        new App.ParamDef('vertex_count', 'int', 2, 20, 5, true, '顶点数量（2~20）'),
        new App.ParamDef('edges', 'string', null, null, '', true, '边列表，格式: 起点,终点,权重;起点,终点,权重'),
        new App.ParamDef('start_vertex', 'int', 0, null, 0, true, '起始顶点编号')
      ]),
    new App.AlgorithmMeta('kruskal', 'Kruskal最小生成树', '图算法', '中等',
      'O(E log E)', 'O(V)', [
        new App.ParamDef('vertex_count', 'int', 2, 20, 5, true, '顶点数量（2~20）'),
        new App.ParamDef('edges', 'string', null, null, '', true, '边列表，格式: 起点,终点,权重;起点,终点,权重')
      ]),
    // === 回溯算法 ===
    new App.AlgorithmMeta('maze', '迷宫求解', '回溯算法', '中等',
      'O(4ᴺ)', 'O(N)', [
        new App.ParamDef('maze', 'string', null, null, '', true, '迷宫矩阵（0墙1路，行以分号分隔）'),
        new App.ParamDef('start_r', 'int', 0, null, 1, true, '起点行号'),
        new App.ParamDef('start_c', 'int', 0, null, 1, true, '起点列号'),
        new App.ParamDef('end_r', 'int', 0, null, 1, true, '终点行号'),
        new App.ParamDef('end_c', 'int', 0, null, 1, true, '终点列号')
      ])
  ],

  get(algoId) { return this.algorithms.find(a => a.algoId === algoId); },
  getAll() { return this.algorithms; },
  getByCategory(category) { return this.algorithms.filter(a => a.category === category); },
  getCategories() {
    const cats = new Set(this.algorithms.map(a => a.category));
    return Array.from(cats);
  }
};

/* ========== LogExporter — 日志导出器 ========== */
App.LogExporter = class LogExporter {
  static exportTXT(algoName, inputParams, steps, complexity, finalResult) {
    let content = '';
    content += '='.repeat(60) + '\n';
    content += `算法名称：${algoName}\n`;
    content += `导出时间：${new Date().toLocaleString()}\n`;
    content += '='.repeat(60) + '\n\n';

    content += '【输入参数】\n';
    for (const [key, val] of Object.entries(inputParams)) {
      content += `  ${key}: ${val}\n`;
    }
    content += '\n【复杂度】\n';
    content += `  时间复杂度：${complexity.time}\n`;
    content += `  空间复杂度：${complexity.space}\n`;
    content += '\n【执行步骤】\n';
    content += `  共 ${steps.length} 步\n`;
    content += '-'.repeat(40) + '\n';

    steps.forEach((step, idx) => {
      content += `\n步骤 ${idx + 1} | 类型: ${step.stepType}\n`;
      content += `  说明: ${step.description}\n`;
      if (step.explanation) {
        content += `  讲解: ${step.explanation}\n`;
      }
      const snapshot = step.stateSnapshot;
      if (snapshot) {
        if (snapshot.arr) content += `  数组状态: [${snapshot.arr.join(', ')}]\n`;
        if (snapshot.comparisons !== undefined) content += `  比较次数: ${snapshot.comparisons}\n`;
        if (snapshot.swaps !== undefined) content += `  交换次数: ${snapshot.swaps}\n`;
      }
    });

    content += '\n' + '='.repeat(60) + '\n';
    content += `【最终结果】\n${finalResult}\n`;
    content += '='.repeat(60) + '\n';

    return content;
  }

  static exportJSON(algoName, inputParams, steps, complexity, finalResult) {
    const data = {
      algorithm: algoName,
      exportTime: new Date().toISOString(),
      input: inputParams,
      complexity: complexity,
      totalSteps: steps.length,
      steps: steps.map(s => ({
        stepId: s.stepId,
        stepType: s.stepType,
        description: s.description,
        explanation: s.explanation || '',
        stateSnapshot: s.stateSnapshot,
        timestamp: s.timestamp
      })),
      finalResult: finalResult
    };
    return JSON.stringify(data, null, 2);
  }

  static exportCompareTXT(algo1Name, algo2Name, inputParams, steps1, steps2, complexity1, complexity2, stats1, stats2) {
    let content = '';
    content += '='.repeat(60) + '\n';
    content += `排序算法对比日志\n`;
    content += `导出时间：${new Date().toLocaleString()}\n`;
    content += '='.repeat(60) + '\n\n';

    content += '【输入数据】\n';
    content += `  数组: [${inputParams.arr}]\n`;
    content += '\n【对比算法】\n';
    content += `  算法A: ${algo1Name}\n`;
    content += `  算法B: ${algo2Name}\n\n`;

    content += '【统计对比】\n';
    content += `  ${algo1Name}: 总步骤=${stats1.totalSteps}, 比较=${stats1.comparisons}, 交换=${stats1.swaps || 0}\n`;
    content += `  ${algo2Name}: 总步骤=${stats2.totalSteps}, 比较=${stats2.comparisons}, 交换=${stats2.swaps || 0}\n`;
    content += '\n【复杂度】\n';
    content += `  ${algo1Name}: 时间=${complexity1.time}, 空间=${complexity1.space}\n`;
    content += `  ${algo2Name}: 时间=${complexity2.time}, 空间=${complexity2.space}\n\n`;

    content += '【算法A步骤详情】\n' + '-'.repeat(40) + '\n';
    steps1.forEach((step, idx) => {
      content += `步骤 ${idx + 1} | ${step.stepType}: ${step.description}\n`;
    });

    content += '\n【算法B步骤详情】\n' + '-'.repeat(40) + '\n';
    steps2.forEach((step, idx) => {
      content += `步骤 ${idx + 1} | ${step.stepType}: ${step.description}\n`;
    });

    content += '\n' + '='.repeat(60) + '\n';
    return content;
  }

  static exportCompareJSON(algo1Name, algo2Name, inputParams, steps1, steps2, complexity1, complexity2, stats1, stats2) {
    const data = {
      type: 'sort_compare',
      exportTime: new Date().toISOString(),
      input: inputParams,
      algorithmA: {
        name: algo1Name,
        complexity: complexity1,
        statistics: stats1,
        steps: steps1.map(s => ({
          stepId: s.stepId, stepType: s.stepType, description: s.description, explanation: s.explanation || '', stateSnapshot: s.stateSnapshot
        }))
      },
      algorithmB: {
        name: algo2Name,
        complexity: complexity2,
        statistics: stats2,
        steps: steps2.map(s => ({
          stepId: s.stepId, stepType: s.stepType, description: s.description, explanation: s.explanation || '', stateSnapshot: s.stateSnapshot
        }))
      }
    };
    return JSON.stringify(data, null, 2);
  }

  static download(content, fileName) {
    const blob = new Blob(['﻿' + content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};

/* ========== CustomTestDataManager — 自定义测试数据管理 ========== */
App.CustomTestDataManager = class CustomTestDataManager {
  static STORAGE_KEY = 'algo_viz_custom_test_data';

  static _getAll() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  static _saveAll(data) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  static save(algoId, caseName, params) {
    const data = this._getAll();
    if (!data[algoId]) data[algoId] = [];
    const newCase = {
      caseId: 'custom_' + Date.now(),
      algoId: algoId,
      caseName: caseName,
      params: params,
      caseType: '用户自定义',
      description: '',
      createdAt: new Date().toISOString()
    };
    data[algoId].push(newCase);
    return this._saveAll(data) ? newCase : null;
  }

  static load(algoId) {
    const data = this._getAll();
    const items = data[algoId] || [];
    return items.map(item => new App.TestCase(
      item.caseId, item.algoId, item.caseName, item.params,
      '', '用户自定义', item.description || ''
    ));
  }

  static delete(algoId, caseId) {
    const data = this._getAll();
    if (!data[algoId]) return false;
    data[algoId] = data[algoId].filter(c => c.caseId !== caseId);
    if (data[algoId].length === 0) delete data[algoId];
    return this._saveAll(data);
  }

  static getAllForAlgo(algoId) {
    return this.load(algoId);
  }
};
