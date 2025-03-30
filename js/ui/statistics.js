/**
 * 统计信息组件 - 显示分析统计数据
 */
export class Statistics {
    constructor(eventBus) {
      this.eventBus = eventBus;
      this.statsPanel = document.getElementById('stats-panel');
      this.pendingCount = null;
      this.analyzingCount = null;
      this.partialCount = null;
      this.completedCount = null;
      this.totalProgress = null;
      
      this._setupEventListeners();
      this._renderUI();
    }
    
    /**
     * 初始化统计面板
     */
    initialize() {
      // 初始统计数据
      this.updateStats({
        pending: 0,
        analyzing: 0,
        partial: 0,
        completed: 0,
        totalProgress: 0
      });
      
      return this;
    }
    
    /**
     * 更新统计数据
     * @param {Object} stats 统计数据对象
     */
    updateStats(stats) {
      if (this.pendingCount) {
        this.pendingCount.textContent = stats.pending;
      }
      
      if (this.analyzingCount) {
        this.analyzingCount.textContent = stats.analyzing;
      }
      
      if (this.partialCount) {
        this.partialCount.textContent = stats.partial;
      }
      
      if (this.completedCount) {
        this.completedCount.textContent = stats.completed;
      }
      
      if (this.totalProgress) {
        this.totalProgress.textContent = stats.totalProgress + '%';
      }
      
      return this;
    }
    
    // 私有方法
    
    /**
     * 设置事件监听器
     * @private
     */
    _setupEventListeners() {
      // 监听统计数据更新事件
      this.eventBus.on('stats-updated', (stats) => {
        this.updateStats(stats);
      });
    }
    
    /**
     * 渲染UI
     * @private
     */
    _renderUI() {
      // 清空现有内容
      this.statsPanel.innerHTML = '';
      
      // 创建标题
      const title = document.createElement('h3');
      title.textContent = '解析统计';
      this.statsPanel.appendChild(title);
      
      // 创建统计网格
      const statsGrid = document.createElement('div');
      statsGrid.className = 'stats-grid';
      
      // 添加统计项
      statsGrid.appendChild(this._createStatBox('pending-count', '待分析'));
      statsGrid.appendChild(this._createStatBox('analyzing-count', '分析中'));
      statsGrid.appendChild(this._createStatBox('partial-count', '部分完成'));
      statsGrid.appendChild(this._createStatBox('completed-count', '分析完成'));
      statsGrid.appendChild(this._createStatBox('total-progress', '总体进度'));
      
      this.statsPanel.appendChild(statsGrid);
      
      // 保存DOM引用
      this.pendingCount = document.getElementById('pending-count');
      this.analyzingCount = document.getElementById('analyzing-count');
      this.partialCount = document.getElementById('partial-count');
      this.completedCount = document.getElementById('completed-count');
      this.totalProgress = document.getElementById('total-progress');
    }
    
    /**
     * 创建统计项
     * @private
     */
    _createStatBox(id, label) {
      const box = document.createElement('div');
      box.className = 'stat-box';
      
      const value = document.createElement('div');
      value.className = 'stat-value';
      value.id = id;
      value.textContent = '0';
      
      const labelEl = document.createElement('div');
      labelEl.className = 'stat-label';
      labelEl.textContent = label;
      
      box.appendChild(value);
      box.appendChild(labelEl);
      
      return box;
    }
  }