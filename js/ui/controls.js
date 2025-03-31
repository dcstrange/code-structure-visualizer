/**
 * UI控制组件 - 管理用户界面控制
 */
export class Controls {
    constructor(eventBus) {
      this.eventBus = eventBus;
      this.statusEl = document.getElementById('status');
      this.startButton = document.getElementById('startAnalysis');
      this.stopButton = document.getElementById('stopAnalysis');
      this.continueButton = document.getElementById('continueAnalysis');
      this.resetViewButton = document.getElementById('resetView');
      this.threadCount = document.getElementById('threadCount');
      this.analysisMode = document.getElementById('analysisMode');
      this.visualizerType = document.getElementById('visualizerType');
      this.nodeCount = document.getElementById('nodeCount');
      this.revealInfo = document.getElementById('reveal-info');
      this.zoomInButton = document.getElementById('zoom-in');
      this.zoomOutButton = document.getElementById('zoom-out');
      this.zoomFitButton = document.getElementById('zoom-fit');
      
      this.isAnalysisRunning = false;
      
      this._setupEventListeners();
    }
    
    /**
     * 初始化控制
     */
    initialize() {
      // 初始状态设置
      this.continueButton.disabled = true;
      this.statusEl.textContent = "系统就绪，等待分析指令";
      
      // 显示提示信息
      this.revealInfo.style.display = 'none';
      this.revealInfo.textContent = '代码结构解析进度: 0%';
      
      return this;
    }
    
    /**
     * 设置状态文本
     * @param {string} text 状态文本
     */
    setStatus(text) {
      this.statusEl.textContent = text;
      return this;
    }
    
    /**
     * 显示进度信息
     * @param {number} progress 进度百分比
     */
    showProgress(progress) {
      // 确保进度值为整数
      progress = Math.round(progress);
      
      // 记录进度变化
      console.log(`显示进度更新: ${progress}%`);
      
      // 显示进度信息
      this.revealInfo.style.display = 'block';
      this.revealInfo.textContent = `代码结构解析进度: ${progress}%`;
      
      // 添加视觉反馈 - 设置背景颜色根据进度变化
      const intensity = Math.min(100, progress) / 100;
      const hue = 120 * intensity; // 从红色(0)到绿色(120)
      this.revealInfo.style.backgroundColor = `hsla(${hue}, 70%, 60%, 0.2)`;
      this.revealInfo.style.transition = 'background-color 0.5s';
      
      // 完成时特殊处理
      if (progress >= 100) {
        this.revealInfo.textContent = '代码结构解析完成!';
        this.revealInfo.style.backgroundColor = 'rgba(76, 175, 80, 0.3)'; // 更明显的绿色
        this.revealInfo.style.fontWeight = 'bold';
        
        // 3秒后淡出
        setTimeout(() => {
          this.revealInfo.style.opacity = '0';
          this.revealInfo.style.transition = 'opacity 1s';
          setTimeout(() => {
            this.revealInfo.style.display = 'none';
            this.revealInfo.style.opacity = '1';
            this.revealInfo.style.fontWeight = 'normal';
            this.revealInfo.style.backgroundColor = '';
          }, 1000);
        }, 3000);
      }
      
      return this;
    }
    
    /**
     * 设置分析状态
     * @param {boolean} isRunning 是否正在分析
     */
    setAnalysisState(isRunning) {
      this.isAnalysisRunning = isRunning;
      
      // 更新按钮状态
      this.startButton.disabled = isRunning;
      this.stopButton.disabled = !isRunning;
      
      // 添加或删除分析中的类名，用于CSS样式和视觉反馈
      if (isRunning) {
        document.body.classList.add('analyzing-active');
      } else {
        document.body.classList.remove('analyzing-active');
      }
      
      return this;
    }
    
    /**
     * 启用继续分析按钮
     * @param {boolean} enabled 是否启用
     */
    setContinueEnabled(enabled) {
      this.continueButton.disabled = !enabled;
      return this;
    }
    
    /**
     * 获取线程数量
     */
    getThreadCount() {
      return parseInt(this.threadCount.value, 10);
    }
    
    /**
     * 获取分析模式
     */
    getAnalysisMode() {
      return this.analysisMode.value;
    }
    
    /**
     * 获取可视化类型
     */
    getVisualizerType() {
      return this.visualizerType.value;
    }
    
    /**
     * 获取节点数量
     */
    getNodeCount() {
      return parseInt(this.nodeCount.value, 10);
    }
    
    // 私有方法
    
    /**
     * 设置事件监听器
     * @private
     */
    _setupEventListeners() {
      // 开始分析
      this.startButton.addEventListener('click', () => {
        if (this.isAnalysisRunning) return;
        
        const threadCount = this.getThreadCount();
        const mode = this.getAnalysisMode();
        
        this.eventBus.emit('start-analysis-requested', threadCount, mode);
      });
      
      // 停止分析
      this.stopButton.addEventListener('click', () => {
        if (!this.isAnalysisRunning) return;
        
        this.eventBus.emit('stop-analysis-requested');
      });
      
      // 继续深入分析
      this.continueButton.addEventListener('click', () => {
        if (this.isAnalysisRunning) return;
        
        const threadCount = this.getThreadCount();
        
        this.eventBus.emit('continue-analysis-requested', threadCount);
        this.continueButton.disabled = true;
      });
      
      // 重置视图
      this.resetViewButton.addEventListener('click', () => {
        this.eventBus.emit('reset-view-requested');
      });
      
      // 缩放控制
      this.zoomInButton.addEventListener('click', () => {
        this.eventBus.emit('zoom-in-requested');
      });
      
      this.zoomOutButton.addEventListener('click', () => {
        this.eventBus.emit('zoom-out-requested');
      });
      
      this.zoomFitButton.addEventListener('click', () => {
        this.eventBus.emit('zoom-fit-requested');
      });
      
      // 分析模式变更
      this.analysisMode.addEventListener('change', () => {
        this.eventBus.emit('analysis-mode-changed', this.getAnalysisMode());
      });
      
      // 可视化类型变更
      this.visualizerType.addEventListener('change', () => {
        this.eventBus.emit('visualizer-type-changed', this.getVisualizerType());
      });
      
      // 节点数量变更
      this.nodeCount.addEventListener('change', () => {
        this.eventBus.emit('node-count-changed', this.getNodeCount());
      });
      
      // 监听来自其他组件的事件
      this.eventBus.on('analysis-started', (threadCount) => {
        this.setStatus(`解析启动: ${threadCount}线程并行分析中`);
        this.setAnalysisState(true);
      });
      
      this.eventBus.on('analysis-stopped', () => {
        this.setStatus("分析已暂停");
        this.setAnalysisState(false);
      });
      
      this.eventBus.on('deep-analysis-started', (threadCount) => {
        this.setStatus(`继续深入分析: ${threadCount}线程并行分析中`);
        this.setAnalysisState(true);
      });
      
      this.eventBus.on('stats-updated', (stats) => {
        if (stats.totalProgress !== undefined) {
          this.showProgress(stats.totalProgress);
        }
        
        // 分析完成
        if (stats.pending === 0 && stats.analyzing === 0 && stats.partial === 0) {
          if (this.isAnalysisRunning) {
            this.setStatus("分析完成！所有代码结构已解析");
            this.setAnalysisState(false);
          }
        }
        // 需要深入分析
        else if (stats.pending === 0 && stats.analyzing === 0 && stats.partial > 0) {
          this.setContinueEnabled(true);
        }
        else {
          this.setContinueEnabled(false);
        }
      });
    }
  }