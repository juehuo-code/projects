/**
 * 冒泡排序 — 引擎与渲染器
 */
var App = window.App || {};

/* ========== BubbleEngine ========== */
App.BubbleEngine = class BubbleEngine {
  constructor() {
    this._steps = [];
    this._currentStep = 0;
    this._arr = [];
    this._comparisons = 0;
    this._swaps = 0;
  }

  initialize(params) {
    this._arr = (params.arr || '').split(',').map(s => Number(s.trim()));
    this._steps = [];
    this._currentStep = 0;
    this._comparisons = 0;
    this._swaps = 0;

    const n = this._arr.length;
    const arr = [...this._arr];
    let sid = 0;

    this._steps.push(new App.AlgorithmStep(
      sid++, StepType.INIT,
      `初始化：待排序数组 [${arr.join(', ')}]，共 ${n} 个元素`,
      { arr: [...arr], comparisons: 0, swaps: 0, i: -1, j: -1, sortedFrom: n },
      { arr: [...arr], highlight: [], sorted: [], comparing: [] },
      `冒泡排序的基本思想：重复遍历数组，依次比较相邻的两个元素，如果顺序不对就交换它们。每完成一轮遍历，最大的未排序元素就会"冒泡"到它最终的位置。`,
      [0]
    ));

    for (let i = 0; i < n - 1; i++) {
      let swapped = false;
      this._steps.push(new App.AlgorithmStep(
        sid++, StepType.BUBBLE_COMPARE,
        `第 ${i + 1} 轮：从位置0开始，将最大元素"冒泡"到位置 ${n - 1 - i}`,
        { arr: [...arr], comparisons: this._comparisons, swaps: this._swaps, i: i, j: 0, sortedFrom: n - i },
        { arr: [...arr], highlight: [], sorted: Array.from({length: n}, (_, idx) => idx >= n - i), passStart: i },
        `第 ${i + 1} 轮冒泡开始。前 ${i} 轮已经将最大的 ${i} 个元素放到了数组末尾的正确位置（已排序区域）。本轮将找出剩余元素中的最大值并放到位置 ${n - 1 - i}。`,
        [1, 2]
      ));

      for (let j = 0; j < n - 1 - i; j++) {
        this._comparisons++;
        this._steps.push(new App.AlgorithmStep(
          sid++, StepType.BUBBLE_COMPARE,
          `比较 arr[${j}]=${arr[j]} 和 arr[${j + 1}]=${arr[j + 1]}` + (arr[j] > arr[j + 1] ? ' → 需要交换' : ' → 无需交换'),
          { arr: [...arr], comparisons: this._comparisons, swaps: this._swaps, i: i, j: j, sortedFrom: n - i },
          { arr: [...arr], highlight: [], sorted: Array.from({length: n}, (_, idx) => idx >= n - i), comparing: [j, j + 1] },
          `依次比较相邻的两个元素 arr[${j}]=${arr[j]} 和 arr[${j + 1}]=${arr[j + 1]}。${arr[j] > arr[j + 1] ? `因为 ${arr[j]} > ${arr[j + 1]}，不符合升序要求，所以需要交换这两个元素的位置。` : `因为 ${arr[j]} ≤ ${arr[j + 1]}，已经满足升序要求，不需要交换。`}`,
          [3, 4]
        ));

        if (arr[j] > arr[j + 1]) {
          [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
          this._swaps++;
          swapped = true;
          this._steps.push(new App.AlgorithmStep(
            sid++, StepType.BUBBLE_SWAP,
            `交换 arr[${j}] 和 arr[${j + 1}] → [${arr.join(', ')}]`,
            { arr: [...arr], comparisons: this._comparisons, swaps: this._swaps, i: i, j: j, sortedFrom: n - i },
            { arr: [...arr], highlight: [j, j + 1], sorted: Array.from({length: n}, (_, idx) => idx >= n - i), comparing: [], swapped: [j, j + 1] },
            `将较大的元素 ${arr[j + 1]}（原在位置 ${j}）与较小的元素 ${arr[j]}（原在位置 ${j + 1}）交换。较大的元素向右移动一步，就像气泡在水中上升一样，这就是"冒泡排序"名称的由来。`,
            [5, 6]
          ));
        }
      }

      this._steps.push(new App.AlgorithmStep(
        sid++, StepType.BUBBLE_PASS_DONE,
        `第 ${i + 1} 轮结束，位置 ${n - 1 - i} 已确定（值=${arr[n - 1 - i]}）。当前数组：[${arr.join(', ')}]`,
        { arr: [...arr], comparisons: this._comparisons, swaps: this._swaps, i: i, j: -1, sortedFrom: n - i - 1 },
        { arr: [...arr], highlight: [], sorted: Array.from({length: n}, (_, idx) => idx >= n - i - 1), passDone: n - 1 - i },
        `第 ${i + 1} 轮冒泡完成。元素 ${arr[n - 1 - i]} 已经到达它在最终排序数组中的正确位置 ${n - 1 - i}。${swapped ? '' : '本轮没有发生任何交换，说明数组已经有序，但为了演示完整性继续展示。'}`,
        [7, 8, 1]
      ));

      if (!swapped) break;
    }

    this._steps.push(new App.AlgorithmStep(
      sid++, StepType.COMPLETE,
      `排序完成！最终数组：[${arr.join(', ')}]，共比较 ${this._comparisons} 次，交换 ${this._swaps} 次`,
      { arr: [...arr], comparisons: this._comparisons, swaps: this._swaps, i: -1, j: -1, sortedFrom: 0 },
      { arr: [...arr], highlight: [], sorted: Array.from({length: n}, () => true), comparing: [] },
      `冒泡排序执行完毕。最好的情况（已有序）只需 O(n) 次比较，最坏和平均情况需要 O(n²) 次比较。它是一种稳定的排序算法。`,
      [9]
    ));

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
      // 恢复状态
      const step = this._steps[this._currentStep - 1];
      if (step && step.stateSnapshot) {
        this._arr = [...step.stateSnapshot.arr];
        this._comparisons = step.stateSnapshot.comparisons;
        this._swaps = step.stateSnapshot.swaps;
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
    this._comparisons = 0;
    this._swaps = 0;
    if (this._steps.length > 0) {
      const init = this._steps[0];
      if (init && init.stateSnapshot) {
        this._arr = [...init.stateSnapshot.arr];
      }
    }
  }

  get_complexity() {
    return { time: '平均 O(n²)，最好 O(n)', space: 'O(1)' };
  }

  get_pseudocode() {
    return [
      { indent: 0, text: 'function bubbleSort(A, n):' },
      { indent: 1, text: 'for i = 0 to n-2:' },
      { indent: 2, text: 'swapped = false' },
      { indent: 2, text: 'for j = 0 to n-2-i:' },
      { indent: 3, text: 'if A[j] > A[j+1]:' },
      { indent: 4, text: 'swap(A[j], A[j+1])' },
      { indent: 4, text: 'swapped = true' },
      { indent: 2, text: 'if not swapped:' },
      { indent: 3, text: 'break' },
      { indent: 1, text: 'return A' }
    ];
  }

  get_test_cases() {
    return [
      new App.TestCase(101, 'bubble', '标准随机数组', { arr: '34,7,23,32,5,17,55,3,42,11' }, '[3,5,7,11,17,23,32,34,42,55]', '系统预设', '随机10元素数组'),
      new App.TestCase(102, 'bubble', '逆序数组（最坏情况）', { arr: '9,8,7,6,5,4,3,2,1' }, '[1,2,3,4,5,6,7,8,9]', '系统预设', '完全逆序排列，需要最多比较和交换'),
      new App.TestCase(103, 'bubble', '已有序数组（最好情况）', { arr: '1,2,3,4,5,6,7,8' }, '[1,2,3,4,5,6,7,8]', '系统预设', '已经排好序，第一轮无交换即结束'),
      new App.TestCase(104, 'bubble', '含重复元素', { arr: '5,3,8,3,9,1,5,7' }, '[1,3,3,5,5,7,8,9]', '系统预设', '包含重复值，验证稳定性')
    ];
  }
};

/* ========== BubbleRenderer ========== */
App.BubbleRenderer = class BubbleRenderer {
  constructor() {
    this._engine = null;
  }

  render(step, canvas) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const vd = step.visualData;
    if (!vd || !vd.arr || vd.arr.length === 0) return;

    const arr = vd.arr;
    const n = arr.length;
    const maxVal = Math.max(...arr, 1);
    const barW = Math.min(60, (W - 80) / n - 4);
    const totalBarsW = n * (barW + 4);
    const startX = (W - totalBarsW) / 2;
    const baseY = H - 60;

    // 绘制每个柱子
    for (let i = 0; i < n; i++) {
      const x = startX + i * (barW + 4);
      const h = (arr[i] / maxVal) * (H - 140);
      const y = baseY - h;

      let color = '#6366f1';
      if (vd.sorted && vd.sorted[i]) {
        color = '#22c55e';
      }
      if (vd.comparing && vd.comparing.includes(i)) {
        color = '#f59e0b';
      }
      if (vd.swapped && vd.swapped.includes(i)) {
        color = '#ef4444';
      }
      if (vd.highlight && vd.highlight.includes(i)) {
        color = '#ef4444';
      }
      if (vd.passDone === i) {
        color = '#22c55e';
      }

      // 发光效果
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;

      const grad = ctx.createLinearGradient(x, y, x, baseY);
      grad.addColorStop(0, color);
      grad.addColorStop(1, this._darken(color, 0.4));
      ctx.fillStyle = grad;
      this._roundRect(ctx, x, y, barW, h, 4);
      ctx.fill();

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // 数值标签
      ctx.fillStyle = '#d1d5db';
      ctx.font = '11px "Microsoft YaHei",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(arr[i], x + barW / 2, y - 6);

      // 索引标签
      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px "Microsoft YaHei",sans-serif';
      ctx.fillText(i, x + barW / 2, baseY + 16);
    }

    // 图例
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(W - 180, 10, 10, 10);
    ctx.fillStyle = '#d1d5db';
    ctx.font = '11px "Microsoft YaHei",sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('已排序', W - 166, 19);

    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(W - 90, 10, 10, 10);
    ctx.fillText('正在比较', W - 76, 19);

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(W - 180, 28, 10, 10);
    ctx.fillText('正在交换', W - 166, 37);
  }

  renderTransition(from, to, canvas, progress) {
    this.render(to, canvas);
  }

  clear(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  _darken(hex, factor) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const f = 1 - factor;
    return `rgb(${Math.floor(r * f)},${Math.floor(g * f)},${Math.floor(b * f)})`;
  }
};
