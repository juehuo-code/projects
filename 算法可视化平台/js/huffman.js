/**
 * 哈夫曼树引擎 — 贪心算法构造最优二叉树
 * 可视化表现：森林节点 → 完整二叉树 + 编码表
 */
var App = window.App || {};

App.HuffmanEngine = class HuffmanEngine {
  constructor() { this.reset(); }

  initialize(params) {
    this.reset();
    const chars = (params.chars || '').trim().split('');
    const weights = (params.weights || '').trim().split(',').map(Number);

    if (chars.length === 0 || weights.length === 0 || chars.length !== weights.length) {
      return false;
    }

    this.chars = chars;
    this.weights = weights;
    this.steps = [];

    // 创建叶子节点
    this.nodes = chars.map((ch, i) => ({
      char: ch, weight: weights[i],
      left: null, right: null, id: i, isLeaf: true
    }));

    // 初始森林 — 必须把 allNodes 放入 visualData
    const initNodes = this.nodes.map(n => ({ id: n.id, char: n.char, weight: n.weight, isLeaf: true }));
    this.steps.push(this._makeStep(StepType.INIT,
      `初始状态：创建 ${chars.length} 个叶子节点，字符=[${chars.join(', ')}]，权值=[${weights.join(', ')}]`,
      { selectedIds: [], allNodes: initNodes, treeRoot: null },
      '哈夫曼树是一种最优二叉树（带权路径长度最短），用于数据压缩。构造策略（贪心）：每次选择权值最小的两个节点合并成一个新节点，新节点的权值是两者之和。重复直到只剩一个根节点。左边分支编码为0，右边分支编码为1。',
      [1]));

    // 构建最小堆 — 对原始节点做深拷贝
    const heap = this.nodes.map(n => ({
      char: n.char, weight: n.weight,
      left: null, right: null, id: n.id, isLeaf: true
    }));
    let nextId = chars.length;
    let stepCount = 0;

    while (heap.length > 1) {
      // 排序找最小两个
      heap.sort((a, b) => a.weight - b.weight || a.id - b.id); // 权值相同时按id稳定排序
      const left = heap.shift();
      const right = heap.shift();

      stepCount++;

      // 选中步骤 — 高亮被选中的两个节点
      const beforeMergeNodes = heap.map(n => ({ id: n.id, char: n.char, weight: n.weight, isLeaf: n.isLeaf || false }));
      // 把即将被合并的两个节点也加入展示列表（它们已从heap移出，但需要展示）
      beforeMergeNodes.push({ id: left.id, char: left.char, weight: left.weight, isLeaf: left.isLeaf || false, isSelected: true });
      beforeMergeNodes.push({ id: right.id, char: right.char, weight: right.weight, isLeaf: right.isLeaf || false, isSelected: true });

      this.steps.push(this._makeStep(StepType.SELECT_MIN_TWO,
        `第 ${stepCount} 步：选择权值最小的两个节点——"${left.char || '(内部)'}" 权值=${left.weight}，"${right.char || '(内部)'}" 权值=${right.weight}`,
        { selectedIds: [left.id, right.id], allNodes: beforeMergeNodes, treeRoot: null },
        `在所有尚未合并的节点中，选出权值最小的两个节点。这是哈夫曼算法贪心策略的核心：优先合并频率低的字符，让它们离根节点更远，从而获得更长的编码；频率高的字符离根节点近，编码更短。`,
        [3, 4, 5]));

      // 合并
      const newNode = {
        char: '', weight: left.weight + right.weight,
        left: left, right: right, id: nextId++, isLeaf: false
      };
      heap.push(newNode);

      const afterMergeNodes = heap.map(n => ({ id: n.id, char: n.char, weight: n.weight, isLeaf: n.isLeaf || false }));
      this.steps.push(this._makeStep(StepType.MERGE_NODE,
        `第 ${stepCount} 步：合并生成新内部节点，权值=${newNode.weight}（=${left.weight}+${right.weight}），剩余 ${heap.length} 个节点`,
        { selectedIds: [left.id, right.id], newNodeId: newNode.id, allNodes: afterMergeNodes, treeRoot: null },
        `将选出的两个最小权值节点合并为一个新的内部节点（权值=${left.weight}+${right.weight}）。较小权值的节点作为左孩子（编码'0'），较大权值的节点作为右孩子（编码'1'）。新节点将参与下一轮的合并。`,
        [6, 7, 8]));
    }

    this.root = heap[0];

    // 生成哈夫曼编码
    this.codes = {};
    this._genCodes(this.root, '');

    // 编码表
    const codeEntries = Object.entries(this.codes)
      .sort((a, b) => a[0].localeCompare(b[0]));
    const codeDesc = codeEntries.map(([k, v]) => `${k}:${v}`).join(', ');

    this.steps.push(this._makeStep(StepType.COMPLETE,
      `哈夫曼树构造完成！WPL=${this._calcWPL()}，编码：[${codeDesc}]`,
      { selectedIds: [], allNodes: [], treeRoot: this._cloneTree(this.root), codes: { ...this.codes } },
      `哈夫曼树构造完毕。每个字符的编码由从根节点到该字符叶子节点的路径决定：走左边记0，走右边记1。这样高频字符路径短（编码短），低频字符路径长（编码长），实现了最优前缀编码。`,
      [9, 10]));
    this.currentIdx = 0;
    return true;
  }

  _cloneTree(node) {
    if (!node) return null;
    return {
      id: node.id, char: node.char, weight: node.weight, isLeaf: node.isLeaf || !!node.char,
      left: this._cloneTree(node.left),
      right: this._cloneTree(node.right)
    };
  }

  _genCodes(node, code) {
    if (!node) return;
    if (node.char && node.isLeaf !== false) {
      // 叶子节点：如果整棵树只有一个节点（既是根也是叶），编码为'0'
      this.codes[node.char] = code || '0';
      return;
    }
    this._genCodes(node.left, code + '0');
    this._genCodes(node.right, code + '1');
  }

  _calcWPL() {
    const calc = (node, depth) => {
      if (!node) return 0;
      if (node.char && node.isLeaf !== false) return node.weight * depth;
      return calc(node.left, depth + 1) + calc(node.right, depth + 1);
    };
    return calc(this.root, 0);
  }

  _makeStep(type, desc, extraVD, explanation, activeLines = []) {
    return new App.AlgorithmStep(this.steps.length, type, desc,
      { codes: { ...this.codes } },
      Object.assign({ codes: { ...this.codes } }, extraVD),
      explanation || '',
      activeLines);
  }

  get_pseudocode() {
    return [
      { indent: 0, text: 'function huffman(chars, weights):' },
      { indent: 1, text: 'create leaf nodes for each char' },
      { indent: 1, text: 'build min-heap from nodes' },
      { indent: 1, text: 'while heap.size > 1:' },
      { indent: 2, text: 'left = heap.extractMin()' },
      { indent: 2, text: 'right = heap.extractMin()' },
      { indent: 2, text: 'parent = new Node(left.w + right.w)' },
      { indent: 2, text: 'parent.left = left, parent.right = right' },
      { indent: 2, text: 'heap.insert(parent)' },
      { indent: 1, text: 'root = heap.extractMin()' },
      { indent: 1, text: 'generate codes by traversing root' }
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
    this.chars = [];
    this.weights = [];
    this.nodes = [];
    this.root = null;
    this.codes = {};
    this.steps = [];
    this.currentIdx = 0;
  }

  get_complexity() { return { time: 'O(n log n)', space: 'O(n)' }; }

  get_test_cases() {
    return [
      new App.TestCase(9, 'huffman', '标准示例', { chars: 'ABCDE', weights: '5,2,8,3,7' }, 'WPL=55', '常规', '5个字符不同权值的哈夫曼编码'),
      new App.TestCase(10, 'huffman', '2个字符', { chars: 'AB', weights: '1,2' }, 'A:0 B:1', '边界', '最少字符数边界情况'),
      new App.TestCase(11, 'huffman', '等权值', { chars: 'ABCD', weights: '5,5,5,5' }, '等长编码', '边界', '所有权值相同的情况'),
      new App.TestCase(12, 'huffman', '6个字符', { chars: 'ABCDEF', weights: '8,3,12,6,2,15' }, 'WPL', '常规', '6个字符不同权值的构造')
    ];
  }
};

/* ========== 哈夫曼树可视化渲染器 ========== */
App.HuffmanRenderer = class HuffmanRenderer {
  render(step, canvas) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const vd = step.visualData;
    if (!vd) { this._drawEmpty(canvas); return; }

    // 完成状态：显示完整树 + 编码表
    if (step.stepType === StepType.COMPLETE && vd.treeRoot) {
      this._drawTree(ctx, vd.treeRoot, W, H);
      this._drawCodeTable(ctx, vd.codes || {}, W, H);
      return;
    }

    // 构造过程：显示森林节点（网格布局）
    if (vd.allNodes && vd.allNodes.length > 0) {
      this._drawForest(ctx, vd, W, H);
      return;
    }

    // 初始状态
    if (step.stepType === StepType.INIT) {
      this._drawForest(ctx, vd, W, H);
      return;
    }

    this._drawEmpty(canvas);
  }

  _drawForest(ctx, vd, W, H) {
    const nodes = vd.allNodes || [];
    const selectedIds = vd.selectedIds || [];
    const newNodeId = vd.newNodeId;

    if (nodes.length === 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '15px "Microsoft YaHei",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('正在构造哈夫曼树…', W / 2, H / 3);
      return;
    }

    // 将选中节点排在最前面以便视觉上突出
    const sortedNodes = [...nodes].sort((a, b) => {
      const aSel = selectedIds.includes(a.id) ? -1 : 0;
      const bSel = selectedIds.includes(b.id) ? -1 : 0;
      return aSel - bSel;
    });

    const cols = Math.min(6, sortedNodes.length);
    const gapX = Math.min(130, (W - 60) / (cols + 1));
    const gapY = 85;
    const startY = 55;

    sortedNodes.forEach((n, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = W / 2 - (cols - 1) * gapX / 2 + col * gapX;
      const y = startY + row * gapY;
      const r = 30;

      const isSelected = selectedIds.includes(n.id);
      const isNew = n.id === newNodeId;

      let fillColor = n.isLeaf ? '#6366f1' : '#94a3b8';
      if (isSelected) fillColor = '#f59e0b';
      if (isNew) fillColor = '#22c55e';

      // 光晕 (选中节点)
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(x, y, r + 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(245,158,11,0.25)';
        ctx.fill();
      }

      // 节点圆
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(x - 3, y - 3, r * 0.15, x, y, r);
      grad.addColorStop(0, '#fff');
      grad.addColorStop(0.55, fillColor);
      grad.addColorStop(1, this._darken(fillColor, 0.3));
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#d97706' : '#475569';
      ctx.lineWidth = isSelected || isNew ? 2.5 : 1.5;
      ctx.stroke();

      // 文字
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px "Microsoft YaHei",sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = n.char || n.weight;
      ctx.fillText(label, x, y - 4);

      // 权值
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '11px "Microsoft YaHei",sans-serif';
      ctx.fillText('w=' + n.weight, x, y + 16);
    });

    // 图例
    const lx = 15;
    const ly = H - 40;
    const legend = [
      { color: '#6366f1', label: '叶子节点' },
      { color: '#94a3b8', label: '内部节点' },
      { color: '#f59e0b', label: '当前选中' },
      { color: '#22c55e', label: '新合并' }
    ];
    legend.forEach((item, idx) => {
      const x = lx + idx * 105;
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(x + 7, ly + 7, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px "Microsoft YaHei",sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, x + 18, ly + 11);
    });

    // 步骤提示
    if (selectedIds.length === 2 && !newNodeId) {
      ctx.fillStyle = '#f59e0b';
      ctx.font = '13px "Microsoft YaHei",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('黄色节点即将合并', W / 2, H - 16);
    }
  }

  _drawTree(ctx, root, W, H) {
    if (!root) return;

    // 计算每个节点的层级和位置
    const maxDepth = this._treeDepth(root);
    const dy = Math.min(75, (H - 70) / Math.max(1, maxDepth));
    const leafGap = Math.min(50, (W - 120) / Math.max(1, this._leafCount(root)));

    const positions = {};
    let leafX = 60;

    const layout = (node, depth) => {
      if (!node) return;
      if (node.isLeaf || (!node.left && !node.right)) {
        positions[node.id] = { x: leafX, y: 40 + depth * dy };
        leafX += leafGap;
      } else {
        layout(node.left, depth + 1);
        layout(node.right, depth + 1);
        const lx = positions[node.left ? node.left.id : null] ? positions[node.left.id].x : leafX;
        const rx = positions[node.right ? node.right.id : null] ? positions[node.right.id].x : leafX;
        positions[node.id] = { x: (lx + rx) / 2, y: 40 + depth * dy };
      }
    };
    layout(root, 0);

    // 绘制连线（先画线再画节点，避免线覆盖节点）
    const drawEdges = (node) => {
      if (!node) return;
      const p = positions[node.id];
      if (!p) return;
      if (node.left && positions[node.left.id]) {
        const lc = positions[node.left.id];
        ctx.beginPath();
        ctx.moveTo(p.x, p.y + 20);
        ctx.lineTo(lc.x, lc.y - 20);
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // 编码标签 "0"
        const mx = (p.x + lc.x) / 2 - 14;
        const my = (p.y + lc.y) / 2 - 4;
        ctx.fillStyle = '#818cf8';
        ctx.font = 'bold 13px "Consolas","Microsoft YaHei",sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('0', mx, my);
        drawEdges(node.left);
      }
      if (node.right && positions[node.right.id]) {
        const rc = positions[node.right.id];
        ctx.beginPath();
        ctx.moveTo(p.x, p.y + 20);
        ctx.lineTo(rc.x, rc.y - 20);
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        const mx = (p.x + rc.x) / 2 + 14;
        const my = (p.y + rc.y) / 2 - 4;
        ctx.fillStyle = '#06b6d4';
        ctx.font = 'bold 13px "Consolas","Microsoft YaHei",sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('1', mx, my);
        drawEdges(node.right);
      }
    };
    drawEdges(root);

    // 绘制节点
    const drawNode = (node) => {
      if (!node) return;
      const p = positions[node.id];
      if (!p) return;
      const r = 22;
      const isLeaf = node.isLeaf || !!node.char;

      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(p.x - 3, p.y - 3, r * 0.15, p.x, p.y, r);
      grad.addColorStop(0, '#fff');
      grad.addColorStop(0.5, isLeaf ? '#6366f1' : '#64748b');
      grad.addColorStop(1, isLeaf ? '#4338ca' : '#334155');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px "Microsoft YaHei",sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (isLeaf) {
        ctx.fillText(node.char, p.x, p.y - 5);
        ctx.font = '10px "Microsoft YaHei",sans-serif';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(node.weight, p.x, p.y + 10);
      } else {
        ctx.fillText(node.weight, p.x, p.y + 1);
      }

      drawNode(node.left);
      drawNode(node.right);
    };
    drawNode(root);

    // 分支说明
    ctx.fillStyle = '#818cf8';
    ctx.font = '11px "Microsoft YaHei",sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('左=0', 10, H - 12);
    ctx.fillStyle = '#06b6d4';
    ctx.fillText('右=1', 55, H - 12);
  }

  _treeDepth(node) {
    if (!node) return -1;
    return 1 + Math.max(this._treeDepth(node.left), this._treeDepth(node.right));
  }

  _leafCount(node) {
    if (!node) return 0;
    if (node.isLeaf || (!node.left && !node.right)) return 1;
    return this._leafCount(node.left) + this._leafCount(node.right);
  }

  _drawCodeTable(ctx, codes, W, H) {
    const entries = Object.entries(codes).sort((a, b) => a[0].localeCompare(b[0]));
    if (entries.length === 0) return;

    // 根据编码长度自适应宽度
    const maxCodeLen = Math.max(...entries.map(([_, code]) => code.length));
    const tableW = Math.max(150, 80 + maxCodeLen * 12);
    const startX = W - tableW - 20;
    const startY = 30;
    const rowH = 26;
    const tableH = entries.length * rowH + 40;

    // 背景
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    this._roundRectPath(ctx, startX - 10, startY - 5, tableW + 20, tableH, 8);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    this._roundRectPath(ctx, startX - 10, startY - 5, tableW + 20, tableH, 8);
    ctx.stroke();

    // 标题
    ctx.fillStyle = '#818cf8';
    ctx.font = 'bold 13px "Microsoft YaHei",sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('哈夫曼编码表', startX, startY + 14);

    // 表头分隔线
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX - 5, startY + 22);
    ctx.lineTo(startX + tableW + 5, startY + 22);
    ctx.stroke();

    // 编码行
    entries.forEach(([ch, code], i) => {
      const rowY = startY + 35 + i * rowH;
      // 交替行背景
      if (i % 2 === 0) {
        ctx.fillStyle = 'rgba(99, 102, 241, 0.06)';
        ctx.fillRect(startX - 8, rowY - 10, tableW + 16, rowH);
      }
      // 字符
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 13px "Microsoft YaHei",sans-serif';
      ctx.fillText(ch, startX + 4, rowY + 2);
      // 分隔
      ctx.fillStyle = '#475569';
      ctx.fillText(':', startX + 24, rowY + 2);
      // 编码
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '13px "Consolas","Microsoft YaHei",monospace';
      ctx.fillText(code, startX + 36, rowY + 2);
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
