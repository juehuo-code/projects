/**
 * 迷宫求解（DFS回溯） — 引擎与渲染器
 */
var App = window.App || {};

/* ========== MazeEngine ========== */
App.MazeEngine = class MazeEngine {
  constructor() {
    this._steps = [];
    this._currentStep = 0;
    this._maze = [];
    this._rows = 0;
    this._cols = 0;
    this._startR = 0;
    this._startC = 0;
    this._endR = 0;
    this._endC = 0;
    this._path = [];
    this._found = false;
  }

  initialize(params) {
    this._maze = (params.maze || '').split(';').map(s => s.trim()).filter(s => s)
      .map(row => row.split(',').map(s => Number(s.trim())));
    this._rows = this._maze.length;
    this._cols = this._maze[0].length;
    this._startR = Number(params.start_r);
    this._startC = Number(params.start_c);
    this._endR = Number(params.end_r);
    this._endC = Number(params.end_c);
    this._path = [];
    this._found = false;
    this._steps = [];
    this._currentStep = 0;

    let sid = 0;

    this._steps.push(new App.AlgorithmStep(
      sid++, StepType.INIT,
      `初始化：${this._rows}×${this._cols} 迷宫，起点(${this._startR},${this._startC})，终点(${this._endR},${this._endC})`,
      { path: [], visited: [], found: false, current: [this._startR, this._startC] },
      { maze: this._maze, rows: this._rows, cols: this._cols, start: [this._startR, this._startC], end: [this._endR, this._endC], path: [], visited: [], current: [this._startR, this._startC], deadEnds: [] },
      `迷宫求解使用深度优先搜索（DFS）回溯算法。从起点出发，向四个方向探索，遇到死路就回溯到上一个分支点继续尝试。0表示墙壁（不可通过），1表示通路。`,
      [0]
    ));

    const visited = Array.from({length: this._rows}, () => new Array(this._cols).fill(false));
    const path = [];
    const deadEnds = new Set();
    let found = false;

    const dfs = (r, c) => {
      if (found) return false;
      if (r < 0 || r >= this._rows || c < 0 || c >= this._cols) return false;
      if (this._maze[r][c] === 0 || visited[r][c]) return false;

      visited[r][c] = true;
      path.push([r, c]);

      this._steps.push(new App.AlgorithmStep(
        sid++, StepType.EXPLORE,
        `探索位置 (${r},${c})` + (r === this._endR && c === this._endC ? ' → 到达终点！' : ''),
        { path: path.map(p => [...p]), visited: visited.map(row => [...row]), found, current: [r, c] },
        { maze: this._maze, rows: this._rows, cols: this._cols, start: [this._startR, this._startC], end: [this._endR, this._endC], path: path.map(p => [...p]), visited: visited.map(row => [...row]), current: [r, c], deadEnds: [...deadEnds].map(s => s.split(',').map(Number)) },
        `DFS逐步探索迷宫。当前位置 (${r},${c}) 标记为已访问。${r === this._endR && c === this._endC ? '这就是目标终点！从起点到终点的路径已经找到。' : '检查当前位置是否是终点，或者需要继续向相邻方向探索。'}`,
        [1, 2, 3]
      ));

      if (r === this._endR && c === this._endC) {
        found = true;
        this._steps.push(new App.AlgorithmStep(
          sid++, StepType.PATH_FOUND,
          `找到终点！路径长度为 ${path.length} 步：${path.map(p => `(${p[0]},${p[1]})`).join(' → ')}`,
          { path: path.map(p => [...p]), visited: visited.map(row => [...row]), found: true, current: [r, c] },
          { maze: this._maze, rows: this._rows, cols: this._cols, start: [this._startR, this._startC], end: [this._endR, this._endC], path: path.map(p => [...p]), visited: visited.map(row => [...row]), current: [r, c], deadEnds: [...deadEnds].map(s => s.split(',').map(Number)), found: true },
          `成功找到从起点到终点的路径！DFS回溯算法的特点是"一直走到底"，如果遇到死路就退回上一步尝试其他方向。这条路径不一定是最短路径（BFS才能保证最短），但一定能找到一条可行路径。`,
          [4]
        ));
        return true;
      }

      // 四个方向：上、右、下、左
      const dirs = [[-1, 0], [0, 1], [1, 0], [0, -1]];
      const dirNames = ['上', '右', '下', '左'];
      let hasValidMove = false;

      for (let d = 0; d < 4; d++) {
        const nr = r + dirs[d][0];
        const nc = c + dirs[d][1];
        if (nr >= 0 && nr < this._rows && nc >= 0 && nc < this._cols &&
            this._maze[nr][nc] === 1 && !visited[nr][nc]) {
          hasValidMove = true;
          this._steps.push(new App.AlgorithmStep(
            sid++, StepType.EXPLORE,
            `从 (${r},${c}) 向${dirNames[d]}探索到 (${nr},${nc})`,
            { path: path.map(p => [...p]), visited: visited.map(row => [...row]), found, current: [r, c] },
            { maze: this._maze, rows: this._rows, cols: this._cols, start: [this._startR, this._startC], end: [this._endR, this._endC], path: path.map(p => [...p]), visited: visited.map(row => [...row]), current: [r, c], nextHint: [nr, nc], deadEnds: [...deadEnds].map(s => s.split(',').map(Number)) },
            `从当前位置 (${r},${c}) 向${dirNames[d]}方向探索。发现相邻位置 (${nr},${nc}) 是通路且尚未访问，尝试向这个方向前进。DFS会优先深入探索新的方向。`,
            [5, 6]
          ));

          if (dfs(nr, nc)) return true;
        }
      }

      // 死路——回溯
      path.pop();
      deadEnds.add(`${r},${c}`);
      this._steps.push(new App.AlgorithmStep(
        sid++, StepType.BACKTRACK,
        `位置 (${r},${c}) 是死路，回溯至上一个分支点`,
        { path: path.map(p => [...p]), visited: visited.map(row => [...row]), found, current: path.length > 0 ? path[path.length - 1] : [this._startR, this._startC] },
        { maze: this._maze, rows: this._rows, cols: this._cols, start: [this._startR, this._startC], end: [this._endR, this._endC], path: path.map(p => [...p]), visited: visited.map(row => [...row]), current: path.length > 0 ? path[path.length - 1] : [this._startR, this._startC], deadEnds: [...deadEnds].map(s => s.split(',').map(Number)), backtrack: [r, c] },
        `位置 (${r},${c}) 的所有方向要么是墙壁，要么已经访问过，没有路可走——这就是"死路"。回溯到上一个岔路口，尝试其他未探索的方向。这是DFS算法的核心特征：走到无路可走时就退回来。`,
        [7, 8, 9]
      ));

      return false;
    };

    dfs(this._startR, this._startC);

    if (!found) {
      this._steps.push(new App.AlgorithmStep(
        sid++, StepType.COMPLETE,
        `搜索结束：从起点(${this._startR},${this._startC})无法到达终点(${this._endR},${this._endC})，迷宫无解`,
        { path: [], visited: visited.map(row => [...row]), found: false, current: null },
        { maze: this._maze, rows: this._rows, cols: this._cols, start: [this._startR, this._startC], end: [this._endR, this._endC], path: [], visited: visited.map(row => [...row]), current: null, deadEnds: [...deadEnds].map(s => s.split(',').map(Number)), noSolution: true },
        `DFS搜索了整个迷宫的可达区域，但未能找到从起点到终点的路径。迷宫可能存在不连通的情况，起点和终点之间被墙壁隔开了。`,
        []
      ));
    } else {
      this._steps.push(new App.AlgorithmStep(
        sid++, StepType.COMPLETE,
        `求解完成！从起点到终点的路径长度=${path.length} 步`,
        { path: path.map(p => [...p]), visited: visited.map(row => [...row]), found: true },
        { maze: this._maze, rows: this._rows, cols: this._cols, start: [this._startR, this._startC], end: [this._endR, this._endC], path: path.map(p => [...p]), visited: visited.map(row => [...row]), deadEnds: [...deadEnds].map(s => s.split(',').map(Number)), found: true },
        `DFS回溯搜索完成！找到了一条从起点到终点的可行路径。注意这不一定是最短路径——BFS可以保证找到最短路径，但DFS通常使用更少的内存。迷宫问题的关键在于回溯机制，遇到死路就退回来尝试其他分支。`,
        []
      ));
    }

    this._path = [...path];
    this._found = found;
    return true;
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
        this._path = (step.stateSnapshot.path || []).map(p => [...p]);
        this._found = step.stateSnapshot.found;
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
    this._path = [];
    this._found = false;
  }

  get_complexity() {
    return { time: 'O(4ᴺ) 最坏，实际远小于此', space: 'O(N)（递归栈深度）' };
  }

  get_pseudocode() {
    return [
      { indent: 0, text: 'function solveMaze(maze, r, c, endR, endC):' },
      { indent: 1, text: 'if out of bounds or wall or visited: return false' },
      { indent: 1, text: 'visited[r][c] = true' },
      { indent: 1, text: 'path.push([r, c])' },
      { indent: 1, text: 'if (r, c) == (endR, endC): return true' },
      { indent: 1, text: 'for each dir in [up, right, down, left]:' },
      { indent: 2, text: 'if solveMaze(maze, nr, nc, endR, endC): return true' },
      { indent: 1, text: 'path.pop()' },
      { indent: 1, text: 'deadEnds.add((r, c))' },
      { indent: 1, text: 'return false' }
    ];
  }

  get_test_cases() {
    return [
      new App.TestCase(601, 'maze', '简单5×5迷宫', {
        maze: '0,0,0,0,0;0,1,1,1,0;0,1,0,1,0;0,1,0,1,0;0,0,0,0,0',
        start_r: 1, start_c: 1, end_r: 3, end_c: 3
      }, '有解（14步）', '系统预设', '5×5标准迷宫，有解'),
      new App.TestCase(602, 'maze', '7×7复杂迷宫', {
        maze: '0,0,0,0,0,0,0;0,1,0,1,1,1,0;0,1,0,0,0,1,0;0,1,1,1,0,1,0;0,0,0,1,0,1,0;0,1,1,1,0,1,0;0,0,0,0,0,0,0',
        start_r: 1, start_c: 1, end_r: 5, end_c: 1
      }, '有解', '系统预设', '7×7迷宫，多分支路径'),
      new App.TestCase(603, 'maze', '直线迷宫', {
        maze: '0,0,0,0,0;0,1,1,1,0;0,1,0,1,0;0,1,1,1,0;0,0,0,0,0',
        start_r: 1, start_c: 1, end_r: 1, end_c: 3
      }, '有解（3步）', '系统预设', '单行迷宫，最短路径'),
      new App.TestCase(604, 'maze', '无解迷宫', {
        maze: '0,0,0,0,0;0,1,0,1,0;0,0,0,1,0;0,1,1,1,0;0,0,0,0,0',
        start_r: 1, start_c: 1, end_r: 3, end_c: 3
      }, '无解', '系统预设', '有墙壁阻隔，验证无解处理')
    ];
  }
};

/* ========== MazeRenderer ========== */
App.MazeRenderer = class MazeRenderer {
  constructor() {
    this._engine = null;
  }

  render(step, canvas) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const vd = step.visualData;
    if (!vd || !vd.maze) return;

    const maze = vd.maze;
    const rows = vd.rows;
    const cols = vd.cols;
    const cellSize = Math.floor(Math.min(W / cols, H / rows) * 0.9);
    const offsetX = (W - cellSize * cols) / 2;
    const offsetY = (H - cellSize * rows) / 2;

    const visitedSet = new Set((vd.visited || []).flatMap((row, r) =>
      row.map((v, c) => v ? `${r},${c}` : null).filter(Boolean)
    ));
    const pathSet = new Set((vd.path || []).map(p => `${p[0]},${p[1]}`));
    const deadEndSet = new Set((vd.deadEnds || []).map(p => `${p[0]},${p[1]}`));

    // 绘制单元格
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = offsetX + c * cellSize;
        const y = offsetY + r * cellSize;
        const key = `${r},${c}`;

        if (maze[r][c] === 0) {
          // 墙壁
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(x, y, cellSize, cellSize);
        } else {
          // 通路
          let bg = '#f8fafc';
          if (pathSet.has(key)) bg = '#6366f1';
          if (deadEndSet.has(key)) bg = '#fca5a5';
          if (visitedSet.has(key) && !pathSet.has(key) && !deadEndSet.has(key)) bg = '#c7d2fe';

          ctx.fillStyle = bg;
          ctx.fillRect(x, y, cellSize, cellSize);
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y, cellSize, cellSize);
        }
      }
    }

    // 起点/终点/当前位置标记
    if (vd.start) {
      const [sr, sc] = vd.start;
      const sx = offsetX + sc * cellSize + cellSize / 2;
      const sy = offsetY + sr * cellSize + cellSize / 2;
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(sx, sy, cellSize * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(10, cellSize * 0.35)}px "Microsoft YaHei",sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('S', sx, sy);
    }

    if (vd.end) {
      const [er, ec] = vd.end;
      const ex = offsetX + ec * cellSize + cellSize / 2;
      const ey = offsetY + er * cellSize + cellSize / 2;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(ex, ey, cellSize * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(10, cellSize * 0.35)}px "Microsoft YaHei",sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('E', ex, ey);
    }

    if (vd.current) {
      const [cr, cc] = vd.current;
      const cx = offsetX + cc * cellSize + cellSize / 2;
      const cy = offsetY + cr * cellSize + cellSize / 2;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }

    // 图例
    ctx.textBaseline = 'alphabetic';
    const legX = W - 170;
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(legX, 10, 10, 10);
    ctx.fillStyle = '#d1d5db';
    ctx.font = '10px "Microsoft YaHei",sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('起点(S)', legX + 14, 19);

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(legX + 70, 10, 10, 10);
    ctx.fillText('终点(E)', legX + 84, 19);

    ctx.fillStyle = '#6366f1';
    ctx.fillRect(legX, 28, 10, 10);
    ctx.fillText('当前路径', legX + 14, 37);

    ctx.fillStyle = '#fca5a5';
    ctx.fillRect(legX + 70, 28, 10, 10);
    ctx.fillText('死路', legX + 84, 37);

    ctx.fillStyle = '#c7d2fe';
    ctx.fillRect(legX, 46, 10, 10);
    ctx.fillText('已访问', legX + 14, 55);
  }

  renderTransition(from, to, canvas, progress) {
    this.render(to, canvas);
  }

  clear(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
};
