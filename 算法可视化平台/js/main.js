/**
 * 算法过程可视化系统 — 主控制器
 * 管理 UI 交互、模块调度、执行控制和渲染管道
 */
var App = window.App || {};

App.MainController = class MainController {
  constructor() {
    console.log('[MainController] 开始初始化...');
    try {
      this.currentAlgoId = null;
      this.engine = null;
      this.renderer = null;
      this.executor = new App.StepExecutor();
      this.testCases = [];
      this.lectureMode = false;
      this.compareController = null;
      this._bindElements();
      this._setupExecutorCallbacks();
      this._bindEvents();
      this._init();
      console.log('[MainController] 初始化完成，当前算法:', this.currentAlgoId);
    } catch (e) {
      console.error('[MainController] 初始化失败:', e.message, e.stack);
      this._showFatalError('系统初始化失败：' + e.message);
    }
  }

  /* ========== 致命错误展示 ========== */
  _showFatalError(msg) {
    var banner = document.getElementById('fatal-error-banner');
    if (banner) {
      banner.textContent = '错误：' + msg;
      banner.style.display = 'block';
    }
    // 同时在 body 末尾追加醒目的错误提示
    var div = document.createElement('div');
    div.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#dc2626;color:#fff;padding:16px;text-align:center;z-index:99999;font-size:14px;';
    div.textContent = '系统初始化失败：' + msg + ' — 请打开浏览器控制台(F12)查看详情';
    document.body.appendChild(div);
  }

  /* ========== DOM 元素绑定 ========== */
  _bindElements() {
    var get = function(id) {
      var el = document.getElementById(id);
      if (!el) console.warn('[MainController] 找不到元素 #' + id);
      return el;
    };
    var qs = function(sel) {
      var el = document.querySelector(sel);
      if (!el) console.warn('[MainController] 找不到选择器 ' + sel);
      return el;
    };

    this.els = {
      algoTabs: document.querySelectorAll('.algo-tab'),
      paramArea: get('param-area'),
      canvas: get('viz-canvas'),
      btnStart: get('btn-start'),
      btnStep: get('btn-step'),
      btnPause: get('btn-pause'),
      btnResume: get('btn-resume'),
      btnStepBack: get('btn-stepback'),
      btnReset: get('btn-reset'),
      btnRandom: get('btn-random'),
      testCaseSelect: get('test-case-select'),
      stepDesc: get('step-desc'),
      stepExplanation: get('step-explanation'),
      timeComplexity: get('time-complexity'),
      spaceComplexity: get('space-complexity'),
      finalResult: get('final-result'),
      stepCounter: get('step-counter'),
      currentAlgoName: get('current-algo-name'),
      lectureToggle: get('lecture-mode-toggle'),
      explanationPanel: get('explanation-panel'),
      explanationContent: get('explanation-content'),
      btnExportLog: get('btn-export-log'),
      btnSaveCustom: get('btn-save-custom'),
      btnSaveCase: get('btn-save-case'),
      btnToggleCompare: get('btn-toggle-compare'),
      compareContainer: get('sort-compare-container'),
      mainContainer: qs('.main-container'),
      mainControlBar: get('main-control-bar'),
      bottomBar: qs('.bottom-bar'),
      speedSlider: get('speed-slider'),
      saveCaseModal: get('save-case-modal'),
      saveCaseName: get('save-case-name'),
      saveCaseConfirm: get('save-case-confirm'),
      saveCaseCancel: get('save-case-cancel'),
      exportModal: get('export-modal'),
      exportCancel: get('export-cancel'),
      customCaseSection: get('custom-case-section'),
      customCaseList: get('custom-case-list'),
      pseudocodeBody: get('pseudocode-body')
    };
    console.log('[MainController] DOM元素绑定完成，找到算法标签:', this.els.algoTabs.length, '个');
  }

  /* ========== 执行器回调 ========== */
  _setupExecutorCallbacks() {
    var self = this;
    this.executor.onStepUpdate = function(step) { self._onStepUpdate(step); };
    this.executor.onStateChange = function(state) { self._updateButtonStates(state); };
    this.executor.onComplete = function() { self._onComplete(); };
    console.log('[MainController] 执行器回调设置完成');
  }

  _onStepUpdate(step) {
    if (!step) return;
    if (this.renderer && this.els.canvas) {
      this.renderer.render(step, this.els.canvas);
    }
    if (this.els.stepDesc) {
      this.els.stepDesc.textContent = step.description || '';
      var sd = this.els.stepDesc;
      if (sd.scrollHeight - sd.scrollTop - sd.clientHeight < 30) {
        sd.scrollTop = sd.scrollHeight;
      }
    }

    var idx = this.executor.recorder.getCurrentIndex();
    var total = this.executor.recorder.getTotalSteps();
    if (this.els.stepCounter) {
      this.els.stepCounter.textContent = '步骤 ' + (idx + 1) + ' / ' + total;
    }

    // 讲解模式
    if (this.lectureMode && step.explanation) {
      if (this.els.stepExplanation) {
        this.els.stepExplanation.style.display = 'block';
        this.els.stepExplanation.textContent = '讲解：' + step.explanation;
      }
      if (this.els.explanationContent) {
        this.els.explanationContent.textContent = step.explanation;
      }
    } else if (this.els.stepExplanation) {
      this.els.stepExplanation.style.display = 'none';
    }

    if (step.stepType === StepType.COMPLETE && this.els.finalResult) {
      this.els.finalResult.textContent = step.description;
    }

    this._highlightPseudocodeLines(step.activeLines || []);
  }

  _onComplete() {
    this._updateButtonStates(ExecutorState.FINISHED);
    if (this.engine) {
      var cx = this.engine.get_complexity();
      if (this.els.timeComplexity) this.els.timeComplexity.textContent = cx.time;
      if (this.els.spaceComplexity) this.els.spaceComplexity.textContent = cx.space;
    }
  }

  _updateButtonStates(state) {
    var isIdle = state === ExecutorState.IDLE;
    var isRunning = state === ExecutorState.RUNNING;
    var isPaused = state === ExecutorState.PAUSED;
    var isFinished = state === ExecutorState.FINISHED;

    if (this.els.btnStart) this.els.btnStart.disabled = !isIdle && !isPaused;
    if (this.els.btnStep) this.els.btnStep.disabled = !isIdle && !isPaused;
    if (this.els.btnPause) this.els.btnPause.disabled = !isRunning;
    if (this.els.btnResume) this.els.btnResume.disabled = !isPaused;
    if (this.els.btnStepBack) this.els.btnStepBack.disabled = (!isPaused && !isFinished) || !this.executor.recorder.canGoBack();
    if (this.els.btnReset) this.els.btnReset.disabled = isIdle;
  }

  /* ========== 事件绑定 ========== */
  _bindEvents() {
    var self = this;
    function safeOn(el, event, fn) {
      if (el) {
        el.addEventListener(event, fn);
      } else {
        console.warn('[MainController] 跳过事件绑定：元素不存在');
      }
    }

    // 算法选择标签
    this.els.algoTabs.forEach(function(tab) {
      safeOn(tab, 'click', function() { self._selectAlgorithm(tab.dataset.algo); });
    });

    // 控制按钮
    safeOn(this.els.btnStart, 'click', function() { self._start(); });
    safeOn(this.els.btnStep, 'click', function() { self._step(); });
    safeOn(this.els.btnPause, 'click', function() { self._pause(); });
    safeOn(this.els.btnResume, 'click', function() { self._resume(); });
    safeOn(this.els.btnStepBack, 'click', function() { self._stepBack(); });
    safeOn(this.els.btnReset, 'click', function() { self._reset(); });
    safeOn(this.els.btnRandom, 'click', function() { self._randomGenerate(); });
    safeOn(this.els.testCaseSelect, 'change', function() { self._loadTestCase(); });
    safeOn(this.els.lectureToggle, 'change', function() { self._toggleLectureMode(); });
    safeOn(this.els.btnExportLog, 'click', function() { self._showExportModal(); });
    safeOn(this.els.btnSaveCustom, 'click', function() { self._showSaveCaseModal(); });
    safeOn(this.els.btnSaveCase, 'click', function() { self._showSaveCaseModal(); });
    safeOn(this.els.btnToggleCompare, 'click', function() { self._toggleCompareMode(); });
    safeOn(this.els.speedSlider, 'input', function() { self._updateSpeed(); });

    // 保存用例弹窗
    safeOn(this.els.saveCaseConfirm, 'click', function() { self._saveCustomCase(); });
    safeOn(this.els.saveCaseCancel, 'click', function() { self.els.saveCaseModal.style.display = 'none'; });

    // 导出弹窗
    safeOn(this.els.exportCancel, 'click', function() { self.els.exportModal.style.display = 'none'; });
    if (this.els.exportModal) {
      var exportOptions = this.els.exportModal.querySelectorAll('.export-option');
      exportOptions.forEach(function(btn) {
        safeOn(btn, 'click', function() { self._exportLog(btn.dataset.format); });
      });
    }

    // 弹窗背景点击关闭
    safeOn(this.els.saveCaseModal, 'click', function(e) {
      if (e.target === self.els.saveCaseModal) self.els.saveCaseModal.style.display = 'none';
    });
    safeOn(this.els.exportModal, 'click', function(e) {
      if (e.target === self.els.exportModal) self.els.exportModal.style.display = 'none';
    });

    // 窗口大小适配
    this._resizeCanvas();
    window.addEventListener('resize', function() {
      self._resizeCanvas();
      if (self.compareController) self.compareController.resize();
    });

    console.log('[MainController] 事件绑定完成');
  }

  _resizeCanvas() {
    if (!this.els.canvas) return;
    var container = this.els.canvas.parentElement;
    if (container) {
      var rect = container.getBoundingClientRect();
      this.els.canvas.width = rect.width || 800;
      this.els.canvas.height = Math.max(400, rect.height || 500);
    }
    var step = this.executor.recorder.getCurrent();
    if (step && this.renderer) {
      this.renderer.render(step, this.els.canvas);
    } else if (this.renderer) {
      this.renderer.clear(this.els.canvas);
    }
  }

  /* ========== 初始化 ========== */
  _init() {
    console.log('[MainController] _init 开始');

    // 禁用所有控制按钮
    var disable = function(btn) { if (btn) btn.disabled = true; };
    disable(this.els.btnStart);
    disable(this.els.btnStep);
    disable(this.els.btnPause);
    disable(this.els.btnResume);
    disable(this.els.btnStepBack);
    disable(this.els.btnReset);

    // 初始隐藏辅助按钮
    if (this.els.btnRandom) this.els.btnRandom.style.display = 'none';
    if (this.els.testCaseSelect) this.els.testCaseSelect.style.display = 'none';
    if (this.els.btnSaveCase) this.els.btnSaveCase.style.display = 'none';
    if (this.els.testCaseSelect) this.els.testCaseSelect.innerHTML = '<option value="">— 选择测试用例 —</option>';

    this._drawEmptyCanvas();

    // 默认选中第一个算法
    if (this.els.algoTabs.length > 0) {
      var firstTab = this.els.algoTabs[0];
      console.log('[MainController] 默认选择算法:', firstTab.dataset.algo);
      this._selectAlgorithm(firstTab.dataset.algo);
      // 自动生成随机数据以确保按钮立即可用
      if (this.els.btnStart && this.els.btnStart.disabled) {
        console.log('[MainController] 默认参数无效，自动生成随机数据');
        this._randomGenerate();
      }
    } else {
      console.warn('[MainController] 没有找到算法标签');
    }
  }

  _drawEmptyCanvas() {
    if (!this.els.canvas) return;
    var ctx = this.els.canvas.getContext('2d');
    ctx.clearRect(0, 0, this.els.canvas.width, this.els.canvas.height);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '15px "Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('选择算法并设置参数后点击"开始"或"单步执行"', this.els.canvas.width / 2, this.els.canvas.height / 2);
  }

  /* ========== 算法选择 ========== */
  _selectAlgorithm(algoId) {
    console.log('[MainController] 选择算法:', algoId);
    this.executor.reset();
    this.currentAlgoId = algoId;

    this.els.algoTabs.forEach(function(t) {
      t.classList.toggle('active', t.dataset.algo === algoId);
    });

    var meta = App.AlgorithmRegistry.get(algoId);
    if (!meta) {
      console.warn('[MainController] 算法元数据未找到:', algoId);
      return;
    }

    if (this.els.currentAlgoName) this.els.currentAlgoName.textContent = meta.algoName;
    if (this.els.timeComplexity) this.els.timeComplexity.textContent = meta.timeComplexity;
    if (this.els.spaceComplexity) this.els.spaceComplexity.textContent = meta.spaceComplexity;
    if (this.els.finalResult) this.els.finalResult.textContent = '';
    if (this.els.stepDesc) this.els.stepDesc.textContent = '请设置参数后点击"开始"或"单步执行"';
    if (this.els.stepCounter) this.els.stepCounter.textContent = '步骤 — / —';
    if (this.els.stepExplanation) this.els.stepExplanation.style.display = 'none';
    if (this.els.explanationContent) this.els.explanationContent.textContent = '';

    this._renderParamInputs(meta);
    this._createEngine(algoId);
    this._renderPseudocode();
    this._loadTestCases();
    this._loadCustomTestCases();

    // 显示辅助按钮
    if (this.els.btnRandom) this.els.btnRandom.style.display = 'inline-block';
    if (this.els.testCaseSelect) this.els.testCaseSelect.style.display = 'inline-block';
    if (this.els.btnSaveCase) this.els.btnSaveCase.style.display = 'inline-block';

    // 清空画布
    if (this.renderer && this.els.canvas) {
      this.renderer.clear(this.els.canvas);
    }

    this._updateButtonStates(ExecutorState.IDLE);
    // 重要：先重置按钮为禁用，再通过校验结果决定是否启用
    if (this.els.btnStart) this.els.btnStart.disabled = true;
    if (this.els.btnStep) this.els.btnStep.disabled = true;

    this._validateAndUpdateButtons();
  }

  _createEngine(algoId) {
    console.log('[MainController] 创建引擎:', algoId);

    // 检查对应的类是否存在
    var engineClass = null;
    var rendererClass = null;

    var classMap = {
      'bubble': ['BubbleEngine', 'BubbleRenderer'],
      'quicksort': ['QuickSortEngine', 'QuickSortRenderer'],
      'merge': ['MergeEngine', 'MergeRenderer'],
      'hanoi': ['HanoiEngine', 'HanoiRenderer'],
      'chessboard': ['ChessboardEngine', 'ChessboardRenderer'],
      'huffman': ['HuffmanEngine', 'HuffmanRenderer'],
      'dijkstra': ['DijkstraEngine', 'DijkstraRenderer'],
      'prim': ['PrimEngine', 'PrimRenderer'],
      'kruskal': ['KruskalEngine', 'KruskalRenderer'],
      'maze': ['MazeEngine', 'MazeRenderer']
    };

    var names = classMap[algoId];
    if (!names) {
      console.error('[MainController] 未知算法:', algoId);
      this.engine = null;
      this.renderer = null;
      return;
    }

    if (!App[names[0]]) {
      console.error('[MainController] 引擎类未定义: App.' + names[0]);
      this.engine = null;
      this.renderer = null;
      return;
    }
    if (!App[names[1]]) {
      console.error('[MainController] 渲染器类未定义: App.' + names[1]);
      this.engine = null;
      this.renderer = null;
      return;
    }

    this.engine = new App[names[0]]();
    this.renderer = new App[names[1]]();
    this.executor.setEngine(this.engine);
    if (this.renderer && this.engine) {
      this.renderer._engine = this.engine;
    }
    console.log('[MainController] 引擎创建成功:', names[0], '/', names[1]);
  }

  /* ========== 伪代码渲染 ========== */
  _renderPseudocode() {
    if (!this.els.pseudocodeBody) return;
    if (!this.engine || !this.engine.get_pseudocode) {
      this.els.pseudocodeBody.innerHTML = '<div class="pseudocode-placeholder">请选择一个算法</div>';
      return;
    }

    var lines = this.engine.get_pseudocode();
    if (!lines || lines.length === 0) {
      this.els.pseudocodeBody.innerHTML = '<div class="pseudocode-placeholder">该算法暂无伪代码</div>';
      return;
    }

    var html = '';
    lines.forEach(function(line, idx) {
      var indentPx = line.indent * 24;
      var cls = 'pseudocode-line';
      if (line.separator) cls += ' separator';
      html += '<div class="' + cls + '" data-line="' + idx + '">' +
        '<span class="pseudocode-line-number">' + idx + '</span>' +
        '<span class="line-indent" style="width:' + indentPx + 'px;"></span>' +
        '<span class="line-text">' + line.text + '</span>' +
        '</div>';
    });
    this.els.pseudocodeBody.innerHTML = html;
  }

  _highlightPseudocodeLines(activeLines) {
    if (!this.els.pseudocodeBody) return;
    var allLines = this.els.pseudocodeBody.querySelectorAll('.pseudocode-line');
    allLines.forEach(function(el) { el.classList.remove('active'); });

    if (!activeLines || activeLines.length === 0) return;

    activeLines.forEach(function(lineNum) {
      var el = document.querySelector('.pseudocode-line[data-line="' + lineNum + '"]');
      if (el) el.classList.add('active');
    });
  }

  /* ========== 参数输入区域 ========== */
  _renderParamInputs(meta) {
    if (!this.els.paramArea) return;
    var html = '';
    meta.paramDefs.forEach(function(def) {
      var defaultVal = def.defaultValue !== undefined && def.defaultValue !== null ? def.defaultValue : '';
      html += '<div class="param-row">' +
        '<label class="param-label">' + def.paramName + '：</label>' +
        '<input type="text" class="param-input" data-param="' + def.paramName + '"' +
        ' placeholder="' + (def.description || '') + '"' +
        ' value="' + defaultVal + '" />' +
        '<span class="param-hint">' + (def.description || '') + '</span>' +
        '</div>';
    });
    this.els.paramArea.innerHTML = html;

    var self = this;
    var inputs = this.els.paramArea.querySelectorAll('.param-input');
    inputs.forEach(function(input) {
      input.addEventListener('input', function() { self._validateAndUpdateButtons(); });
    });
  }

  _getCurrentParams() {
    var params = {};
    if (!this.els.paramArea) return params;
    var inputs = this.els.paramArea.querySelectorAll('.param-input');
    inputs.forEach(function(input) {
      params[input.dataset.param] = input.value;
    });
    return params;
  }

  _setParams(params) {
    if (!this.els.paramArea) return;
    var inputs = this.els.paramArea.querySelectorAll('.param-input');
    inputs.forEach(function(input) {
      if (params[input.dataset.param] !== undefined) {
        input.value = params[input.dataset.param];
      }
    });
  }

  _validateAndUpdateButtons() {
    if (!this.currentAlgoId || !this.engine) return;

    var params = this._getCurrentParams();
    console.log('[MainController] 验证参数:', this.currentAlgoId, JSON.stringify(params));

    var validatorMap = {
      'bubble': 'validateBubble',
      'quicksort': 'validateQuickSort',
      'merge': 'validateMerge',
      'hanoi': 'validateHanoi',
      'chessboard': 'validateChessboard',
      'huffman': 'validateHuffman',
      'dijkstra': 'validateDijkstra',
      'prim': 'validatePrim',
      'kruskal': 'validateKruskal',
      'maze': 'validateMaze'
    };

    var methodName = validatorMap[this.currentAlgoId];
    if (!methodName || !App.ParamValidator[methodName]) {
      console.error('[MainController] 验证方法未找到:', methodName);
      return;
    }

    var result = App.ParamValidator[methodName](params);

    // 清除旧错误提示
    if (this.els.paramArea) {
      var errors = this.els.paramArea.querySelectorAll('.param-error');
      errors.forEach(function(e) { e.remove(); });
      var errorInputs = this.els.paramArea.querySelectorAll('.input-error');
      errorInputs.forEach(function(e) { e.classList.remove('input-error'); });
    }

    if (!result.is_valid) {
      console.log('[MainController] 参数无效:', result.error);
      if (this.els.btnStart) this.els.btnStart.disabled = true;
      if (this.els.btnStep) this.els.btnStep.disabled = true;
      // 显示错误
      if (this.els.paramArea) {
        var errEl = document.createElement('div');
        errEl.className = 'param-error';
        errEl.textContent = result.error;
        this.els.paramArea.appendChild(errEl);
      }
    } else {
      console.log('[MainController] 参数有效，启用按钮');
      // 只在 IDLE 状态下启用按钮
      if (this.executor.getState() === ExecutorState.IDLE) {
        if (this.els.btnStart) this.els.btnStart.disabled = false;
        if (this.els.btnStep) this.els.btnStep.disabled = false;
      }
    }
  }

  /* ========== 随机生成 ========== */
  _randomGenerate() {
    console.log('[MainController] 随机生成参数，算法:', this.currentAlgoId);
    if (!this.currentAlgoId) return;

    var genMap = {
      'bubble': 'forBubble',
      'quicksort': 'forQuickSort',
      'merge': 'forMerge',
      'hanoi': 'forHanoi',
      'chessboard': 'forChessboard',
      'huffman': 'forHuffman',
      'dijkstra': 'forDijkstra',
      'prim': 'forPrim',
      'kruskal': 'forKruskal',
      'maze': 'forMaze'
    };

    var methodName = genMap[this.currentAlgoId];
    if (methodName && App.RandomDataGenerator[methodName]) {
      var params = App.RandomDataGenerator[methodName]();
      console.log('[MainController] 生成结果:', JSON.stringify(params));
      if (params) {
        this._setParams(params);
        this._validateAndUpdateButtons();
      }
    } else {
      console.error('[MainController] 随机生成方法未找到:', methodName);
    }
  }

  /* ========== 测试用例 ========== */
  _loadTestCases() {
    if (!this.engine || !this.els.testCaseSelect) return;
    this.testCases = this.engine.get_test_cases ? this.engine.get_test_cases() : [];
    var html = '<optgroup label="系统预设用例">';
    var self = this;
    this.testCases.forEach(function(tc, i) {
      html += '<option value="system_' + i + '">[' + tc.caseType + '] ' + tc.caseName + '</option>';
    });
    html += '</optgroup>';

    var customCases = App.CustomTestDataManager.getAllForAlgo(this.currentAlgoId);
    if (customCases.length > 0) {
      html += '<optgroup label="用户自定义用例">';
      customCases.forEach(function(tc, i) {
        html += '<option value="custom_' + i + '">[' + tc.caseType + '] ' + tc.caseName + '</option>';
      });
      html += '</optgroup>';
    }

    html += '<option value="">— 选择测试用例 —</option>';
    this.els.testCaseSelect.innerHTML = html;
    console.log('[MainController] 测试用例加载完成，共', this.testCases.length + customCases.length, '个');
  }

  _loadCustomTestCases() {
    if (!this.els.customCaseSection || !this.els.customCaseList) return;
    var self = this;
    var customCases = App.CustomTestDataManager.getAllForAlgo(this.currentAlgoId);
    if (customCases.length > 0) {
      this.els.customCaseSection.style.display = 'block';
      var html = '';
      customCases.forEach(function(tc) {
        html += '<div class="custom-case-item">' +
          '<span class="custom-case-name">' + tc.caseName + '</span>' +
          '<button class="btn-del-case" data-id="' + tc.caseId + '" title="删除此用例">x</button>' +
          '</div>';
      });
      this.els.customCaseList.innerHTML = html;

      var nameSpans = this.els.customCaseList.querySelectorAll('.custom-case-name');
      nameSpans.forEach(function(span) {
        span.addEventListener('click', function() {
          var caseName = span.textContent;
          var tc = customCases.find(function(c) { return c.caseName === caseName; });
          if (tc) {
            self._setParams(tc.params);
            self._validateAndUpdateButtons();
          }
        });
      });

      var delBtns = this.els.customCaseList.querySelectorAll('.btn-del-case');
      delBtns.forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var caseId = btn.dataset.id;
          App.CustomTestDataManager.delete(self.currentAlgoId, caseId);
          self._loadTestCases();
          self._loadCustomTestCases();
        });
      });
    } else {
      this.els.customCaseSection.style.display = 'none';
    }
  }

  _loadTestCase() {
    if (!this.els.testCaseSelect) return;
    var val = this.els.testCaseSelect.value;
    if (val === '') return;
    console.log('[MainController] 加载测试用例:', val);

    var tc = null;
    if (val.indexOf('system_') === 0) {
      var idx = parseInt(val.replace('system_', ''));
      tc = this.testCases[idx];
    } else if (val.indexOf('custom_') === 0) {
      var idx2 = parseInt(val.replace('custom_', ''));
      var customCases = App.CustomTestDataManager.getAllForAlgo(this.currentAlgoId);
      tc = customCases[idx2];
    }

    if (tc && tc.params) {
      this._setParams(tc.params);
      this._validateAndUpdateButtons();
    }
  }

  /* ========== 执行控制 ========== */
  _start() {
    console.log('[MainController] 开始执行，当前状态:', this.executor.getState());
    if (!this.engine || this.executor.getState() === ExecutorState.RUNNING) return;

    var state = this.executor.getState();
    if (state === ExecutorState.IDLE) {
      var params = this._getCurrentParams();
      console.log('[MainController] 初始化参数:', JSON.stringify(params));
      var result = this.engine.initialize(params);
      if (!result) {
        alert('参数初始化失败，请检查输入');
        return;
      }
      if (this.els.finalResult) this.els.finalResult.textContent = '';
      if (this.els.stepDesc) this.els.stepDesc.textContent = '';
      if (this.els.stepExplanation) this.els.stepExplanation.style.display = 'none';
      this._resizeCanvas();
    }

    this._syncRendererEngine();
    var interval = this._getSpeedInterval();
    this.executor.play(interval);
    console.log('[MainController] 自动播放已启动，间隔:', interval, 'ms');
  }

  _step() {
    console.log('[MainController] 单步执行，当前状态:', this.executor.getState());
    if (!this.engine) return;

    if (this.executor.getState() === ExecutorState.IDLE) {
      var params = this._getCurrentParams();
      var result = this.engine.initialize(params);
      if (!result) {
        alert('参数初始化失败，请检查输入');
        return;
      }
      if (this.els.finalResult) this.els.finalResult.textContent = '';
      if (this.els.stepDesc) this.els.stepDesc.textContent = '';
      if (this.els.stepExplanation) this.els.stepExplanation.style.display = 'none';
      this._resizeCanvas();
      this._syncRendererEngine();
    }
    this._syncRendererEngine();

    this.executor.stepOnce();
    if (this.executor.getState() === ExecutorState.FINISHED) {
      this._onComplete();
    }
    this._updateButtonStates(this.executor.getState());
  }

  _pause() {
    console.log('[MainController] 暂停');
    this.executor.pause();
  }

  _resume() {
    console.log('[MainController] 继续');
    this._syncRendererEngine();
    this.executor.resume();
  }

  _syncRendererEngine() {
    if (this.renderer) {
      this.renderer._engine = this.engine;
    }
  }

  _stepBack() {
    console.log('[MainController] 回退');
    this.executor.stepBack();
    this._updateButtonStates(this.executor.getState());
  }

  _reset() {
    console.log('[MainController] 重置');
    this.executor.reset();
    if (this.renderer && this.els.canvas) {
      this.renderer.clear(this.els.canvas);
    }
    if (this.els.stepDesc) this.els.stepDesc.textContent = '请设置参数后点击"开始"或"单步执行"';
    if (this.els.stepCounter) this.els.stepCounter.textContent = '步骤 — / —';
    if (this.els.finalResult) this.els.finalResult.textContent = '';
    if (this.els.stepExplanation) this.els.stepExplanation.style.display = 'none';
    if (this.els.explanationContent) this.els.explanationContent.textContent = '';
    this._highlightPseudocodeLines([]);
    this._updateButtonStates(ExecutorState.IDLE);
    // 重置后重新启用按钮（前提是参数有效）
    this._validateAndUpdateButtons();
  }

  _getSpeedInterval() {
    if (!this.els.speedSlider) return 800;
    var val = parseInt(this.els.speedSlider.value || 5);
    return Math.max(150, 1200 - (val - 1) * 116);
  }

  _updateSpeed() {
    if (this.executor.getState() === ExecutorState.RUNNING) {
      this._pause();
      this.executor.intervalMs = this._getSpeedInterval();
      this._resume();
    }
  }

  /* ========== 讲解模式 ========== */
  _toggleLectureMode() {
    this.lectureMode = !!(this.els.lectureToggle && this.els.lectureToggle.checked);
    console.log('[MainController] 讲解模式:', this.lectureMode ? '开启' : '关闭');
    if (this.els.explanationPanel) {
      this.els.explanationPanel.style.display = this.lectureMode ? 'block' : 'none';
    }
    if (this.lectureMode) {
      var step = this.executor.recorder.getCurrent();
      if (step && step.explanation) {
        if (this.els.stepExplanation) {
          this.els.stepExplanation.style.display = 'block';
          this.els.stepExplanation.textContent = '讲解：' + step.explanation;
        }
        if (this.els.explanationContent) {
          this.els.explanationContent.textContent = step.explanation;
        }
      }
    } else {
      if (this.els.stepExplanation) this.els.stepExplanation.style.display = 'none';
      if (this.els.explanationContent) this.els.explanationContent.textContent = '';
    }
  }

  /* ========== 导出日志 ========== */
  _showExportModal() {
    console.log('[MainController] 显示导出弹窗');
    if (this.executor.getState() === ExecutorState.IDLE) {
      alert('请先执行算法再导出日志');
      return;
    }
    if (this.els.exportModal) this.els.exportModal.style.display = 'flex';
  }

  _exportLog(format) {
    console.log('[MainController] 导出日志，格式:', format);
    if (this.els.exportModal) this.els.exportModal.style.display = 'none';
    if (this.executor.getState() === ExecutorState.IDLE || !this.currentAlgoId) return;

    var meta = App.AlgorithmRegistry.get(this.currentAlgoId);
    if (!meta) return;

    var steps = this.executor.recorder.getAllSteps();
    var input = this._getCurrentParams();
    var complexity = this.engine ? this.engine.get_complexity() : { time: '', space: '' };
    var finalResult = (this.els.finalResult && this.els.finalResult.textContent) || '未完成';

    var content, fileName;
    var algoName = meta.algoName;

    if (format === 'json') {
      content = App.LogExporter.exportJSON(algoName, input, steps, complexity, finalResult);
      fileName = algoName + '_日志_' + new Date().toISOString().slice(0, 10) + '.json';
    } else {
      content = App.LogExporter.exportTXT(algoName, input, steps, complexity, finalResult);
      fileName = algoName + '_日志_' + new Date().toISOString().slice(0, 10) + '.txt';
    }
    App.LogExporter.download(content, fileName);
    console.log('[MainController] 日志已导出:', fileName);
  }

  /* ========== 保存自定义测试数据 ========== */
  _showSaveCaseModal() {
    console.log('[MainController] 显示保存用例弹窗');
    if (!this.currentAlgoId) return;
    if (this.els.saveCaseName) this.els.saveCaseName.value = '';
    if (this.els.saveCaseModal) this.els.saveCaseModal.style.display = 'flex';
  }

  _saveCustomCase() {
    var caseName = this.els.saveCaseName ? this.els.saveCaseName.value.trim() : '';
    if (!caseName) {
      alert('请输入用例名称');
      return;
    }
    var params = this._getCurrentParams();
    var result = App.CustomTestDataManager.save(this.currentAlgoId, caseName, params);
    if (result) {
      if (this.els.saveCaseModal) this.els.saveCaseModal.style.display = 'none';
      this._loadTestCases();
      this._loadCustomTestCases();
      console.log('[MainController] 自定义用例已保存:', caseName);
    } else {
      alert('保存失败，可能存储空间不足');
    }
  }

  /* ========== 排序对比模式 ========== */
  _toggleCompareMode() {
    console.log('[MainController] 切换对比模式');
    if (!this.els.compareContainer) return;
    var container = this.els.compareContainer;
    var isVisible = container.style.display !== 'none';

    if (isVisible) {
      container.style.display = 'none';
      if (this.els.mainContainer) this.els.mainContainer.style.display = '';
      if (this.els.mainControlBar) this.els.mainControlBar.style.display = '';
      if (this.els.bottomBar) this.els.bottomBar.style.display = '';
      if (this.els.btnToggleCompare) {
        this.els.btnToggleCompare.textContent = '排序对比';
        this.els.btnToggleCompare.classList.remove('active');
      }
    } else {
      container.style.display = 'block';
      if (this.els.mainContainer) this.els.mainContainer.style.display = 'none';
      if (this.els.mainControlBar) this.els.mainControlBar.style.display = 'none';
      if (this.els.bottomBar) this.els.bottomBar.style.display = 'none';
      if (this.els.btnToggleCompare) {
        this.els.btnToggleCompare.textContent = '退出对比';
        this.els.btnToggleCompare.classList.add('active');
      }

      if (!this.compareController) {
        try {
          this.compareController = new App.SortCompareController();
          console.log('[MainController] 对比模式控制器已创建');
        } catch (e) {
          console.error('[MainController] 创建对比模式控制器失败:', e.message);
          alert('对比模式初始化失败：' + e.message);
        }
      }
      if (this.compareController) {
        this.compareController._createEngines();
        this.compareController.resize();
        this.compareController._updateButtonStates();
      }
    }
  }
};

/* ========== 应用入口（加固版） ========== */
(function initApp() {
  console.log('[App] 初始化入口触发, readyState=' + document.readyState);

  function doInit() {
    console.log('[App] 开始创建 MainController...');
    try {
      if (!App.StepExecutor) throw new Error('App.StepExecutor 未定义，请检查 common.js 是否正常加载');
      App.controller = new App.MainController();
      console.log('[App] MainController 创建成功');
    } catch (e) {
      console.error('[App] MainController 创建失败:', e.message, e.stack);
      var div = document.createElement('div');
      div.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#dc2626;color:#fff;padding:20px;text-align:center;z-index:99999;font-size:14px;font-family:"Microsoft YaHei",sans-serif;';
      div.innerHTML = '<strong>系统启动失败</strong><br>' + e.message + '<br><small>请打开浏览器控制台(F12)查看详细错误信息</small>';
      document.body.appendChild(div);
    }
  }

  // 如果 DOM 已经就绪，直接初始化；否则等待 DOMContentLoaded
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    console.log('[App] DOM已就绪，立即初始化');
    doInit();
  } else {
    console.log('[App] 等待 DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', doInit);
  }
})();
