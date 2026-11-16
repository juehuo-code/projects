/**
 * 归并排序 — 引擎与渲染器
 */
var App = window.App || {};

/* ========== MergeEngine ========== */
App.MergeEngine = class MergeEngine {
  constructor() {
    this._steps = [];
    this._currentStep = 0;
    this._arr = [];
    this._comparisons = 0;
    this._merges = 0;
  }

  initialize(params) {
    this._arr = (params.arr || '').split(',').map(s => Number(s.trim()));
    this._steps = [];
    this._currentStep = 0;
    this._comparisons = 0;
    this._merges = 0;

    const arr = [...this._arr];
    let sid = 0;

    this._steps.push(new App.AlgorithmStep(
      sid++, StepType.INIT,
      `初始化：待排序数组 [${arr.join(', ')}]，共 ${arr.length} 个元素`,
      { arr: [...arr], comparisons: 0, swaps: 0, merges: 0 },
      { arr: [...arr], highlight: [], ranges: [], merged: [] },
      `归并排序采用"分治"策略：先将数组递归地分成两半直到每个子数组只剩一个元素，然后将已排序的子数组合并成更大的有序数组。一个元素的数组自然有序。`,
      [0]
    ));

    this._mergeSort(arr, 0, arr.length - 1, sid);
    // sid is passed by reference via the steps array

    this._steps.push(new App.AlgorithmStep(
      this._steps.length, StepType.COMPLETE,
      `排序完成！最终数组：[${arr.join(', ')}]，共比较 ${this._comparisons} 次，合并 ${this._merges} 次`,
      { arr: [...arr], comparisons: this._comparisons, swaps: this._merges, merges: this._merges },
      { arr: [...arr], highlight: [], ranges: [], merged: Array.from({length: arr.length}, () => true) },
      `归并排序执行完毕。无论输入数据如何，时间复杂度始终为 O(n log n)，但空间复杂度为 O(n)，因为合并时需要额外的临时数组。`,
      []
    ));

    return true;
  }

  _mergeSort(arr, left, right, sidBase) {
    if (left >= right) {
      this._steps.push(new App.AlgorithmStep(
        this._steps.length, StepType.DIVIDE,
        `区间 [${left}, ${right}] 只有一个元素 ${arr[left]}，自然有序`,
        { arr: [...arr], comparisons: this._comparisons, swaps: this._merges, merges: this._merges },
        { arr: [...arr], highlight: [left], ranges: [], merged: Array.from({length: arr.length}, (_, i) => i >= left && i <= right) },
        `当子数组只有一个元素时，递归到达最深层。一个元素的数组自然有序，这是归并排序递归的终止条件（base case）。`,
        [1]
      ));
      return;
    }

    const mid = Math.floor((left + right) / 2);

    this._steps.push(new App.AlgorithmStep(
      this._steps.length, StepType.DIVIDE,
      `拆分区间 [${left}, ${right}] 为 [${left}, ${mid}] 和 [${mid + 1}, ${right}]`,
      { arr: [...arr], comparisons: this._comparisons, swaps: this._merges, merges: this._merges },
      { arr: [...arr], highlight: [], ranges: [[left, mid], [mid + 1, right]], merged: [] },
      `将当前数组从中间一分为二，递归地对左右两部分分别进行归并排序。这是"分治"策略中的"分"阶段，将大问题不断分解为更小的子问题。`,
      [2, 3, 4]
    ));

    this._mergeSort(arr, left, mid, sidBase);
    this._mergeSort(arr, mid + 1, right, sidBase);

    // 合并
    this._steps.push(new App.AlgorithmStep(
      this._steps.length, StepType.MERGE_STEP,
      `开始合并区间 [${left}, ${mid}] 和 [${mid + 1}, ${right}]`,
      { arr: [...arr], comparisons: this._comparisons, swaps: this._merges, merges: this._merges },
      { arr: [...arr], highlight: [], ranges: [[left, mid], [mid + 1, right]], merging: { left: left, mid: mid, right: right } },
      `现在进入"治"阶段：将两个已经排好序的子数组合并成一个大的有序数组。使用双指针技术，每次从两个子数组中选较小的元素放入结果。`,
      [5, 9]
    ));

    this._merge(arr, left, mid, right);
    this._merges++;

    this._steps.push(new App.AlgorithmStep(
      this._steps.length, StepType.SUBARRAY_MERGE,
      `区间 [${left}, ${right}] 合并完成：[${arr.slice(left, right + 1).join(', ')}]`,
      { arr: [...arr], comparisons: this._comparisons, swaps: this._merges, merges: this._merges },
      { arr: [...arr], highlight: [], ranges: [[left, right]], merged: Array.from({length: arr.length}, (_, i) => i >= left && i <= right) },
      `区间 [${left}, ${right}] 合并完毕，该段已完全有序。当所有递归层级都完成合并后，整个数组就是有序的。`,
      [5]
    ));
  }

  _merge(arr, left, mid, right) {
    const leftArr = arr.slice(left, mid + 1);
    const rightArr = arr.slice(mid + 1, right + 1);
    let i = 0, j = 0, k = left;

    while (i < leftArr.length && j < rightArr.length) {
      this._comparisons++;
      this._steps.push(new App.AlgorithmStep(
        this._steps.length, StepType.COMPARE,
        `比较左半部[${leftArr[i]}] 与 右半部[${rightArr[j]}] → 选择 ${leftArr[i] <= rightArr[j] ? leftArr[i] : rightArr[j]}`,
        { arr: [...arr], comparisons: this._comparisons, swaps: this._merges, merges: this._merges },
        { arr: [...arr], highlight: [], ranges: [[left, mid], [mid + 1, right]], comparePair: [left + i, mid + 1 + j], merging: { left: left, mid: mid, right: right }, merged: Array.from({length: arr.length}, (_, idx) => idx >= left && idx < k) },
        `比较左半部分的第一个元素 ${leftArr[i]} 和右半部分的第一个元素 ${rightArr[j]}。较小的那个元素被选入合并后的数组。这保证了合并结果的正确顺序。`,
        [10, 11]
      ));

      if (leftArr[i] <= rightArr[j]) {
        arr[k] = leftArr[i];
        i++;
      } else {
        arr[k] = rightArr[j];
        j++;
      }
      k++;
    }

    while (i < leftArr.length) {
      this._steps.push(new App.AlgorithmStep(
        this._steps.length, StepType.MERGE_STEP,
        `左半部剩余元素 ${leftArr[i]} 直接追加`,
        { arr: [...arr], comparisons: this._comparisons, swaps: this._merges, merges: this._merges },
        { arr: [...arr], highlight: [], ranges: [[left, right]], merging: { left: left, mid: mid, right: right }, merged: Array.from({length: arr.length}, (_, idx) => idx >= left && idx < k) },
        `右半部元素已用完，左半部剩余元素直接追加到合并结果中。因为左半部自身已经有序，所以可以直接追加。`,
        [16]
      ));
      arr[k] = leftArr[i];
      i++;
      k++;
    }

    while (j < rightArr.length) {
      this._steps.push(new App.AlgorithmStep(
        this._steps.length, StepType.MERGE_STEP,
        `右半部剩余元素 ${rightArr[j]} 直接追加`,
        { arr: [...arr], comparisons: this._comparisons, swaps: this._merges, merges: this._merges },
        { arr: [...arr], highlight: [], ranges: [[left, right]], merging: { left: left, mid: mid, right: right }, merged: Array.from({length: arr.length}, (_, idx) => idx >= left && idx < k) },
        `左半部元素已用完，右半部剩余元素直接追加到合并结果中。`,
        [17]
      ));
      arr[k] = rightArr[j];
      j++;
      k++;
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
        this._arr = [...step.stateSnapshot.arr];
        this._comparisons = step.stateSnapshot.comparisons;
        this._merges = step.stateSnapshot.merges;
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
    this._merges = 0;
    if (this._steps.length > 0) {
      const init = this._steps[0];
      if (init && init.stateSnapshot) {
        this._arr = [...init.stateSnapshot.arr];
      }
    }
  }

  get_complexity() {
    return { time: 'O(n log n)', space: 'O(n)' };
  }

  get_pseudocode() {
    return [
      { indent: 0, text: 'function mergeSort(A, left, right):' },
      { indent: 1, text: 'if left >= right: return' },
      { indent: 1, text: 'mid = (left + right) / 2' },
      { indent: 1, text: 'mergeSort(A, left, mid)' },
      { indent: 1, text: 'mergeSort(A, mid+1, right)' },
      { indent: 1, text: 'merge(A, left, mid, right)' },
      { indent: 0, text: '————————————————————————', separator: true },
      { indent: 0, text: 'function merge(A, left, mid, right):' },
      { indent: 1, text: 'L = A[left..mid], R = A[mid+1..right]' },
      { indent: 1, text: 'i = 0, j = 0, k = left' },
      { indent: 1, text: 'while i < |L| and j < |R|:' },
      { indent: 2, text: 'if L[i] <= R[j]:' },
      { indent: 3, text: 'A[k] = L[i]; i = i+1' },
      { indent: 2, text: 'else:' },
      { indent: 3, text: 'A[k] = R[j]; j = j+1' },
      { indent: 2, text: 'k = k+1' },
      { indent: 1, text: 'while i < |L|: A[k++] = L[i++]' },
      { indent: 1, text: 'while j < |R|: A[k++] = R[j++]' }
    ];
  }

  get_test_cases() {
    return [
      new App.TestCase(201, 'merge', '标准随机数组', { arr: '38,27,43,3,9,82,10' }, '[3,9,10,27,38,43,82]', '系统预设', '经典7元素数组'),
      new App.TestCase(202, 'merge', '逆序数组', { arr: '9,8,7,6,5,4,3,2,1' }, '[1,2,3,4,5,6,7,8,9]', '系统预设', '完全逆序排列'),
      new App.TestCase(203, 'merge', '已有序数组', { arr: '1,2,3,4,5,6,7,8' }, '[1,2,3,4,5,6,7,8]', '系统预设', '已有序，验证归并过程'),
      new App.TestCase(204, 'merge', '含重复元素', { arr: '5,2,8,2,9,1,5,6' }, '[1,2,2,5,5,6,8,9]', '系统预设', '包含重复值，验证稳定性')
    ];
  }
};

/* ========== MergeRenderer ========== */
App.MergeRenderer = class MergeRenderer {
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
    const barW = Math.min(55, (W - 80) / n - 4);
    const totalBarsW = n * (barW + 4);
    const startX = (W - totalBarsW) / 2;
    const baseY = H - 60;

    // 绘制区间范围背景
    if (vd.ranges && vd.ranges.length > 0) {
      vd.ranges.forEach(([l, r]) => {
        const x1 = startX + l * (barW + 4) - 3;
        const x2 = startX + r * (barW + 4) + barW + 3;
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(x1, 10, x2 - x1, H - 80);
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(99,102,241,0.08)';
        ctx.fillRect(x1, 10, x2 - x1, H - 80);
      });
    }

    // 绘制合并区间背景
    if (vd.merging) {
      const { left, right } = vd.merging;
      const x1 = startX + left * (barW + 4) - 3;
      const x2 = startX + right * (barW + 4) + barW + 3;
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 3;
      ctx.setLineDash([2, 6]);
      ctx.strokeRect(x1, 10, x2 - x1, H - 80);
      ctx.setLineDash([]);
    }

    // 绘制每个柱子
    for (let i = 0; i < n; i++) {
      const x = startX + i * (barW + 4);
      const h = (arr[i] / maxVal) * (H - 140);
      const y = baseY - h;

      let color = '#6366f1';
      if (vd.merged && vd.merged[i]) {
        color = '#22c55e';
      }
      if (vd.highlight && vd.highlight.includes(i)) {
        color = '#f59e0b';
      }
      if (vd.comparePair && vd.comparePair.includes(i)) {
        color = '#ef4444';
      }

      ctx.shadowColor = color;
      ctx.shadowBlur = 6;

      const grad = ctx.createLinearGradient(x, y, x, baseY);
      grad.addColorStop(0, color);
      grad.addColorStop(1, this._darken(color, 0.35));
      ctx.fillStyle = grad;
      this._roundRect(ctx, x, y, barW, h, 4);
      ctx.fill();

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#d1d5db';
      ctx.font = '10px "Microsoft YaHei",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(arr[i], x + barW / 2, y - 5);

      ctx.fillStyle = '#9ca3af';
      ctx.font = '9px "Microsoft YaHei",sans-serif';
      ctx.fillText(i, x + barW / 2, baseY + 14);
    }

    // 图例
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(W - 200, 10, 10, 10);
    ctx.fillStyle = '#d1d5db';
    ctx.font = '11px "Microsoft YaHei",sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('已合并', W - 186, 19);

    ctx.fillStyle = '#a855f7';
    ctx.fillRect(W - 200, 28, 10, 10);
    ctx.fillText('合并区域', W - 186, 37);

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(W - 100, 10, 10, 10);
    ctx.fillText('正在比较', W - 86, 19);
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
