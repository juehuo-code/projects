/**
 * Prim最小生成树 — 引擎与渲染器
 */
var App = window.App || {};

/* ========== PrimEngine ========== */
App.PrimEngine = class PrimEngine {
  constructor() {
    this._steps = [];
    this._currentStep = 0;
    this._vertexCount = 0;
    this._edges = [];
    this._selected = [];
    this._mstEdges = [];
  }

  initialize(params) {
    this._vertexCount = Number(params.vertex_count);
    this._edges = (params.edges || '').split(';').map(s => s.trim()).filter(s => s)
      .map(s => s.split(',').map(Number));
    const startV = Number(params.start_vertex);
    this._steps = [];
    this._currentStep = 0;
    this._selected = [];
    this._mstEdges = [];

    // 构建邻接表
    const adj = Array.from({length: this._vertexCount}, () => []);
    this._edges.forEach(([f, t, w]) => {
      adj[f].push({ to: t, weight: w });
      adj[t].push({ to: f, weight: w });
    });

    let sid = 0;
    const V = this._vertexCount;

    this._steps.push(new App.AlgorithmStep(
      sid++, StepType.INIT,
      `初始化：${V} 个顶点，起始顶点 ${startV}，开始构建最小生成树`,
      { selected: [], mstEdges: [], totalWeight: 0 },
      { vertices: V, edges: this._edges, selected: [], mstEdges: [], startVertex: startV },
      `Prim算法从任意一个顶点开始，逐步将最近的未连接顶点纳入生成树。维护一个候选边集合，每次从中选择权值最小的安全边。这是一种贪心策略。`,
      [0, 1]
    ));

    const inTree = new Array(V).fill(false);
    const minDist = new Array(V).fill(Infinity);
    const nearest = new Array(V).fill(-1);
    let totalWeight = 0;

    inTree[startV] = true;
    minDist[startV] = 0;
    this._selected = [startV];

    this._steps.push(new App.AlgorithmStep(
      sid++, StepType.SELECT_VERTEX,
      `将起始顶点 ${startV} 加入最小生成树`,
      { selected: [...this._selected], mstEdges: [], totalWeight: 0 },
      { vertices: V, edges: this._edges, selected: [...this._selected], mstEdges: [], startVertex: startV, currentVertex: startV },
      `选择顶点 ${startV} 作为Prim算法的起始点，将其加入已选集合。此时生成树只有一个顶点，还没有边。`,
      [2]
    ));

    // 更新邻接顶点的距离
    for (const edge of adj[startV]) {
      if (!inTree[edge.to] && edge.weight < minDist[edge.to]) {
        minDist[edge.to] = edge.weight;
        nearest[edge.to] = startV;

        const inEdge = this._findEdgeIndex(startV, edge.to, edge.weight);
        this._steps.push(new App.AlgorithmStep(
          sid++, StepType.CANDIDATE_CHECK,
          `将边 (${startV},${edge.to}) 权值=${edge.weight} 加入候选边集合`,
          { selected: [...this._selected], mstEdges: [], totalWeight: 0, minDist: [...minDist] },
          { vertices: V, edges: this._edges, selected: [...this._selected], mstEdges: [], candidateEdges: [{from: startV, to: edge.to, weight: edge.weight}], startVertex: startV, currentVertex: edge.to },
          `从新加入的顶点 ${startV} 出发，检查它的所有邻边。边 (${startV},${edge.to}) 权值为 ${edge.weight}，由于目标顶点 ${edge.to} 尚未在生成树中，将其加入候选边集合。候选边是生成树与外部顶点之间的所有边。`,
          [8, 9]
        ));
      }
    }

    // 重复 V-1 次
    for (let iter = 1; iter < V; iter++) {
      // 找最小候选边
      let minWeight = Infinity, minV = -1;
      for (let v = 0; v < V; v++) {
        if (!inTree[v] && minDist[v] < minWeight) {
          minWeight = minDist[v];
          minV = v;
        }
      }

      if (minV === -1) {
        this._steps.push(new App.AlgorithmStep(
          sid++, StepType.COMPLETE,
          `图不连通，无法构建完整的生成树。已找到 ${totalWeight === 0 ? '部分' : ''}生成树`,
          { selected: [...this._selected], mstEdges: [...this._mstEdges], totalWeight },
          { vertices: V, edges: this._edges, selected: [...this._selected], mstEdges: [...this._mstEdges] },
          `没有更多可选的候选边，说明图可能是不连通的。Prim算法要求输入图是连通图才能生成完整的生成树。`,
          []
        ));
        break;
      }

      this._steps.push(new App.AlgorithmStep(
        sid++, StepType.SELECT_MIN_EDGE,
        `从候选边中选择最小边 (${nearest[minV]},${minV}) 权值=${minWeight}`,
        { selected: [...this._selected], mstEdges: [...this._mstEdges], totalWeight },
        { vertices: V, edges: this._edges, selected: [...this._selected], mstEdges: [...this._mstEdges], candidateEdges: [], currentEdge: [nearest[minV], minV, minWeight], currentVertex: minV },
        `在所有候选边中，边 (${nearest[minV]},${minV}) 的权值 ${minWeight} 最小。根据贪心选择性质，这条边一定是某个最小生成树的一部分，因此可以安全地将它加入生成树。`,
        [4]
      ));

      // 添加到 MST
      inTree[minV] = true;
      this._selected.push(minV);
      this._mstEdges.push([nearest[minV], minV, minWeight]);
      totalWeight += minWeight;

      this._steps.push(new App.AlgorithmStep(
        sid++, StepType.EDGE_ACCEPTED,
        `将边 (${nearest[minV]},${minV})（权值=${minWeight}）加入MST。当前总权值=${totalWeight}`,
        { selected: [...this._selected], mstEdges: [...this._mstEdges], totalWeight },
        { vertices: V, edges: this._edges, selected: [...this._selected], mstEdges: [...this._mstEdges], lastAddedEdge: [nearest[minV], minV, minWeight], currentVertex: minV },
        `顶点 ${minV} 和边 (${nearest[minV]},${minV}) 正式加入最小生成树。这条边是当前连接生成树内部和外部的最小代价边。MST总权值更新为 ${totalWeight}。`,
        [5, 6]
      ));

      // 更新候选边
      for (const edge of adj[minV]) {
        if (!inTree[edge.to] && edge.weight < minDist[edge.to]) {
          minDist[edge.to] = edge.weight;
          nearest[edge.to] = minV;

          this._steps.push(new App.AlgorithmStep(
            sid++, StepType.CANDIDATE_CHECK,
            `更新顶点 ${edge.to} 的候选边为 (${minV},${edge.to}) 权值=${edge.weight}（更小）`,
            { selected: [...this._selected], mstEdges: [...this._mstEdges], totalWeight, minDist: [...minDist] },
            { vertices: V, edges: this._edges, selected: [...this._selected], mstEdges: [...this._mstEdges], candidateEdges: [{from: minV, to: edge.to, weight: edge.weight}], currentVertex: minV },
            `检查新加入顶点 ${minV} 的邻边 (${minV},${edge.to})，权值 ${edge.weight}。因为这条边比顶点 ${edge.to} 原来对应的候选边更小（或原来没有候选边），所以更新顶点 ${edge.to} 的候选边。`,
            [8, 9]
          ));
        }
      }
    }

    const mstInfo = totalWeight > 0
      ? `MST边集合：${this._mstEdges.map(e => `(${e[0]},${e[1]})`).join(', ')}`
      : '';

    this._steps.push(new App.AlgorithmStep(
      sid++, StepType.COMPLETE,
      `Prim算法完成！最小生成树总权值=${totalWeight}，包含 ${this._mstEdges.length} 条边。${mstInfo}`,
      { selected: [...this._selected], mstEdges: [...this._mstEdges], totalWeight },
      { vertices: V, edges: this._edges, selected: [...this._selected], mstEdges: [...this._mstEdges] },
      `Prim算法执行完毕。该算法从任一顶点出发，每次选择当前最小的候选边扩展生成树。时间复杂度为 O(V²)（使用邻接矩阵）或 O((V+E)log V)（使用优先队列）。`,
      [10]
    ));

    return true;
  }

  _findEdgeIndex(f, t, w) {
    for (let i = 0; i < this._edges.length; i++) {
      const [ef, et, ew] = this._edges[i];
      if ((ef === f && et === t && ew === w) || (ef === t && et === f && ew === w)) return i;
    }
    return -1;
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
        this._selected = [...step.stateSnapshot.selected];
        this._mstEdges = step.stateSnapshot.mstEdges.map(e => [...e]);
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
    this._selected = [];
    this._mstEdges = [];
  }

  get_complexity() {
    return { time: 'O(V²) 或 O((V+E) log V)', space: 'O(V)' };
  }

  get_pseudocode() {
    return [
      { indent: 0, text: 'function prim(G, start):' },
      { indent: 1, text: 'for each vertex v: inTree[v] = false' },
      { indent: 1, text: 'inTree[start] = true' },
      { indent: 1, text: 'for i = 1 to V-1:' },
      { indent: 2, text: 'select min edge (u,v) from candidates' },
      { indent: 2, text: 'inTree[v] = true' },
      { indent: 2, text: 'add edge (u,v) to MST' },
      { indent: 2, text: 'for each neighbor w of v:' },
      { indent: 3, text: 'if !inTree[w] and weight < minDist[w]:' },
      { indent: 4, text: 'update candidate for w' },
      { indent: 1, text: 'return MST' }
    ];
  }

  get_test_cases() {
    return [
      new App.TestCase(301, 'prim', '标准连通图（6顶点）', {
        vertex_count: 6, edges: '0,1,4;0,2,3;1,2,1;1,3,2;2,3,4;2,4,3;3,4,2;3,5,1;4,5,3', start_vertex: 0
      }, '总权值=11', '系统预设', '6个顶点的连通图'),
      new App.TestCase(302, 'prim', '完全图（4顶点）', {
        vertex_count: 4, edges: '0,1,2;0,2,3;0,3,4;1,2,1;1,3,5;2,3,6', start_vertex: 0
      }, '总权值=7', '系统预设', '4顶点的完全图'),
      new App.TestCase(303, 'prim', '简单图（3顶点）', {
        vertex_count: 3, edges: '0,1,5;0,2,3;1,2,1', start_vertex: 0
      }, '总权值=4', '系统预设', '3顶点的简单连通图'),
      new App.TestCase(304, 'prim', '稀疏图（5顶点）', {
        vertex_count: 5, edges: '0,1,2;1,2,3;2,3,4;3,4,1;0,4,5;1,3,6;0,2,7', start_vertex: 2
      }, '总权值=10', '系统预设', '5顶点的稀疏连通图')
    ];
  }
};

/* ========== PrimRenderer ========== */
App.PrimRenderer = class PrimRenderer {
  constructor() {
    this._engine = null;
    this._positions = [];
  }

  render(step, canvas) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const vd = step.visualData;
    if (!vd || !vd.vertices) return;

    const V = vd.vertices;
    this._computePositions(V, W, H);

    // 绘制边
    const edges = vd.edges || [];
    const mstSet = new Set((vd.mstEdges || []).map(e => `${e[0]}-${e[1]}`));
    const candidateSet = new Set((vd.candidateEdges || []).map(e => `${e.from}-${e.to}`));

    edges.forEach(([f, t, w]) => {
      const key1 = `${f}-${t}`, key2 = `${t}-${f}`;
      const isMst = mstSet.has(key1) || mstSet.has(key2);
      const isCandidate = candidateSet.has(key1) || candidateSet.has(key2);
      const isCurrent = vd.currentEdge && ((vd.currentEdge[0] === f && vd.currentEdge[1] === t) || (vd.currentEdge[0] === t && vd.currentEdge[1] === f));

      let strokeStyle = '#374151';
      let lineWidth = 1;
      if (isMst) { strokeStyle = '#22c55e'; lineWidth = 3; }
      else if (isCurrent) { strokeStyle = '#f59e0b'; lineWidth = 3; }
      else if (isCandidate) { strokeStyle = '#6366f1'; lineWidth = 2; ctx.setLineDash([5, 5]); }

      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(this._positions[f].x, this._positions[f].y);
      ctx.lineTo(this._positions[t].x, this._positions[t].y);
      ctx.stroke();
      ctx.setLineDash([]);

      // 权值标签
      const mx = (this._positions[f].x + this._positions[t].x) / 2;
      const my = (this._positions[f].y + this._positions[t].y) / 2;
      ctx.fillStyle = '#374151';
      ctx.font = 'bold 12px "Consolas","Microsoft YaHei",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(w, mx, my - 4);
    });

    // 绘制顶点
    for (let i = 0; i < V; i++) {
      const { x, y } = this._positions[i];
      const isSelected = (vd.selected || []).includes(i);
      const isCurrent = vd.currentVertex === i;
      const isStart = vd.startVertex === i;
      let r = 18;

      let fillColor = '#4b5563';
      if (isStart) fillColor = '#22c55e';
      else if (isSelected) fillColor = '#6366f1';
      if (isCurrent) { r = 22; fillColor = '#f59e0b'; }

      // 光晕
      ctx.shadowColor = fillColor;
      ctx.shadowBlur = isCurrent ? 16 : 8;

      const grad = ctx.createRadialGradient(x - 3, y - 3, r * 0.1, x, y, r);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.6, fillColor);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // 顶点编号
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px "Consolas","Microsoft YaHei",sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(i, x, y);
    }

    // 图例
    ctx.textBaseline = 'alphabetic';
    let legY = 12;
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(10, legY, 12, 12);
    ctx.fillStyle = '#d1d5db';
    ctx.font = '11px "Microsoft YaHei",sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('MST边', 26, legY + 10);

    ctx.fillStyle = '#6366f1';
    ctx.fillRect(80, legY, 12, 12);
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(80, legY + 6); ctx.lineTo(92, legY + 6); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillText('候选边', 96, legY + 10);

    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(155, legY, 12, 12);
    ctx.fillText('当前顶点', 171, legY + 10);

    ctx.fillStyle = '#22c55e';
    ctx.fillRect(245, legY, 12, 12);
    ctx.fillText('起点', 261, legY + 10);
  }

  _computePositions(V, W, H) {
    if (this._positions.length === V && this._positions[0]) return;
    this._positions = [];
    const cx = W / 2, cy = H / 2;
    const radius = Math.min(W, H) / 2 - 50;
    for (let i = 0; i < V; i++) {
      const angle = (2 * Math.PI * i) / V - Math.PI / 2;
      this._positions.push({
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle)
      });
    }
  }

  renderTransition(from, to, canvas, progress) {
    this.render(to, canvas);
  }

  clear(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
};
