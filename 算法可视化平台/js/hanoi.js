/**
 * 汉诺塔引擎 — 递归分治算法的逐步执行
 * 可视化表现：三柱 + 圆盘 + 移动动画
 * 设计：initialize() 预计算所有步骤，step() 逐步返回
 */
var App = window.App || {};

App.HanoiEngine = class HanoiEngine {
  constructor() { this.reset(); }

  initialize(params) {
    this.reset();
    this.n = Number(params.n) || 3;
    this.pegs = { A: [], B: [], C: [] };
    for (let i = this.n; i >= 1; i--) this.pegs.A.push(i);

    this.steps = [];
    this.steps.push(this._makeStep(StepType.INIT,
      `初始状态：${this.n}个圆盘都在A柱上，按上小下大堆叠`, {},
      '汉诺塔问题：将A柱上的所有圆盘移到C柱，每次只能移动一个圆盘，且大盘不能放在小盘上面。递归策略：先将n-1个盘移到辅助柱，再将最大盘移到目标柱，最后将n-1个盘移到目标柱。',
      [0]));

    const taskStack = [{ k: this.n, src: 'A', dst: 'C', aux: 'B', depth: 0, phase: 'enter' }];
    let moveNum = 0;

    while (taskStack.length > 0) {
      const task = taskStack.pop();

      if (task.phase === 'enter') {
        if (task.k > 1) {
          this.steps.push(this._makeStep(StepType.RECURSE_ENTER,
            `递归进入：将${task.k}个圆盘从${task.src}移动到${task.dst}（借助${task.aux}），深度=${task.depth}`,
            { depth: task.depth },
            `当前递归目标：将上面${task.k}个圆盘从${task.src}柱移动到${task.dst}柱。将问题分解为三个子任务：1)移动${task.k-1}个到辅助柱${task.aux}；2)移动最大盘到目标柱${task.dst}；3)移动${task.k-1}个到目标柱${task.dst}。`,
            [0, 1, 4, 6]));

          taskStack.push({ k: task.k - 1, src: task.aux, dst: task.dst, aux: task.src, depth: task.depth + 1, phase: 'enter' });
          taskStack.push({ k: 1, src: task.src, dst: task.dst, aux: task.aux, depth: task.depth, phase: 'move' });
          taskStack.push({ k: task.k - 1, src: task.src, dst: task.aux, aux: task.dst, depth: task.depth + 1, phase: 'enter' });
        } else {
          taskStack.push({ k: 1, src: task.src, dst: task.dst, aux: task.aux, depth: task.depth, phase: 'move' });
        }
      } else if (task.phase === 'move') {
        if (this.pegs[task.src].length === 0) continue;
        const disk = this.pegs[task.src].pop();
        this.pegs[task.dst].push(disk);
        moveNum++;
        this.steps.push(this._makeStep(StepType.MOVE_DISK,
          `第${moveNum}次移动：将圆盘${disk}从${task.src}柱移动到${task.dst}柱`,
          { depth: task.depth, moveNum, fromPeg: task.src, toPeg: task.dst, movedDisk: disk },
          `移动圆盘${disk}。这是当前柱${task.src}最上面的（最小的）圆盘。将它直接移动到目标柱${task.dst}，因为目标柱上的圆盘都比它大，所以不会违反"大盘不能放小盘上"的规则。`,
          [2, 5]));
      }
    }

    this.steps.push(this._makeStep(StepType.COMPLETE,
      `完成！共移动${moveNum}次（最优解 2ⁿ−1=${Math.pow(2,this.n)-1}次）`, {},
      `汉诺塔问题的最优解恰好需要 2ⁿ−1 = ${Math.pow(2,this.n)-1} 次移动。这个指数级增长意味着每增加一个圆盘，移动次数翻倍。时间复杂度为 O(2ⁿ)。`,
      []));
    this.totalMoves = moveNum;
    this.currentIdx = 0;
    return true;
  }

  _makeStep(type, desc, extraVD, explanation, activeLines = []) {
    return new App.AlgorithmStep(this.steps.length, type, desc,
      { pegs: this._pegsCopy(), totalMoves: this.totalMoves },
      Object.assign({ pegs: this._pegsCopy() }, extraVD),
      explanation || '',
      activeLines);
  }

  get_pseudocode() {
    return [
      { indent: 0, text: 'function hanoi(n, src, dst, aux):' },
      { indent: 1, text: 'if n == 1:' },
      { indent: 2, text: 'move disk 1 from src to dst' },
      { indent: 2, text: 'return' },
      { indent: 1, text: 'hanoi(n-1, src, aux, dst)' },
      { indent: 1, text: 'move disk n from src to dst' },
      { indent: 1, text: 'hanoi(n-1, aux, dst, src)' }
    ];
  }

  _pegsCopy() {
    return { A: [...this.pegs.A], B: [...this.pegs.B], C: [...this.pegs.C] };
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
    this.n = 0;
    this.pegs = { A: [], B: [], C: [] };
    this.steps = [];
    this.currentIdx = 0;
    this.totalMoves = 0;
  }

  get_complexity() { return { time: 'O(2ⁿ)', space: 'O(n)（递归栈深度）' }; }

  get_test_cases() {
    return [
      new App.TestCase(5, 'hanoi', '3个圆盘（标准）', { n: 3 }, '7次移动', '系统预设', 'n=3，最优解7步'),
      new App.TestCase(6, 'hanoi', '1个圆盘（边界）', { n: 1 }, '1次移动', '系统预设', 'n=1最简单情况'),
      new App.TestCase(7, 'hanoi', '4个圆盘', { n: 4 }, '15次移动', '系统预设', 'n=4，最优解15步'),
      new App.TestCase(8, 'hanoi', '6个圆盘', { n: 6 }, '63次移动', '系统预设', 'n=6，最优解63步')
    ];
  }
};

/* ========== 汉诺塔可视化渲染器 ========== */
App.HanoiRenderer = class HanoiRenderer {
  constructor() { this._engine = null; }

  render(step, canvas) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const pegs = (step.visualData && step.visualData.pegs) || (step.stateSnapshot && step.stateSnapshot.pegs);
    if (!pegs) { this._drawEmpty(canvas); return; }

    const pegNames = ['A', 'B', 'C'];
    const pegLabels = ['A（源柱）', 'B（辅助柱）', 'C（目标柱）'];
    const baseY = H - 60;
    const pegH = 200;
    const pegTop = baseY - pegH;
    const centerX = W / 2;
    const spacing = 180;
    const pegXs = [centerX - spacing, centerX, centerX + spacing];

    ctx.fillStyle = '#8D6E63';
    ctx.fillRect(pegXs[0] - 60, baseY, spacing * 2 + 120, 10);
    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 2;
    ctx.strokeRect(pegXs[0] - 60, baseY, spacing * 2 + 120, 10);

    pegNames.forEach((name, pi) => {
      const px = pegXs[pi];
      const disks = pegs[name];

      const pegGrad = ctx.createLinearGradient(px - 6, 0, px + 6, 0);
      pegGrad.addColorStop(0, '#A1887F');
      pegGrad.addColorStop(0.5, '#D7CCC8');
      pegGrad.addColorStop(1, '#8D6E63');
      ctx.fillStyle = pegGrad;
      ctx.fillRect(px - 6, pegTop, 12, pegH);

      ctx.fillStyle = '#6D4C41';
      ctx.fillRect(px - 28, baseY - 4, 56, 14);
      ctx.strokeStyle = '#4E342E';
      ctx.lineWidth = 1;
      ctx.strokeRect(px - 28, baseY - 4, 56, 14);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 14px "Microsoft YaHei",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(name, px, baseY + 25);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px "Microsoft YaHei",sans-serif';
      ctx.fillText(pegLabels[pi], px, baseY + 42);

      const maxDiskW = 120;
      const minDiskW = 40;
      const allDisks = this._allDisks(pegs);
      const maxDisk = Math.max(1, ...allDisks);
      disks.forEach((disk, di) => {
        const diskW = minDiskW + (disk / maxDisk) * (maxDiskW - minDiskW);
        const diskH = 24;
        const gap = 2;
        const dy = baseY - 4 - diskH - di * (diskH + gap);

        const colors = ['#E74C3C','#3498DB','#2ECC71','#F39C12','#9B59B6','#1ABC9C','#E67E22','#E91E63','#00BCD4','#FF5722'];
        const c = colors[(disk - 1) % colors.length];

        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        this._diskPath(ctx, px, dy + 3, diskW, diskH);
        ctx.fill();

        const grad = ctx.createLinearGradient(px, dy, px, dy + diskH);
        grad.addColorStop(0, c);
        grad.addColorStop(1, this._darken(c, 0.3));
        ctx.fillStyle = grad;
        this._diskPath(ctx, px, dy, diskW, diskH);
        ctx.fill();

        ctx.strokeStyle = this._darken(c, 0.5);
        ctx.lineWidth = 1.5;
        this._diskPath(ctx, px, dy, diskW, diskH);
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px "Microsoft YaHei",sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(disk, px, dy + diskH / 2);
      });
    });

    const vd = step.visualData;
    if (vd.movedDisk !== undefined && step.stepType === StepType.MOVE_DISK) {
      ctx.fillStyle = 'rgba(255,215,0,0.3)';
      ctx.font = 'bold 14px "Microsoft YaHei",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`← 移动圆盘${vd.movedDisk}`, pegXs[pegNames.indexOf(vd.toPeg)], pegTop - 20);
    }

    if (vd.depth !== undefined) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px "Microsoft YaHei",sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`递归深度：${vd.depth}`, W - 30, 25);
    }
  }

  _allDisks(pegs) {
    const all = [];
    Object.values(pegs).forEach(arr => all.push(...arr));
    return all;
  }

  _diskPath(ctx, cx, y, w, h) {
    const r = h / 2;
    ctx.beginPath();
    ctx.moveTo(cx - w/2 + r, y);
    ctx.lineTo(cx + w/2 - r, y);
    ctx.arcTo(cx + w/2, y, cx + w/2, y + r, r);
    ctx.lineTo(cx + w/2, y + h - r);
    ctx.arcTo(cx + w/2, y + h, cx + w/2 - r, y + h, r);
    ctx.lineTo(cx - w/2 + r, y + h);
    ctx.arcTo(cx - w/2, y + h, cx - w/2, y + h - r, r);
    ctx.lineTo(cx - w/2, y + r);
    ctx.arcTo(cx - w/2, y, cx - w/2 + r, y, r);
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
    ctx.font = '15px "Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('选择算法并设置参数后点击"开始"或"单步执行"', canvas.width / 2, canvas.height / 2);
  }

  _darken(hex, amt) {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return `rgb(${Math.floor(r*(1-amt))},${Math.floor(g*(1-amt))},${Math.floor(b*(1-amt))})`;
  }
};
