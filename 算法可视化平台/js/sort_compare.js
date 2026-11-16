/**
 * 排序算法对比模式 — 引擎与渲染器
 */
var App = window.App || {};

/* ========== SortCompareController ========== */
App.SortCompareController = class SortCompareController {
  constructor() {
    this.algoAId = 'bubble';
    this.algoBId = 'quicksort';
    this.engineA = null;
    this.engineB = null;
    this.rendererA = null;
    this.rendererB = null;
    this.executorA = null;
    this.executorB = null;
    this.state = ExecutorState.IDLE;
    this.compareData = { comparisonsA: 0, swapsA: 0, comparisonsB: 0, swapsB: 0, stepsA: 0, stepsB: 0 };
    this._bindElements();
    this._setupCallbacks();
    this._bindEvents();
  }

  _bindElements() {
    this.els = {
      container: document.getElementById('sort-compare-container'),
      canvasA: document.getElementById('compare-canvas-a'),
      canvasB: document.getElementById('compare-canvas-b'),
      algoASelect: document.getElementById('compare-algo-a'),
      algoBSelect: document.getElementById('compare-algo-b'),
      btnStart: document.getElementById('compare-btn-start'),
      btnPause: document.getElementById('compare-btn-pause'),
      btnResume: document.getElementById('compare-btn-resume'),
      btnStep: document.getElementById('compare-btn-step'),
      btnStepBack: document.getElementById('compare-btn-stepback'),
      btnReset: document.getElementById('compare-btn-reset'),
      statsA: document.getElementById('compare-stats-a'),
      statsB: document.getElementById('compare-stats-b'),
      descA: document.getElementById('compare-desc-a'),
      descB: document.getElementById('compare-desc-b'),
      inputArr: document.getElementById('compare-input-arr'),
      btnRandom: document.getElementById('compare-btn-random'),
      complexityA: document.getElementById('compare-complexity-a'),
      complexityB: document.getElementById('compare-complexity-b'),
      finalA: document.getElementById('compare-final-a'),
      finalB: document.getElementById('compare-final-b')
    };
  }

  _setupCallbacks() {
    this.executorA = new App.StepExecutor();
    this.executorB = new App.StepExecutor();

    this.executorA.onStepUpdate = (step) => {
      if (step && this.rendererA) {
        this.rendererA.render(step, this.els.canvasA);
        if (step.stateSnapshot) {
          this.compareData.comparisonsA = step.stateSnapshot.comparisons || 0;
          this.compareData.swapsA = step.stateSnapshot.swaps || 0;
        }
        this.els.descA.textContent = step.description || '';
        this._updateStats();
        if (step.stepType === StepType.COMPLETE) {
          this.els.finalA.textContent = step.description;
          this.els.complexityA.textContent = `时间: ${this.engineA.get_complexity().time} | 空间: ${this.engineA.get_complexity().space}`;
        }
      }
    };

    this.executorA.onStateChange = (state) => this._updateButtonStates();
    this.executorA.onComplete = () => this._checkBothComplete();

    this.executorB.onStepUpdate = (step) => {
      if (step && this.rendererB) {
        this.rendererB.render(step, this.els.canvasB);
        if (step.stateSnapshot) {
          this.compareData.comparisonsB = step.stateSnapshot.comparisons || 0;
          this.compareData.swapsB = step.stateSnapshot.swaps || 0;
        }
        this.els.descB.textContent = step.description || '';
        this._updateStats();
        if (step.stepType === StepType.COMPLETE) {
          this.els.finalB.textContent = step.description;
          this.els.complexityB.textContent = `时间: ${this.engineB.get_complexity().time} | 空间: ${this.engineB.get_complexity().space}`;
        }
      }
    };

    this.executorB.onStateChange = (state) => this._updateButtonStates();
    this.executorB.onComplete = () => this._checkBothComplete();
  }

  _checkBothComplete() {
    if (this.executorA.getState() === ExecutorState.FINISHED &&
        this.executorB.getState() === ExecutorState.FINISHED) {
      this.state = ExecutorState.FINISHED;
      this._updateButtonStates();
    }
  }

  _bindEvents() {
    this.els.algoASelect.addEventListener('change', () => {
      this.algoAId = this.els.algoASelect.value;
      this._createEngines();
    });
    this.els.algoBSelect.addEventListener('change', () => {
      this.algoBId = this.els.algoBSelect.value;
      this._createEngines();
    });
    this.els.btnStart.addEventListener('click', () => this._start());
    this.els.btnPause.addEventListener('click', () => this._pause());
    this.els.btnResume.addEventListener('click', () => this._resume());
    this.els.btnStep.addEventListener('click', () => this._step());
    this.els.btnStepBack.addEventListener('click', () => this._stepBack());
    this.els.btnReset.addEventListener('click', () => this._reset());
    this.els.btnRandom.addEventListener('click', () => this._randomGenerate());
  }

  _createEngines() {
    const factory = {
      'bubble': () => [new App.BubbleEngine(), new App.BubbleRenderer()],
      'quicksort': () => [new App.QuickSortEngine(), new App.QuickSortRenderer()],
      'merge': () => [new App.MergeEngine(), new App.MergeRenderer()]
    };

    if (factory[this.algoAId]) {
      [this.engineA, this.rendererA] = factory[this.algoAId]();
      this.executorA.setEngine(this.engineA);
      if (this.rendererA) this.rendererA._engine = this.engineA;
    }
    if (factory[this.algoBId]) {
      [this.engineB, this.rendererB] = factory[this.algoBId]();
      this.executorB.setEngine(this.engineB);
      if (this.rendererB) this.rendererB._engine = this.engineB;
    }
  }

  _initWithData(arrStr) {
    this._createEngines();
    const params = { arr: arrStr };
    const initA = this.engineA.initialize(params);
    const initB = this.engineB.initialize(params);
    if (!initA || !initB) {
      alert('参数初始化失败，请检查输入数据');
      return false;
    }
    this.compareData = { comparisonsA: 0, swapsA: 0, comparisonsB: 0, swapsB: 0, stepsA: 0, stepsB: 0 };
    this.els.finalA.textContent = '';
    this.els.finalB.textContent = '';
    this.els.complexityA.textContent = '';
    this.els.complexityB.textContent = '';
    this._resizeCanvases();
    this._updateStats();
    return true;
  }

  _start() {
    if (this.executorA.getState() === ExecutorState.IDLE) {
      const arrStr = this.els.inputArr.value.trim();
      if (!arrStr) { alert('请输入待排序数组'); return; }
      if (!this._initWithData(arrStr)) return;
    }

    this.state = ExecutorState.RUNNING;
    this._syncRenderers();
    this.executorA.play(800);
    this.executorB.play(800);
    this._updateButtonStates();
  }

  _pause() {
    this.executorA.pause();
    this.executorB.pause();
    this.state = ExecutorState.PAUSED;
    this._updateButtonStates();
  }

  _resume() {
    this._syncRenderers();
    this.executorA.resume();
    this.executorB.resume();
    this.state = ExecutorState.RUNNING;
    this._updateButtonStates();
  }

  _step() {
    if (this.executorA.getState() === ExecutorState.IDLE) {
      const arrStr = this.els.inputArr.value.trim();
      if (!arrStr) { alert('请输入待排序数组'); return; }
      if (!this._initWithData(arrStr)) return;
    }

    this._syncRenderers();
    this.executorA.stepOnce();
    this.executorB.stepOnce();
    this.state = ExecutorState.PAUSED;

    if (this.executorA.getState() === ExecutorState.FINISHED ||
        this.executorB.getState() === ExecutorState.FINISHED) {
      this._checkBothComplete();
    }
    this._updateButtonStates();
  }

  _stepBack() {
    this.executorA.stepBack();
    this.executorB.stepBack();
    this.state = ExecutorState.PAUSED;
    this._updateButtonStates();
  }

  _reset() {
    this.executorA.reset();
    this.executorB.reset();
    if (this.rendererA) this.rendererA.clear(this.els.canvasA);
    if (this.rendererB) this.rendererB.clear(this.els.canvasB);
    this.compareData = { comparisonsA: 0, swapsA: 0, comparisonsB: 0, swapsB: 0, stepsA: 0, stepsB: 0 };
    this.els.descA.textContent = '请设置参数后点击"开始"';
    this.els.descB.textContent = '请设置参数后点击"开始"';
    this.els.finalA.textContent = '';
    this.els.finalB.textContent = '';
    this.els.complexityA.textContent = '';
    this.els.complexityB.textContent = '';
    this.state = ExecutorState.IDLE;
    this._updateStats();
    this._updateButtonStates();
  }

  _syncRenderers() {
    if (this.rendererA) this.rendererA._engine = this.engineA;
    if (this.rendererB) this.rendererB._engine = this.engineB;
  }

  _randomGenerate() {
    const len = App.RandomDataGenerator.randInt(6, 15);
    const arr = [];
    for (let i = 0; i < len; i++) arr.push(App.RandomDataGenerator.randInt(1, 99));
    this.els.inputArr.value = arr.join(',');
  }

  _updateStats() {
    const ca = this.compareData.comparisonsA;
    const sa = this.compareData.swapsA;
    const cb = this.compareData.comparisonsB;
    const sb = this.compareData.swapsB;

    this.els.statsA.innerHTML = `比较: <span class="stat-num">${ca}</span> 次 | 交换: <span class="stat-num">${sa}</span> 次`;
    this.els.statsB.innerHTML = `比较: <span class="stat-num">${cb}</span> 次 | 交换: <span class="stat-num">${sb}</span> 次`;

    // 高亮更优者
    const statsAElements = this.els.statsA.querySelectorAll('.stat-num');
    const statsBElements = this.els.statsB.querySelectorAll('.stat-num');

    if (ca > 0 && cb > 0) {
      statsAElements[0].style.color = ca <= cb ? '#22c55e' : '#ef4444';
      statsBElements[0].style.color = cb <= ca ? '#22c55e' : '#ef4444';
    }

    if (sa > 0 || sb > 0) {
      if (statsAElements[1]) statsAElements[1].style.color = sa <= sb ? '#22c55e' : '#ef4444';
      if (statsBElements[1]) statsBElements[1].style.color = sb <= sa ? '#22c55e' : '#ef4444';
    }
  }

  _updateButtonStates() {
    const isIdle = this.state === ExecutorState.IDLE;
    const isRunning = this.state === ExecutorState.RUNNING;
    const isPaused = this.state === ExecutorState.PAUSED;

    this.els.btnStart.disabled = !isIdle && !isPaused;
    this.els.btnStep.disabled = !isIdle && !isPaused;
    this.els.btnPause.disabled = !isRunning;
    this.els.btnResume.disabled = !isPaused;
    this.els.btnStepBack.disabled = !isPaused && this.state !== ExecutorState.FINISHED;
    this.els.btnReset.disabled = isIdle;
  }

  _resizeCanvases() {
    [this.els.canvasA, this.els.canvasB].forEach(canvas => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = Math.max(300, container.clientHeight);
      }
    });
  }

  resize() {
    this._resizeCanvases();
    const stepA = this.executorA.recorder.getCurrent();
    const stepB = this.executorB.recorder.getCurrent();
    if (stepA && this.rendererA) this.rendererA.render(stepA, this.els.canvasA);
    if (stepB && this.rendererB) this.rendererB.render(stepB, this.els.canvasB);
  }

  getLogData() {
    const algo1Meta = App.AlgorithmRegistry.get(this.algoAId);
    const algo2Meta = App.AlgorithmRegistry.get(this.algoBId);
    return {
      algo1Name: algo1Meta ? algo1Meta.algoName : this.algoAId,
      algo2Name: algo2Meta ? algo2Meta.algoName : this.algoBId,
      input: { arr: this.els.inputArr.value },
      steps1: this.executorA.recorder.getAllSteps(),
      steps2: this.executorB.recorder.getAllSteps(),
      complexity1: this.engineA ? this.engineA.get_complexity() : { time: '', space: '' },
      complexity2: this.engineB ? this.engineB.get_complexity() : { time: '', space: '' },
      stats1: { totalSteps: this.executorA.recorder.getTotalSteps(), comparisons: this.compareData.comparisonsA, swaps: this.compareData.swapsA },
      stats2: { totalSteps: this.executorB.recorder.getTotalSteps(), comparisons: this.compareData.comparisonsB, swaps: this.compareData.swapsB }
    };
  }
};
