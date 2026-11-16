/**
 * Kruskal最小生成树 — 引擎与渲染器
 */
var App = window.App || {};

/* ========== KruskalEngine ========== */
App.KruskalEngine = class KruskalEngine {
  constructor() {
    this._steps = [];
    this._currentStep = 0;
    this._vertexCount = 0;
    this._sortedEdges = [];
    this._mstEdges = [];
    this._parent = [];
    this._rank = [];
  }

  initialize(params) {
    this._vertexCount = Number(params.vertex_count);
    const rawEdges = (params.edges || '').split(';').map(s => s.trim()).filter(s => s)
      .map(s => s.split(',').map(Number));
    this._sortedEdges = [...rawEdges].sort((a, b) => a[2] - b[2]);
    this._steps = [];
    this._currentStep = 0;
    this._mstEdges = [];

    const V = this._vertexCount;
    this._parent = Array.from({length: V}, (_, i) => i);
    this._rank = new Array(V).fill(0);

    let sid = 0;

    this._steps.push(new App.AlgorithmStep(
      sid++, StepType.INIT,
      `初始化：${V} 个顶点，${rawEdges.length} 条边。将所有边按权值从小到大排序`,
      { mstEdges: [], totalWeight: 0, parent: [...this._parent], rank: [...this._rank] },
      { vertices: V, edges: rawEdges, sortedEdges: [...this._sortedEdges], mstEdges: [], currentEdgeIdx: -1 },
      `Kruskal算法先将所有边按权值排序，然后从小到大依次检查每条边。如果一条边连接的两个顶点当前不在同一连通分量中（用并查集判断），就选择这条边，否则丢弃。`,
      [1, 2]
    ));

    this._steps.push(new App.AlgorithmStep(
      sid++, StepType.CANDIDATE_CHECK,
      `边排序完成：[${this._sortedEdges.map(e => `(${e[0]},${e[1]},${e[2]})`).join(', ')}]`,
      { mstEdges: [], totalWeight: 0, parent: [...this._parent], rank: [...this._rank] },
      { vertices: V, edges: rawEdges, sortedEdges: [...this._sortedEdges], mstEdges: [], currentEdgeIdx: -1, phase: 'sorted' },
      `将所有边按权值从小到大排序。排序是Kruskal算法的关键预处理步骤，它确保我们总是优先考虑权值最小的边，从而满足贪心选择性质。`,
      [1]
    ));

    let totalWeight = 0;
    let acceptedCount = 0;

    for (let i = 0; i < this._sortedEdges.length; i++) {
      const [f, t, w] = this._sortedEdges[i];

      this._steps.push(new App.AlgorithmStep(
        sid++, StepType.UNION_CHECK,
        `检查边 (${f},${t}) 权值=${w}：判断顶点 ${f} 和 ${t} 是否在同一连通分量`,
        { mstEdges: [...this._mstEdges], totalWeight, parent: [...this._parent], rank: [...this._rank] },
        { vertices: V, edges: rawEdges, sortedEdges: [...this._sortedEdges], mstEdges: [...this._mstEdges], currentEdgeIdx: i, checkingEdge: [f, t, w] },
        `使用并查集检查顶点 ${f} 和 ${t} 是否已经连通。并查集是一种高效维护不相交集合的数据结构，支持 find（查找元素所属集合）和 union（合并两个集合）操作。`,
        [4, 5]
      ));

      const rootF = this._find(f);
      const rootT = this._find(t);

      this._steps.push(new App.AlgorithmStep(
        sid++, StepType.UNION_CHECK,
        `find(${f})=${rootF}, find(${t})=${rootT}` + (rootF !== rootT ? ' → 不在同一集合，可以选择' : ' → 在同一集合，会形成环，丢弃'),
        { mstEdges: [...this._mstEdges], totalWeight, parent: [...this._parent], rank: [...this._rank] },
        { vertices: V, edges: rawEdges, sortedEdges: [...this._sortedEdges], mstEdges: [...this._mstEdges], currentEdgeIdx: i, checkingEdge: [f, t, w], findResult: { f: rootF, t: rootT, same: rootF === rootT } },
        rootF !== rootT
          ? `顶点 ${f} 属于集合 ${rootF}，顶点 ${t} 属于集合 ${rootT}。它们属于不同的集合，说明添加边 (${f},${t}) 不会形成环。这条边是安全的，可以加入MST。`
          : `顶点 ${f} 和 ${t} 已经属于同一个集合 ${rootF}，说明它们之间已经存在一条路径。如果添加这条边，就会形成环（cycle），破坏树的性质。因此丢弃这条边。`,
        [5]
      ));

      if (rootF !== rootT) {
        this._union(rootF, rootT);
        this._mstEdges.push([f, t, w]);
        totalWeight += w;
        acceptedCount++;

        this._steps.push(new App.AlgorithmStep(
          sid++, StepType.EDGE_ACCEPTED,
          `接受边 (${f},${t})（权值=${w}）。合并集合 ${rootF} 和 ${rootT}。当前MST总权值=${totalWeight}`,
          { mstEdges: [...this._mstEdges], totalWeight, parent: [...this._parent], rank: [...this._rank] },
          { vertices: V, edges: rawEdges, sortedEdges: [...this._sortedEdges], mstEdges: [...this._mstEdges], currentEdgeIdx: i, acceptedEdge: [f, t, w] },
          `接受边 (${f},${t})！这是当前可选择的最小权值边，且不会形成环。在并查集中将集合 ${rootF} 和 ${rootT} 合并为一个集合。MST边数增加到 ${acceptedCount}，总权值增加到 ${totalWeight}。`,
          [6, 7]
        ));
      } else {
        this._steps.push(new App.AlgorithmStep(
          sid++, StepType.EDGE_REJECTED,
          `丢弃边 (${f},${t})（权值=${w}），会形成环`,
          { mstEdges: [...this._mstEdges], totalWeight, parent: [...this._parent], rank: [...this._rank] },
          { vertices: V, edges: rawEdges, sortedEdges: [...this._sortedEdges], mstEdges: [...this._mstEdges], currentEdgeIdx: i, rejectedEdge: [f, t, w] },
          `丢弃边 (${f},${t})。因为添加这条边会形成环，破坏最小生成树的无环性质。Kruskal算法通过并查集保证选中的边永远不会形成环。`,
          [8, 9]
        ));
      }

      if (acceptedCount === V - 1 && i < this._sortedEdges.length - 1) {
        this._steps.push(new App.AlgorithmStep(
          sid++, StepType.COMPLETE,
          `MST已包含 ${V - 1} 条边（满），剩余边无需检查`,
          { mstEdges: [...this._mstEdges], totalWeight, parent: [...this._parent], rank: [...this._rank] },
          { vertices: V, edges: rawEdges, sortedEdges: [...this._sortedEdges], mstEdges: [...this._mstEdges], currentEdgeIdx: i, completed: true },
          `已经选出了 V-1 = ${V - 1} 条边，它们构成了一棵包含所有 ${V} 个顶点的生成树。根据生成树的性质，n 个顶点的树恰好有 n-1 条边，因此剩余的边无需再检查。`,
          [10]
        ));
        break;
      }
    }

    const mstInfo = totalWeight > 0
      ? `MST边集合：${this._mstEdges.map(e => `(${e[0]},${e[1]})`).join(', ')}`
      : '';

    this._steps.push(new App.AlgorithmStep(
      sid++, StepType.COMPLETE,
      `Kruskal算法完成！最小生成树总权值=${totalWeight}，包含 ${this._mstEdges.length} 条边。${mstInfo}`,
      { mstEdges: [...this._mstEdges], totalWeight, parent: [...this._parent], rank: [...this._rank] },
      { vertices: V, edges: rawEdges, sortedEdges: [...this._sortedEdges], mstEdges: [...this._mstEdges], currentEdgeIdx: -1, completed: true },
      `Kruskal算法执行完毕。该算法通过并查集数据结构高效地判断边是否安全。时间复杂度为 O(E log E)（边排序占主导），适合边稀疏的图。`,
      [11]
    ));

    return true;
  }

  _find(x) {
    if (this._parent[x] !== x) {
      this._parent[x] = this._find(this._parent[x]); // 路径压缩
    }
    return this._parent[x];
  }

  _union(x, y) {
    if (this._rank[x] < this._rank[y]) {
      this._parent[x] = y;
    } else if (this._rank[x] > this._rank[y]) {
      this._parent[y] = x;
    } else {
      this._parent[y] = x;
      this._rank[x]++;
    }
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
        this._mstEdges = step.stateSnapshot.mstEdges.map(e => [...e]);
        this._parent = [...step.stateSnapshot.parent];
        this._rank = [...step.stateSnapshot.rank];
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
    this._mstEdges = [];
    this._parent = [];
    this._rank = [];
  }

  get_complexity() {
    return { time: 'O(E log E)', space: 'O(V)' };
  }

  get_pseudocode() {
    return [
      { indent: 0, text: 'function kruskal(G):' },
      { indent: 1, text: 'sort edges by weight' },
      { indent: 1, text: 'for each vertex v: makeSet(v)' },
      { indent: 1, text: 'MST = []' },
      { indent: 1, text: 'for each edge (u,v,w) in sorted order:' },
      { indent: 2, text: 'if find(u) != find(v):' },
      { indent: 3, text: 'MST.add((u,v,w))' },
      { indent: 3, text: 'union(u, v)' },
      { indent: 2, text: 'else:' },
      { indent: 3, text: 'discard edge (would form cycle)' },
      { indent: 2, text: 'if |MST| == V-1: break' },
      { indent: 1, text: 'return MST' }
    ];
  }

  get_test_cases() {
    return [
      new App.TestCase(401, 'kruskal', '标准连通图（6顶点）', {
        vertex_count: 6, edges: '0,1,4;0,2,3;1,2,1;1,3,2;2,3,4;2,4,3;3,4,2;3,5,1;4,5,3'
      }, '总权值=11', '系统预设', '6个顶点的连通图'),
      new App.TestCase(402, 'kruskal', '完全图（4顶点）', {
        vertex_count: 4, edges: '0,1,2;0,2,3;0,3,4;1,2,1;1,3,5;2,3,6'
      }, '总权值=7', '系统预设', '4顶点的完全图'),
      new App.TestCase(403, 'kruskal', '带环检测图（5顶点）', {
        vertex_count: 5, edges: '0,1,1;1,2,2;2,3,3;3,4,4;4,0,5;0,2,6;1,3,7'
      }, '总权值=10', '系统预设', '包含环，测试并查集环检测'),
      new App.TestCase(404, 'kruskal', '稀疏图（5顶点）', {
        vertex_count: 5, edges: '0,1,2;1,2,3;2,3,4;3,4,1;0,4,5;1,3,6'
      }, '总权值=10', '系统预设', '5顶点的稀疏图')
    ];
  }
};

/* ========== KruskalRenderer ========== */
App.KruskalRenderer = class KruskalRenderer {
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

    const allEdges = vd.edges || [];
    const mstSet = new Set((vd.mstEdges || []).map(e => `${e[0]}-${e[1]}`));

    // 绘制所有边
    allEdges.forEach(([f, t, w]) => {
      const key1 = `${f}-${t}`, key2 = `${t}-${f}`;
      const isMst = mstSet.has(key1) || mstSet.has(key2);
      const isChecking = vd.checkingEdge && ((vd.checkingEdge[0] === f && vd.checkingEdge[1] === t) || (vd.checkingEdge[0] === t && vd.checkingEdge[1] === f));
      const isAccepted = vd.acceptedEdge && ((vd.acceptedEdge[0] === f && vd.acceptedEdge[1] === t) || (vd.acceptedEdge[0] === t && vd.acceptedEdge[1] === f));
      const isRejected = vd.rejectedEdge && ((vd.rejectedEdge[0] === f && vd.rejectedEdge[1] === t) || (vd.rejectedEdge[0] === t && vd.rejectedEdge[1] === f));

      let strokeStyle = '#374151';
      let lineWidth = 1;
      if (isMst) { strokeStyle = '#22c55e'; lineWidth = 3; }
      else if (isChecking) { strokeStyle = '#f59e0b'; lineWidth = 2.5; }
      else if (isRejected) { strokeStyle = '#ef4444'; lineWidth = 2; ctx.setLineDash([4, 4]); }

      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(this._positions[f].x, this._positions[f].y);
      ctx.lineTo(this._positions[t].x, this._positions[t].y);
      ctx.stroke();
      ctx.setLineDash([]);

      // 权值
      const mx = (this._positions[f].x + this._positions[t].x) / 2;
      const my = (this._positions[f].y + this._positions[t].y) / 2;
      ctx.fillStyle = isMst ? '#22c55e' : '#9ca3af';
      ctx.font = 'bold 11px "Consolas","Microsoft YaHei",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(w, mx, my - 4);
    });

    // 绘制顶点
    for (let i = 0; i < V; i++) {
      const { x, y } = this._positions[i];
      const inMst = (vd.mstEdges || []).some(e => e[0] === i || e[1] === i);
      let r = 18;

      let fillColor = '#4b5563';
      if (inMst) fillColor = '#6366f1';

      const grad = ctx.createRadialGradient(x - 3, y - 3, r * 0.1, x, y, r);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.6, fillColor);
      ctx.fillStyle = grad;

      ctx.shadowColor = fillColor;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px "Consolas","Microsoft YaHei",sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(i, x, y);
    }

    // 右侧边排序列表
    ctx.textBaseline = 'alphabetic';
    const sortedEdges = vd.sortedEdges || [];
    if (sortedEdges.length > 0) {
      ctx.fillStyle = '#d1d5db';
      ctx.font = '11px "Microsoft YaHei",sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('边排序列表:', W - 220, 20);

      sortedEdges.forEach(([f, t, w], idx) => {
        const y = 40 + idx * 20;
        if (y > H - 20) return;

        let color = '#9ca3af';
        if (idx === vd.currentEdgeIdx && vd.rejectedEdge) color = '#ef4444';
        else if (idx === vd.currentEdgeIdx) color = '#f59e0b';
        else if (idx < (vd.currentEdgeIdx >= 0 ? vd.currentEdgeIdx + 1 : 0)) {
          const key1 = `${f}-${t}`, key2 = `${t}-${f}`;
          if (mstSet.has(key1) || mstSet.has(key2)) color = '#22c55e';
          else if ((vd.mstEdges || []).length + (vd.rejectedEdge ? 1 : 0) > idx) color = '#6b7280';
        }

        ctx.fillStyle = color;
        ctx.fillText(`(${f},${t}) w=${w}`, W - 210, y);
      });
    }

    // 图例
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(10, 10, 12, 12);
    ctx.fillStyle = '#d1d5db';
    ctx.font = '11px "Microsoft YaHei",sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('MST边', 26, 20);

    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(80, 10, 12, 12);
    ctx.fillText('正在检查', 96, 20);

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(170, 10, 12, 12);
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(170, 16); ctx.lineTo(182, 16); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillText('已丢弃', 186, 20);
  }

  _computePositions(V, W, H) {
    if (this._positions.length === V && this._positions[0]) return;
    this._positions = [];
    const cx = W / 2 - 50, cy = H / 2;
    const radius = Math.min(W, H) / 2 - 60;
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
