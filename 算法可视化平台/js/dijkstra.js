/**
 * Dijkstra最短路径引擎 — 贪心图算法逐步执行
 * 可视化表现：带权图 + 顶点状态 + distance 数组
 */
var App = window.App || {};

App.DijkstraEngine = class DijkstraEngine {
  constructor() { this.reset(); }

  initialize(params) {
    this.reset();
    this.vertexCount = Number(params.vertex_count) || 5;
    this.startVertex = Number(params.start_vertex) || 0;

    // 解析边
    const edgesStr = (params.edges || '').trim();
    this.edgeList = [];
    if (edgesStr) {
      edgesStr.split(';').forEach(s => {
        const parts = s.trim().split(',');
        if (parts.length === 3) {
          this.edgeList.push([Number(parts[0]), Number(parts[1]), Number(parts[2])]);
        }
      });
    }

    // 构建邻接表
    this.adj = {};
    for (let i = 0; i < this.vertexCount; i++) this.adj[i] = [];
    this.edgeList.forEach(([from, to, w]) => {
      this.adj[from].push({ to, weight: w });
    });

    // 初始化
    this.dist = Array(this.vertexCount).fill(Infinity);
    this.dist[this.startVertex] = 0;
    this.visited = Array(this.vertexCount).fill(false);
    this.pred = Array(this.vertexCount).fill(-1);

    this.steps = [];

    // INIT步骤 — 必须包含 edgeList 以便渲染器自包含
    this.steps.push(this._makeStep(StepType.INIT,
      `初始状态：起点=${this.startVertex}，distance[${this.startVertex}]=0，其余为∞`,
      { currentVertex: -1, selectedVertex: -1, relaxEdge: null },
      'Dijkstra算法用于求单源最短路径。维护一个distance数组记录起点到每个顶点的当前最短距离，初始时起点距离为0，其余为无穷大。每次从"未确定"顶点中选出距离最小的那个，将其标记为"已确定"。',
      [1, 2, 3]));

    let outerIter = 0;

    for (let iter = 0; iter < this.vertexCount; iter++) {
      // 选择最近未访问顶点
      let u = -1, minDist = Infinity;
      for (let i = 0; i < this.vertexCount; i++) {
        if (!this.visited[i] && this.dist[i] < minDist) {
          minDist = this.dist[i];
          u = i;
        }
      }
      if (u === -1) break; // 所有剩余顶点不可达

      outerIter++;
      const distDisplay = minDist === Infinity ? '∞' : minDist;

      this.steps.push(this._makeStep(StepType.SELECT_VERTEX,
        `第 ${outerIter} 轮：选择距离最小的未确定顶点 ${u}（distance=${distDisplay}）`,
        { currentVertex: u, selectedVertex: u, relaxEdge: null },
        `在所有尚未确定最短路径的顶点中，选择distance值最小的顶点 ${u}。根据贪心选择性质，这个距离已经是最短的，可以被"确定"下来。因为通过其他未确定顶点到达 ${u} 的距离不可能更小。`,
        [4, 5]));

      // 标记为已访问
      this.visited[u] = true;
      this.steps.push(this._makeStep(StepType.MARK_VISITED,
        `顶点 ${u} 已标记为"已确定"，最短距离=${distDisplay}`,
        { currentVertex: u, selectedVertex: -1, relaxEdge: null },
        `顶点 ${u} 的最短路径已被确定。distance[${u}]=${distDisplay} 是从起点 ${this.startVertex} 到 ${u} 的最终最短距离，不会再被更新。`,
        [7]));

      // 松弛操作 — 每条邻边产生一个步骤
      const neighbors = this.adj[u] || [];
      for (const edge of neighbors) {
        const v = edge.to, w = edge.weight;
        const newDist = this.dist[u] + w;
        const canRelax = newDist < this.dist[v];

        if (canRelax) {
          const oldDist = this.dist[v];
          this.dist[v] = newDist;
          this.pred[v] = u;
          this.steps.push(this._makeStep(StepType.RELAX_UPDATE,
            `松弛边(${u}→${v})：distance[${u}](${this.dist[u]})+${w}=${newDist} < distance[${v}](${oldDist === Infinity ? '∞' : oldDist})，更新 distance[${v}]=${newDist}，前驱 pred[${v}]=${u}`,
            { currentVertex: u, selectedVertex: -1, relaxEdge: { from: u, to: v, weight: w }, updated: true, newDist },
            `通过顶点 ${u} 到达顶点 ${v} 的新距离 ${newDist} 比原记录 ${oldDist === Infinity ? '∞' : oldDist} 更短，因此更新 distance[${v}]=${newDist}，并记录前驱节点 pred[${v}]=${u}。这叫做"松弛操作"——就像拉紧一根松了的绳子。`,
            [8, 9, 10, 11, 12]));
        } else {
          this.steps.push(this._makeStep(StepType.RELAX_CHECK,
            `检查边(${u}→${v})：distance[${u}](${this.dist[u]})+${w}=${newDist} ≥ distance[${v}](${this.dist[v] === Infinity ? '∞' : this.dist[v]})，不更新`,
            { currentVertex: u, selectedVertex: -1, relaxEdge: { from: u, to: v, weight: w }, updated: false },
            `通过顶点 ${u} 到达顶点 ${v} 的距离 ${newDist} 不比当前记录更短，因此无需更新。这说明已有的路径已经是最优的（或尚未找到可达路径）。`,
            [8, 9, 10]));
        }
      }
    }

    // 重建路径
    this.shortestPaths = {};
    for (let v = 0; v < this.vertexCount; v++) {
      if (this.dist[v] !== Infinity) {
        const path = [];
        let cur = v;
        while (cur !== -1) {
          path.unshift(cur);
          cur = this.pred[cur];
        }
        this.shortestPaths[v] = path;
      }
    }

    const pathsDesc = Object.entries(this.shortestPaths)
      .map(([v, p]) => `${this.startVertex}→${v}: [${p.join('→')}] 距离=${this.dist[v]}`)
      .join('；');
    this.steps.push(this._makeStep(StepType.COMPLETE,
      `算法完成！最短路径：${pathsDesc || '无可达顶点'}`,
      { currentVertex: -1, selectedVertex: -1, relaxEdge: null, paths: { ...this.shortestPaths } },
      `Dijkstra算法执行完毕。通过贪心策略，每次确定一个距离最小的顶点，并松弛其出边，最终得到了从起点 ${this.startVertex} 到所有可达顶点的最短路径。不可达顶点的距离保持为∞。`,
      [13]));

    this.currentIdx = 0;
    return true;
  }

  _makeStep(type, desc, extraVD, explanation, activeLines = []) {
    const baseVD = {
      dist: [...this.dist],
      visited: [...this.visited],
      pred: [...this.pred],
      edgeList: [...this.edgeList],
      vertexCount: this.vertexCount,
      startVertex: this.startVertex
    };
    return new App.AlgorithmStep(this.steps.length, type, desc,
      { dist: [...this.dist], visited: [...this.visited], pred: [...this.pred] },
      Object.assign(baseVD, extraVD),
      explanation || '',
      activeLines);
  }

  get_pseudocode() {
    return [
      { indent: 0, text: 'function dijkstra(graph, start):' },
      { indent: 1, text: 'for each vertex v:' },
      { indent: 2, text: 'dist[v] = ∞, visited[v] = false' },
      { indent: 1, text: 'dist[start] = 0' },
      { indent: 1, text: 'for i = 1 to V:' },
      { indent: 2, text: 'u = min dist among unvisited' },
      { indent: 2, text: 'if u == -1: break' },
      { indent: 2, text: 'visited[u] = true' },
      { indent: 2, text: 'for each neighbor v of u:' },
      { indent: 3, text: 'newDist = dist[u] + w(u,v)' },
      { indent: 3, text: 'if newDist < dist[v]:' },
      { indent: 4, text: 'dist[v] = newDist' },
      { indent: 4, text: 'pred[v] = u' },
      { indent: 1, text: 'return dist, pred' }
    ];
  }

  step() {
    if (this.currentIdx < this.steps.length) {
      const s = this.steps[this.currentIdx];
      this.currentIdx++;
      return s;
    }
    return null;
  }

  step_back() {
    if (this.currentIdx > 1) {
      this.currentIdx--;
      return this.steps[this.currentIdx - 1];
    }
    return null;
  }

  get_current_state() {
    if (this.steps.length === 0) return null;
    return this.steps[Math.min(this.currentIdx, this.steps.length - 1)];
  }

  is_finished() { return this.currentIdx >= this.steps.length; }

  reset() {
    this.vertexCount = 0;
    this.startVertex = 0;
    this.edgeList = [];
    this.adj = {};
    this.dist = [];
    this.visited = [];
    this.pred = [];
    this.shortestPaths = {};
    this.steps = [];
    this.currentIdx = 0;
  }

  get_complexity() { return { time: 'O((V+E) log V)', space: 'O(V)' }; }

  get_test_cases() {
    return [
      new App.TestCase(13, 'dijkstra', '6顶点稀疏图', {
        vertex_count: 6,
        edges: '0,1,4;0,2,2;1,2,5;1,3,10;2,4,3;4,3,4;3,5,11;4,5,8',
        start_vertex: 0
      }, '0→2→4→3→5 距离17', '常规', '6个顶点的有向图最短路径'),
      new App.TestCase(14, 'dijkstra', '4顶点完全图', {
        vertex_count: 4,
        edges: '0,1,2;0,2,6;0,3,7;1,2,3;1,3,1;2,3,5',
        start_vertex: 0
      }, '最短路径', '常规', '4个顶点的稠密图'),
      new App.TestCase(15, 'dijkstra', '单边图', {
        vertex_count: 2,
        edges: '0,1,5',
        start_vertex: 0
      }, '0→1 距离5', '边界', '最小顶点数量的图'),
      new App.TestCase(16, 'dijkstra', '不同起始顶点', {
        vertex_count: 5,
        edges: '0,1,3;0,2,1;1,2,7;1,3,5;2,3,2;3,4,4;2,4,8',
        start_vertex: 2
      }, '以2为起点', '常规', '从顶点2开始的最短路径')
    ];
  }
};

/* ========== Dijkstra可视化渲染器 ========== */
App.DijkstraRenderer = class DijkstraRenderer {
  render(step, canvas) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const vd = step.visualData;
    if (!vd || vd.vertexCount === undefined) { this._drawEmpty(canvas); return; }

    const V = vd.vertexCount;
    const dist = vd.dist || [];
    const visited = vd.visited || [];
    const pred = vd.pred || [];
    const edgeList = vd.edgeList || [];
    const startV = vd.startVertex !== undefined ? vd.startVertex : 0;

    if (dist.length === 0) { this._drawEmpty(canvas); return; }

    // 圆形布局 — 左侧留空间给距离表
    const graphCX = W * 0.42;
    const graphCY = H / 2;
    const graphRadius = Math.min(190, H / 2 - 60);
    const positions = [];
    for (let i = 0; i < V; i++) {
      const angle = -Math.PI / 2 + (2 * Math.PI / V) * i;
      positions.push({
        x: graphCX + graphRadius * Math.cos(angle),
        y: graphCY + graphRadius * Math.sin(angle)
      });
    }

    // 构建路径边集合（用于所有步骤显示已确定的部分路径）
    const pathEdgeSet = new Set();
    const paths = vd.paths || {};

    if (step.stepType === StepType.COMPLETE && Object.keys(paths).length > 0) {
      Object.values(paths).forEach(p => {
        for (let i = 0; i < p.length - 1; i++) {
          pathEdgeSet.add(`${p[i]}-${p[i + 1]}`);
          pathEdgeSet.add(`${p[i + 1]}-${p[i]}`);
        }
      });
    } else {
      // 非完成步骤：从前驱数组构建当前已知的路径边
      for (let v = 0; v < V; v++) {
        if (pred[v] >= 0) {
          pathEdgeSet.add(`${pred[v]}-${v}`);
          pathEdgeSet.add(`${v}-${pred[v]}`);
        }
      }
    }

    // 绘制边
    const relaxEdge = vd.relaxEdge;
    const dedupEdges = new Set();
    edgeList.forEach(([f, t, w]) => {
      const key = `${Math.min(f, t)}-${Math.max(f, t)}`;
      if (dedupEdges.has(key)) return;
      dedupEdges.add(key);

      const p1 = positions[f], p2 = positions[t];
      if (!p1 || !p2) return;

      const isPathEdge = pathEdgeSet.has(`${f}-${t}`);
      const isRelaxing = relaxEdge && relaxEdge.from === f && relaxEdge.to === t;

      let strokeStyle = '#475569';
      let lineWidth = 1;
      let dash = [];

      if (isPathEdge && step.stepType === StepType.COMPLETE) {
        strokeStyle = '#22c55e';
        lineWidth = 3;
      } else if (isPathEdge) {
        strokeStyle = '#6366f1';
        lineWidth = 2;
        dash = [4, 3];
      } else if (isRelaxing && vd.updated) {
        strokeStyle = '#f59e0b';
        lineWidth = 3;
      } else if (isRelaxing) {
        strokeStyle = '#94a3b8';
        lineWidth = 2;
        dash = [5, 4];
      }

      ctx.setLineDash(dash);
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // 权重标签
      const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const ox = -12 * Math.sin(angle), oy = 12 * Math.cos(angle);

      // 标签背景
      const labelBgW = 26, labelBgH = 17;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(mx + ox - labelBgW / 2, my + oy - labelBgH / 2, labelBgW, labelBgH);

      ctx.fillStyle = isRelaxing ? '#f59e0b' : '#94a3b8';
      ctx.font = 'bold 11px "Consolas","Microsoft YaHei",sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(w, mx + ox, my + oy);
    });

    // 绘制顶点
    const currentV = vd.currentVertex;
    const selectedV = vd.selectedVertex;

    for (let i = 0; i < V; i++) {
      const { x, y } = positions[i];
      if (x === undefined || y === undefined) continue;
      const r = 24;

      // 确定颜色
      let color = '#475569'; // 默认：未访问
      if (i === startV && !visited[i]) color = '#22c55e';  // 起点未确定
      if (visited[i]) color = '#6366f1';  // 已确定
      if (i === currentV && !visited[i]) color = '#f59e0b'; // 当前选中
      if (i === selectedV) color = '#fbbf24'; // 刚被选中
      if (i === startV && visited[i]) color = '#4f46e5'; // 起点已确定
      if (dist[i] === Infinity) color = '#374151'; // 不可达

      // 光晕
      if (i === currentV || i === selectedV) {
        ctx.beginPath();
        ctx.arc(x, y, r + 7, 0, Math.PI * 2);
        ctx.fillStyle = i === currentV ? 'rgba(245,158,11,0.25)' : 'rgba(251,191,36,0.25)';
        ctx.fill();
      }

      // 节点主体
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(x - 4, y - 4, r * 0.15, x, y, r);
      grad.addColorStop(0, '#fff');
      grad.addColorStop(0.55, color);
      grad.addColorStop(1, this._darken(color, 0.35));
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 编号
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px "Microsoft YaHei",sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(i, x, y - 5);

      // distance
      const dVal = dist[i] === Infinity ? '∞' : String(dist[i]);
      ctx.fillStyle = dist[i] === Infinity ? '#64748b' : '#e2e8f0';
      ctx.font = 'bold 10px "Microsoft YaHei",sans-serif';
      ctx.fillText(dVal, x, y + 14);
    }

    // 起点星标
    const sp = positions[startV];
    if (sp) {
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 12px "Microsoft YaHei",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★起点', sp.x, sp.y - 35);
    }

    // 松弛边高亮提示
    if (relaxEdge) {
      const rp = positions[relaxEdge.to];
      if (rp && vd.updated) {
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 12px "Microsoft YaHei",sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('← 距离更新', rp.x + 55, rp.y - 10);
      }
    }

    // 右侧距离表
    this._drawDistTable(ctx, dist, visited, pred, V, W, H, startV, vd);
  }

  _drawDistTable(ctx, dist, visited, pred, V, W, H, startV, vd) {
    const tx = W - 210;
    const ty = 20;
    const rowH = 26;
    const panelW = 200;
    const panelH = V * rowH + 65;

    // 面板背景
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    this._roundRectPath(ctx, tx - 10, ty - 5, panelW, panelH, 8);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    this._roundRectPath(ctx, tx - 10, ty - 5, panelW, panelH, 8);
    ctx.stroke();

    // 标题
    ctx.fillStyle = '#818cf8';
    ctx.font = 'bold 12px "Microsoft YaHei",sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('顶点 距离      前驱  状态', tx, ty + 14);

    // 分隔线
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tx - 8, ty + 22);
    ctx.lineTo(tx + panelW - 18, ty + 22);
    ctx.stroke();

    for (let i = 0; i < V; i++) {
      const rowY = ty + 36 + i * rowH;

      // 交替行背景
      if (i % 2 === 0) {
        ctx.fillStyle = 'rgba(99, 102, 241, 0.05)';
        ctx.fillRect(tx - 8, rowY - 11, panelW - 6, rowH);
      }

      // 当前行的顶点高亮
      const isCurrentRow = vd.currentVertex === i;
      if (isCurrentRow) {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.1)';
        ctx.fillRect(tx - 8, rowY - 11, panelW - 6, rowH);
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(tx - 8, rowY - 11, panelW - 6, rowH);
      }

      const dVal = dist[i] === Infinity ? '∞' : String(dist[i]);
      const pVal = pred[i] >= 0 ? String(pred[i]) : '—';
      const status = visited[i] ? '已确定' : (dist[i] === Infinity ? '不可达' : '待确定');
      const marker = i === startV ? '★' : '';

      // 颜色
      let baseColor = '#94a3b8';
      if (visited[i]) baseColor = '#22c55e';
      else if (dist[i] === Infinity) baseColor = '#64748b';
      if (isCurrentRow) baseColor = '#fbbf24';

      ctx.fillStyle = baseColor;
      ctx.font = 'bold 11px "Microsoft YaHei",sans-serif';
      ctx.fillText(i + marker, tx, rowY + 2);

      ctx.fillStyle = visited[i] ? '#e2e8f0' : '#94a3b8';
      ctx.font = '11px "Consolas","Microsoft YaHei",monospace';
      ctx.fillText(dVal, tx + 42, rowY + 2);

      ctx.fillStyle = pred[i] >= 0 ? '#cbd5e1' : '#64748b';
      ctx.font = '11px "Microsoft YaHei",sans-serif';
      ctx.fillText(pVal, tx + 92, rowY + 2);

      ctx.fillStyle = status === '已确定' ? '#22c55e' : (status === '不可达' ? '#64748b' : '#f59e0b');
      ctx.font = '10px "Microsoft YaHei",sans-serif';
      ctx.fillText(status, tx + 136, rowY + 2);
    }

    // 图例（面板下方）
    const ly = ty + panelH - 24;
    const legend = [
      { color: '#22c55e', label: '起点' },
      { color: '#6366f1', label: '已确定' },
      { color: '#f59e0b', label: '当前' },
      { color: '#475569', label: '未访问' },
      { color: '#374151', label: '不可达' }
    ];
    legend.forEach((item, idx) => {
      const lx = tx + idx * 40;
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(lx + 5, ly + 5, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px "Microsoft YaHei",sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, lx + 13, ly + 9);
    });
  }

  _roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  renderTransition(fromStep, toStep, canvas, progress) {
    this.render(toStep, canvas);
  }

  clear(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this._drawEmpty(canvas);
  }

  _drawEmpty(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px "Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('选择算法并设置参数后点击"开始"或"单步执行"', canvas.width / 2, canvas.height / 2);
  }

  _darken(hex, amt) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.floor(r * (1 - amt))},${Math.floor(g * (1 - amt))},${Math.floor(b * (1 - amt))})`;
  }
};
