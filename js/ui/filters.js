/**
 * 过滤器组件 - 管理节点类型过滤
 */
export class Filters {
    constructor(eventBus) {
      this.eventBus = eventBus;
      this.filterPanel = document.getElementById('filter-panel');
      this.filterAll = null;
      this.filterCheckboxes = {};
      this.nodeTypes = {};
      
      // 监听来自数据模型的事件
      this.eventBus.on('node-types-loaded', (nodeTypes) => {
        this.nodeTypes = nodeTypes;
        this.renderFilters();
      });
    }
    
    /**
     * 初始化过滤器
     */
    initialize() {
      return this;
    }
    
    /**
     * 渲染过滤器界面
     */
    renderFilters() {
      // 清空现有内容
      this.filterPanel.innerHTML = '';
      
      // 创建标题
      const title = document.createElement('h2');
      title.textContent = '节点过滤';
      this.filterPanel.appendChild(title);
      
      // 创建过滤组
      const filterGroup = document.createElement('div');
      filterGroup.className = 'filter-group';
      
      // 创建"全部显示"选项
      const allItem = document.createElement('div');
      allItem.className = 'filter-item';
      
      const allCheckbox = document.createElement('input');
      allCheckbox.type = 'checkbox';
      allCheckbox.id = 'filter-all';
      allCheckbox.checked = true;
      
      const allLabel = document.createElement('label');
      allLabel.htmlFor = 'filter-all';
      allLabel.textContent = '全部显示';
      
      allItem.appendChild(allCheckbox);
      allItem.appendChild(allLabel);
      filterGroup.appendChild(allItem);
      
      this.filterAll = allCheckbox;
      
      // 为每种节点类型创建过滤项
      Object.entries(this.nodeTypes).forEach(([type, config]) => {
        const item = document.createElement('div');
        item.className = 'filter-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `filter-${type}`;
        checkbox.disabled = this.filterAll.checked;
        
        const colorSpan = document.createElement('span');
        colorSpan.className = 'filter-color';
        colorSpan.style.backgroundColor = config.color;
        
        const label = document.createElement('label');
        label.htmlFor = `filter-${type}`;
        label.textContent = config.name;
        
        item.appendChild(checkbox);
        item.appendChild(colorSpan);
        item.appendChild(label);
        filterGroup.appendChild(item);
        
        // 存储复选框引用
        this.filterCheckboxes[type] = checkbox;
      });
      
      this.filterPanel.appendChild(filterGroup);
      
      // 添加事件监听器
      this._setupEventListeners();
    }
    
    /**
     * 设置交互启用状态
     * @param {boolean} enabled 是否启用
     */
    setInteractionEnabled(enabled) {
      // 禁用/启用过滤器
      this.filterAll.disabled = !enabled || this.filterAll.checked;
      
      Object.values(this.filterCheckboxes).forEach(checkbox => {
        checkbox.disabled = !enabled || this.filterAll.checked;
      });
      
      return this;
    }
    
    /**
     * 获取选中的节点类型
     */
    getSelectedTypes() {
      if (this.filterAll.checked) {
        return null; // 显示所有类型
      }
      
      const selectedTypes = [];
      Object.entries(this.filterCheckboxes).forEach(([type, checkbox]) => {
        if (checkbox.checked) {
          selectedTypes.push(type);
        }
      });
      
      return selectedTypes;
    }
    
    // 私有方法
    
    /**
     * 设置事件监听器
     * @private
     */
    _setupEventListeners() {
      // 全部选项的事件处理
      this.filterAll.addEventListener('change', () => {
        const isChecked = this.filterAll.checked;
        
        // 禁用/启用其他复选框
        Object.values(this.filterCheckboxes).forEach(checkbox => {
          checkbox.checked = false;
          checkbox.disabled = isChecked;
        });
        
        // 触发过滤更新事件
        this.eventBus.emit('filter-changed', this.getSelectedTypes());
      });
      
      // 各节点类型复选框的事件处理
      Object.values(this.filterCheckboxes).forEach(checkbox => {
        checkbox.addEventListener('change', () => {
          // 如果任何特定类型被选中，取消"全部"选项
          if (checkbox.checked) {
            this.filterAll.checked = false;
          }
          
          // 如果所有特定类型都没有被选中，选中"全部"选项
          if (!Object.values(this.filterCheckboxes).some(cb => cb.checked)) {
            this.filterAll.checked = true;
            Object.values(this.filterCheckboxes).forEach(cb => {
              cb.disabled = true;
            });
          }
          
          // 触发过滤更新事件
          this.eventBus.emit('filter-changed', this.getSelectedTypes());
        });
      });
      
      // 监听分析状态变化
      this.eventBus.on('analysis-started', () => {
        this.setInteractionEnabled(false);
      });
      
      this.eventBus.on('analysis-stopped', () => {
        this.setInteractionEnabled(true);
      });
    }
  }