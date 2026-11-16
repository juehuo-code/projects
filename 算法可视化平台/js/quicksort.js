/**
 * 快速排序引擎 — 分治排序算法的逐步执行
 * 可视化表现：柱状图 + 颜色高亮
 * 设计：initialize() 预计算所有步骤，step() 逐步返回
 */
var App = window.App || {};

App.QuickSortEngine = class QuickSortEngine {
  constructor() { this.reset(); }

  initialize(params) {
    this.reset();
    const arrStr = (params.arr || '').trim();
    this.originalArr = arrStr.split(',').map(s => Number(s.trim()));
    this.arr = [...this.originalArr];
    this.totalComparisons = 0;
    this.totalSwaps = 0;

    this.steps = [];
    this.steps.push(this._makeStep(StepType.INIT,
      '初始状态：待排序数组 [' + this.arr.join(', ') + ']', {}, [],
      '快速排序采用分治策略：选择一个基准元素（pivot），将数组分成"小于等于基准"和"大于基准"两部分，然后递归地对两部分排序。',
      [0]));

    const stack = [[0, this.arr.length - 1]];
    let stepId = 0;

    while (stack.length > 0) {
      const [low, high] = stack.pop();
      if (low >= high) continue;

      const pivotIndex = high;
      const pivot = this.arr[high];
      stepId++;
      const partitionLow = low, partitionHigh = high;

      this.steps.push(this._makeStep(StepType.SELECT_PIVOT,
        `第${stepId}步：选择基准 arr[${pivotIndex}]=${pivot}，对区间[${low}, ${high}]分区`,
        { pivotIndex, partitionLow, partitionHigh },
        [{ idx: pivotIndex, color: '#FF6B35' }],
        `选择当前区间最后一个元素 ${pivot} 作为基准（pivot）。一种常用的选择策略是取区间末尾元素。分区过程会将比基准小的元素移到左边，大的移到右边。`,
        [2]));

      let i = low - 1;
      for (let j = low; j < high; j++) {
        stepId++;
        this.totalComparisons++;
        const cmpResult = this.arr[j] <= pivot;
        const highlights = [
          { idx: j, color: '#FFD700' },
          { idx: pivotIndex, color: '#FF6B35' }
        ];
        this.steps.push(this._makeStep(StepType.COMPARE,
          `第${stepId}步：比较 arr[${j}]=${this.arr[j]} 与 pivot=${pivot}，${this.arr[j]} ${cmpResult ? '≤' : '>'} ${pivot}`,
          { pivotIndex, leftIdx: i, rightIdx: j, partitionLow, partitionHigh },
          highlights,
          `用指针j从左到右扫描区间，将每个元素与基准比较。${cmpResult ? `因为 ${this.arr[j]} ≤ ${pivot}，所以这个元素应该放在基准的左边。i指针右移并交换。` : `因为 ${this.arr[j]} > ${pivot}，所以这个元素在右边是正确的位置，不需要移动。`}`,
          [4, 5]));

        if (cmpResult) {
          i++;
          if (i !== j) {
            [this.arr[i], this.arr[j]] = [this.arr[j], this.arr[i]];
            this.totalSwaps++;
            stepId++;
            this.steps.push(this._makeStep(StepType.SWAP,
              `第${stepId}步：交换 arr[${i}] 与 arr[${j}]，当前数组：[${this.arr.join(', ')}]`,
              { pivotIndex, leftIdx: i, rightIdx: j, partitionLow, partitionHigh },
              [{ idx: i, color: '#FF4444' }, { idx: j, color: '#FF4444' }],
              `将小于等于基准的元素 ${this.arr[i]}（原在位置j）与位置i的元素交换，确保所有小于等于基准的元素都在i的左边。`,
              [6, 7]));
          }
        }
      }

      const finalIdx = i + 1;
      if (finalIdx !== high) {
        [this.arr[finalIdx], this.arr[high]] = [this.arr[high], this.arr[finalIdx]];
        this.totalSwaps++;
      }
      stepId++;
      this.steps.push(this._makeStep(StepType.PIVOT_PLACED,
        `第${stepId}步：分区完成，pivot=${pivot} 归位至 arr[${finalIdx}]，左侧≤pivot，右侧>pivot`,
        { pivotIndex: -1, placedIndex: finalIdx, partitionLow, partitionHigh },
        [{ idx: finalIdx, color: '#4CAF50' }],
        `基准 ${pivot} 已经到达它在最终有序数组中的正确位置 ${finalIdx}。它左边的所有元素都小于等于它，右边的所有元素都大于它。这一轮分区完成后，基准的位置就不会再变了。`,
        [8, 9]));

      if (finalIdx + 1 <= high) stack.push([finalIdx + 1, high]);
      if (low <= finalIdx - 1) stack.push([low, finalIdx - 1]);
    }

    this.steps.push(this._makeStep(StepType.COMPLETE,
      `排序完成！最终有序数组：[${this.arr.join(', ')}]，共比较${this.totalComparisons}次，交换${this.totalSwaps}次`,
      {}, this.arr.map((_, i) => ({ idx: i, color: '#4CAF50' })),
      `快速排序的平均时间复杂度为 O(n log n)，但在最坏情况（如已排序或逆序数组）下会退化到 O(n²)。空间复杂度为 O(log n)（递归栈深度）。它是一种不稳定的排序算法。`,
      []));

    this.currentIdx = 0;
    return true;
  }

  _makeStep(type, desc, extraVD, highlights, explanation, activeLines = []) {
    return new App.AlgorithmStep(this.steps.length, type, desc,
      { arr: [...this.arr], comparisons: this.totalComparisons, swaps: this.totalSwaps },
      Object.assign({ arr: [...this.arr], highlights }, extraVD),
      explanation || '',
      activeLines);
  }

  get_pseudocode() {
    return [
      { indent: 0, text: 'function quickSort(arr, low, high):' },
      { indent: 1, text: 'if low >= high: return' },
      { indent: 1, text: 'pivot = arr[high]' },
      { indent: 1, text: 'i = low - 1' },
      { indent: 1, text: 'for j = low to high-1:' },
      { indent: 2, text: 'if arr[j] <= pivot:' },
      { indent: 3, text: 'i = i + 1' },
      { indent: 3, text: 'swap(arr[i], arr[j])' },
      { indent: 1, text: 'swap(arr[i+1], arr[high])' },
      { indent: 1, text: 'pivotIdx = i + 1' },
      { indent: 1, text: 'quickSort(arr, low, pivotIdx-1)' },
      { indent: 1, text: 'quickSort(arr, pivotIdx+1, high)' }
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
      const step = this.steps[this.currentIdx - 1];
      if (step && step.stateSnapshot) {
        this.arr = [...step.stateSnapshot.arr];
        this.totalComparisons = step.stateSnapshot.comparisons || 0;
        this.totalSwaps = step.stateSnapshot.swaps || 0;
      }
      return step;
    }
    return null;
  }

  get_current_state() {
    if (this.steps.length === 0) return null;
    return this.steps[Math.min(this.currentIdx, this.steps.length - 1)];
  }

  is_finished() { return this.currentIdx >= this.steps.length; }

  reset() {
    this.arr = [];
    this.originalArr = [];
    this.steps = [];
    this.currentIdx = 0;
    this.totalComparisons = 0;
    this.totalSwaps = 0;
  }

  get_complexity() {
    return { time: '平均 O(n log n)，最坏 O(n²)', space: 'O(log n)' };
  }

  get_test_cases() {
    return [
      new App.TestCase(1, 'quicksort', '随机数组（8个元素）', { arr: '42,15,73,28,61,39,84,55' }, '[15,28,39,42,55,61,73,84]', '系统预设', '8个随机元素的排序'),
      new App.TestCase(2, 'quicksort', '逆序数组（最坏情况）', { arr: '9,8,7,6,5,4,3,2,1' }, '[1,2,3,4,5,6,7,8,9]', '系统预设', '完全逆序，快速排序最坏情况 O(n²)'),
      new App.TestCase(3, 'quicksort', '已有序数组', { arr: '1,2,3,4,5,6,7,8' }, '[1,2,3,4,5,6,7,8]', '系统预设', '已经有序的情况'),
      new App.TestCase(4, 'quicksort', '含重复元素', { arr: '5,3,5,1,3,5' }, '[1,3,3,5,5,5]', '系统预设', '包含重复元素')
    ];
  }
};

/* ========== 快速排序可视化渲染器 ========== */
App.QuickSortRenderer = class QuickSortRenderer {
  constructor() { this._engine = null; }

  render(step, canvas) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const arr = (step.visualData && step.visualData.arr) || (step.stateSnapshot && step.stateSnapshot.arr) || [];
    if (arr.length === 0) { this._drawEmpty(canvas); return; }

    const highlights = step.visualData.highlights || [];
    const hMap = {};
    highlights.forEach(h => { hMap[h.idx] = h.color; });

    const margin = 60;
    const barAreaTop = 50, barAreaBottom = H - 55, barAreaH = barAreaBottom - barAreaTop;
    const barGap = 8;
    const barW = Math.min(60, Math.max(20, (W - margin * 2) / arr.length - barGap));
    const totalW = arr.length * (barW + barGap);
    const startX = Math.max(margin, (W - totalW) / 2);
    const maxVal = Math.max(1, ...arr);

    const vd = step.visualData;
    if (vd.partitionLow !== undefined && vd.partitionHigh !== undefined) {
      const x1 = startX + vd.partitionLow * (barW + barGap) - 4;
      const x2 = startX + vd.partitionHigh * (barW + barGap) + barW + 4;
      ctx.fillStyle = 'rgba(99,102,241,0.08)';
      ctx.fillRect(x1, barAreaTop - 5, x2 - x1, barAreaH + 10);
      ctx.strokeStyle = 'rgba(99,102,241,0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(x1, barAreaTop - 5, x2 - x1, barAreaH + 10);
      ctx.setLineDash([]);
    }

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(startX - 10, barAreaBottom);
    ctx.lineTo(startX + totalW + 10, barAreaBottom);
    ctx.stroke();

    arr.forEach((val, i) => {
      const x = startX + i * (barW + barGap);
      const barH = Math.max(4, (val / maxVal) * barAreaH);
      const y = barAreaBottom - barH;

      let color = '#6366f1';
      if (hMap[i]) color = hMap[i];
      else if (vd.placedIndex !== undefined && i === vd.placedIndex) color = '#22c55e';

      ctx.shadowColor = color;
      ctx.shadowBlur = 6;

      const grad = ctx.createLinearGradient(x, y, x, barAreaBottom);
      grad.addColorStop(0, color);
      grad.addColorStop(1, this._darken(color, 0.25));
      ctx.fillStyle = grad;
      this._roundRect(ctx, x, y, barW, barH, 4);
      ctx.fill();

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      ctx.strokeStyle = this._darken(color, 0.45);
      ctx.lineWidth = 1;
      this._roundRect(ctx, x, y, barW, barH, 4);
      ctx.stroke();

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 11px "Microsoft YaHei",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(val, x + barW / 2, y - 7);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px "Microsoft YaHei",sans-serif';
      ctx.fillText(i, x + barW / 2, barAreaBottom + 16);
    });

    if (vd.pivotIndex >= 0) {
      const px = startX + vd.pivotIndex * (barW + barGap) + barW / 2;
      const py = Math.max(barAreaTop, barAreaBottom - ((arr[vd.pivotIndex] / maxVal) * barAreaH) - 20);
      ctx.fillStyle = '#FF6B35';
      ctx.font = 'bold 12px "Microsoft YaHei",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('▲ pivot', px, py);
    }

    if (vd.leftIdx >= 0) {
      const lx = startX + vd.leftIdx * (barW + barGap) + barW / 2;
      ctx.fillStyle = '#FF6B35';
      ctx.font = 'bold 12px "Microsoft YaHei",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('i', lx, barAreaBottom + 32);
    }
    if (vd.rightIdx >= 0) {
      const rx = startX + vd.rightIdx * (barW + barGap) + barW / 2;
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 12px "Microsoft YaHei",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('j', rx, barAreaBottom + 32);
    }
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
    ctx.font = '15px "Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('选择算法并设置参数后点击"开始"或"单步执行"', canvas.width / 2, canvas.height / 2);
  }

  _roundRect(ctx, x, y, w, h, r) {
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

  _darken(hex, amt) {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return `rgb(${Math.floor(r*(1-amt))},${Math.floor(g*(1-amt))},${Math.floor(b*(1-amt))})`;
  }
};
