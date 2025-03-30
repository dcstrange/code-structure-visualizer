import { Visualizer } from './visualizer.js';
import { mixColors } from '../utils/color-utils.js';

/**
 * Cytoscape适配器 - 将通用API转换为Cytoscape特定实现
 */
export class CytoscapeAdapter extends Visualizer {
  constructor(container, miniMapContainer, eventBus) {
    super(container, miniMapContainer, eventBus);
    this.cy = null;
    this.miniMapCy = null;
    this.currentZoom = 1;
    this.maxZoom = 5;
    this.minZoom = 0.5;
    this.defaultZoom = 1;
    
    // 添加对UI控件的引用
    this.zoomInButton = document.getElementById('zoom-in');
    this.zoomOutButton = document.getElementById('zoom-out');
    this.zoomFitButton = document.getElementById('zoom-fit');
    this.resetViewButton = document.getElementById('resetView');
  }
  
  /**
   * 初始化Cytoscape图表
   */
  initialize() {
    // 确保加载了Cytoscape库
    if (typeof cytoscape === 'undefined') {
      console.error('Cytoscape库未加载');
      this.eventBus.emit('visualization-error', 'Cytoscape库未加载');
      return this;
    }
    
    // 初始化样式
    const stylesheet = [
      {
        selector: 'node',
        style: {
          'background-color': 'data(color)',
          'border-color': 'data(borderColor)',
          'border-width': 'data(borderWidth)',
          'width': 'data(size)',
          'height': 'data(size)',
          'shape': 'data(shape)',
          'label': 'data(label)',
          'color': '#d1d5db',
          'text-valign': 'bottom',
          'text-halign': 'center',
          'font-size': '12px',
          'font-family': 'JetBrains Mono, monospace',
          'text-margin-y': 5,
          'opacity': 'data(opacity)'
        }
      },
      {
        selector: 'edge',
        style: {
          'width': 'data(width)',
          'line-color': 'data(color)',
          'target-arrow-color': 'data(color)',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'opacity': 'data(opacity)'
        }
      },
      {
        selector: 'node:selected',
        style: {
          'border-width': 3,
          'border-color': '#bd93f9'
        }
      },
      {
        selector: 'edge:selected',
        style: {
          'width': 3,
          'line-color': '#bd93f9',
          'target-arrow-color': '#bd93f9'
        }
      }
    ];
    
    // 初始化主图
    this.cy = cytoscape({
      container: this.container,
      style: stylesheet,
      layout: { name: 'preset' },
      minZoom: this.minZoom,
      maxZoom: this.maxZoom,
      zoom: this.currentZoom,
      wheelSensitivity: 0.2,
      pixelRatio: 'auto',
      elements: [],
      boxSelectionEnabled: false
    });
    
    // 初始化小地图
    if (this.miniMapContainer) {
      this.miniMapCy = cytoscape({
        container: this.miniMapContainer,
        style: stylesheet,
        layout: { name: 'preset' },
        zoom: 0.5,
        minZoom: 0.5,
        maxZoom: 0.5,
        userZoomingEnabled: false,
        userPanningEnabled: false,
        boxSelectionEnabled: false,
        autoungrabify: true,
        elements: []
      });
    }
    
    // 添加事件监听
    this._setupEventListeners();
    
    return this;
  }
  
  /**
   * 销毁图表实例
   */
  destroy() {
    // 清理DOM元素
    this._clearProgressElements();
    
    // 销毁Cytoscape实例
    if (this.cy) {
      this.cy.destroy();
      this.cy = null;
    }
    
    // 销毁小地图
    if (this.miniMapCy) {
      this.miniMapCy.destroy();
      this.miniMapCy = null;
    }
    
    return this;
  }
  
  /**
   * 更新节点数据
   */
  updateNodes(nodes) {
    if (!this.cy) return this;
    
    // 删除所有现有节点
    this.cy.nodes().remove();
    
    // 添加新节点
    const cyNodes = nodes.map(node => this._formatNode(node));
    this.cy.add(cyNodes);
    
    return this;
  }
  
  /**
   * 更新连接数据
   */
  updateLinks(links) {
    if (!this.cy) return this;
    
    // 删除所有现有边
    this.cy.edges().remove();
    
    // 添加新边
    const cyEdges = links.map(link => this._formatLink(link));
    this.cy.add(cyEdges);
    
    return this;
  }
  
  /**
   * 更新节点状态
   */
  updateNodeStatus(nodeId, status, progress, phase = null) {
    // 实现节点状态更新逻辑
    const progressBar = this.progressBars[nodeId];
    if (!progressBar) return this;
    
    const progressFill = progressBar.firstChild;
    
    // 计算颜色渐变程度
    let colorRatio = 0;
    
    if (status === 'pending') {
      colorRatio = 0; // 灰色
    } else if (status === 'analyzing') {
      // 分析中 - 0-25%的彩色
      colorRatio = Math.min(0.25, (progress / 100) * 0.25);
    } else if (status === 'partial') {
      // 根据完成的阶段计算颜色混合比例
      const node = this.cy.$id(nodeId);
      if (node && node.length > 0) {
        const nodeData = node.data();
        const baseRatio = 0.25;
        const maxPhaseRatio = 0.75;
        colorRatio = baseRatio + ((nodeData.currentPhase / nodeData.requiredPhases) * (maxPhaseRatio - baseRatio));
      }
    } else if (status === 'completed') {
      colorRatio = 1.0; // 完全显示原始颜色
    }
    
    // 根据状态更新视觉效果
    if (status === 'analyzing') {
      // 显示进度条
      progressBar.style.display = 'block';
      progressBar.dataset.display = 'block';
      progressFill.style.width = progress + '%';
      
      // 添加分析图标
      this._updateAnalysisIcon(nodeId, true);
      
      // 更新节点在图表中的样式
      this._updateNodeStyle(nodeId, status, colorRatio);
      
    } else if (status === 'partial') {
      // 更新进度条
      progressFill.style.width = '100%';
      progressBar.style.display = 'block';
      progressBar.dataset.display = 'block';
      
      // 移除分析图标
      this._updateAnalysisIcon(nodeId, false);
      
      // 更新节点样式
      this._updateNodeStyle(nodeId, status, colorRatio);
      
    } else if (status === 'completed') {
      // 更新进度条
      progressFill.style.width = '100%';
      
      // 移除分析图标
      this._updateAnalysisIcon(nodeId, false);
      
      // 更新节点样式
      this._updateNodeStyle(nodeId, status, colorRatio);
      
      // 隐藏进度条
      setTimeout(() => {
        progressBar.style.opacity = '0';
        progressBar.style.transition = 'opacity 0.5s';
        setTimeout(() => {
          progressBar.style.display = 'none';
          progressBar.dataset.display = 'none';
          progressBar.style.opacity = '1';
        }, 500);
      }, 500);
      
    } else if (status === 'pending') {
      // 重置状态
      progressBar.style.display = 'none';
      progressBar.dataset.display = 'none';
      progressFill.style.width = '0%';
      
      // 移除分析图标
      this._updateAnalysisIcon(nodeId, false);
      
      // 更新节点样式
      this._updateNodeStyle(nodeId, status, colorRatio);
    }
    
    // 更新相关连接
    this._updateRelatedLinks(nodeId);
    
    // 更新小地图
    this.updateMiniMap();
    
    return this;
  }
  
  /**
   * 设置缩放级别
   */
  setZoom(level) {
    if (!this.cy) return this;
    
    this.currentZoom = Math.max(this.minZoom, Math.min(this.maxZoom, level));
    
    this.cy.zoom({
      level: this.currentZoom,
      renderedPosition: { x: this.container.clientWidth / 2, y: this.container.clientHeight / 2 }
    });
    
    this.updateMiniMap();
    
    return this;
  }
  
  /**
   * 重置视图
   */
  resetView() {
    if (!this.cy) return this;
    
    this.cy.fit();
    this.currentZoom = this.defaultZoom;
    this.cy.zoom(this.currentZoom);
    
    this.updateMiniMap();
    this.updateElementPositions();
    
    return this;
  }
  
  /**
   * 转换为屏幕坐标
   */
  convertToScreenCoordinates(x, y) {
    if (!this.cy) return [0, 0];
    
    const position = this.cy.pan();
    const zoom = this.cy.zoom();
    
    const screenX = position.x + zoom * x;
    const screenY = position.y + zoom * y;
    
    return [screenX, screenY];
  }
  
  /**
   * 初始化进度显示元素
   */
  initProgressElements() {
    // 清理旧元素
    this._clearProgressElements();
    
    // 获取所有节点
    const nodes = this.cy.nodes();
    
    // 为每个节点创建进度条
    nodes.forEach(node => {
      const nodeData = node.data();
      const position = node.renderedPosition();
      
      // 进度条容器
      const progressBarContainer = document.createElement('div');
      progressBarContainer.className = 'progress-bar-container';
      progressBarContainer.style.left = (position.x - 15) + 'px';
      progressBarContainer.style.top = (position.y + 15) + 'px';
      progressBarContainer.style.width = '30px';
      progressBarContainer.dataset.display = 'none';
      
      // 进度条填充
      const progressBarFill = document.createElement('div');
      progressBarFill.className = 'progress-bar-fill';
      
      progressBarContainer.appendChild(progressBarFill);
      this.container.appendChild(progressBarContainer);
      
      // 存储进度条引用
      this.progressBars[nodeData.id] = progressBarContainer;
      
      // 初始状态为隐藏
      progressBarContainer.style.display = 'none';
    });
    
    return this;
  }
  
  /**
   * 更新DOM元素位置
   */
  updateElementPositions() {
    // 获取所有节点
    const nodes = this.cy.nodes();
    
    nodes.forEach(node => {
      const nodeData = node.data();
      const position = node.renderedPosition();
      
      const progressBar = this.progressBars[nodeData.id];
      const icon = this.analyzeIcons[nodeData.id];
      const indicator = this.phaseIndicators[nodeData.id];
      
      if (nodeData.hidden) {
        // 隐藏相关DOM元素
        if (progressBar) progressBar.style.display = 'none';
        if (icon) icon.style.display = 'none';
        if (indicator) indicator.style.display = 'none';
        return;
      }
      
      if (progressBar) {
        progressBar.style.left = (position.x - 15) + 'px';
        progressBar.style.top = (position.y + 15) + 'px';
        progressBar.style.display = nodeData.hidden ? 'none' : progressBar.dataset.display || 'none';
      }
      
      if (icon) {
        icon.style.left = (position.x + 10) + 'px';
        icon.style.top = (position.y - 20) + 'px';
        icon.style.display = nodeData.hidden ? 'none' : 'block';
      }
      
      if (indicator) {
        indicator.style.left = (position.x - 15) + 'px';
        indicator.style.top = (position.y + 20) + 'px';
        indicator.style.display = nodeData.hidden ? 'none' : 'block';
      }
    });
    
    return this;
  }
  
  /**
   * 应用节点过滤
   */
  applyFilter(nodes, links) {
    if (!this.cy) return this;
    
    // 更新节点可见性
    nodes.forEach(node => {
      const cyNode = this.cy.$id(node.id);
      if (cyNode.length > 0) {
        if (node.hidden) {
          cyNode.style('opacity', 0);
        } else {
          cyNode.style('opacity', node.itemStyle.opacity);
        }
      }
    });
    
    // 更新边可见性
    links.forEach(link => {
      const edgeSelector = `edge[source = "${link.source}"][target = "${link.target}"]`;
      const cyEdge = this.cy.$(edgeSelector);
      
      if (cyEdge.length > 0) {
        if (link.hidden) {
          cyEdge.style('opacity', 0);
        } else {
          cyEdge.style('opacity', link.opacity || 0.6);
        }
      }
    });
    
    this.updateMiniMap();
    this.updateElementPositions();
    
    return this;
  }
  
  /**
   * 更新小地图
   */
  updateMiniMap() {
    if (!this.miniMapCy || !this.cy) return this;
    
    // 清空小地图
    this.miniMapCy.elements().remove();
    
    // 获取主图节点和边
    const nodes = this.cy.nodes();
    const edges = this.cy.edges();
    
    // 复制到小地图，但使用不同样式
    nodes.forEach(node => {
      const nodeData = node.data();
      
      // 根据节点状态确定颜色
      let color = '#aaaaaa'; // 默认灰色
      
      if (nodeData.status === 'completed') {
        color = nodeData.originalColor;
      } else if (nodeData.status === 'partial') {
        color = mixColors('#aaaaaa', nodeData.originalColor, 0.6);
      } else if (nodeData.status === 'analyzing') {
        color = mixColors('#aaaaaa', nodeData.originalColor, 0.3);
      }
      
      this.miniMapCy.add({
        group: 'nodes',
        data: {
          ...nodeData,
          color: color,
          size: 8,
          opacity: nodeData.hidden ? 0 : 0.5
        },
        position: node.position()
      });
    });
    
    edges.forEach(edge => {
      const edgeData = edge.data();
      this.miniMapCy.add({
        group: 'edges',
        data: {
          ...edgeData,
          width: edgeData.hidden ? 0 : 0.5,
          opacity: edgeData.hidden ? 0 : 0.3
        }
      });
    });
    
    return this;
  }
  
  /**
   * 设置交互启用状态
   */
  setInteractionEnabled(enabled) {
    // 禁用/启用缩放和重置按钮
    this.zoomInButton.disabled = !enabled;
    this.zoomOutButton.disabled = !enabled;
    this.zoomFitButton.disabled = !enabled;
    this.resetViewButton.disabled = !enabled;
    
    // 禁用/启用图表拖拽
    if (this.cy) {
      this.cy.userZoomingEnabled(enabled);
      this.cy.userPanningEnabled(enabled);
      this.cy.boxSelectionEnabled(enabled);
      
      if (!enabled) {
        this.cy.autoungrabify(true);
      } else {
        this.cy.autoungrabify(false);
      }
    }
    
    return this;
  }
  
  /**
   * 添加事件监听器
   */
  on(eventName, callback) {
    if (!this.cy) return this;
    
    // 转换事件名称 (如果需要)
    let cyEventName = eventName;
    if (eventName === 'click') cyEventName = 'tap';
    if (eventName === 'dblclick') cyEventName = 'dbltap';
    
    this.cy.on(cyEventName, callback);
    return this;
  }
  
  // 私有辅助方法
  
  /**
   * 设置图表事件监听器
   * @private
   */
  _setupEventListeners() {
    // 监听缩放和平移事件
    this.cy.on('viewport', () => {
      this.currentZoom = this.cy.zoom();
      this.updateElementPositions();
      this.updateMiniMap();
    });
    
    // 监听双击节点事件
    this.cy.on('dbltap', 'node', (evt) => {
      const node = evt.target;
      
      // 将节点居中并放大
      this.cy.animate({
        zoom: 2,
        center: {
          eles: node
        }
      }, {
        duration: 300
      });
      
      this.currentZoom = 2;
      this.updateMiniMap();
    });
    
    // 监听点击节点事件
    this.cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      this.eventBus.emit('node-clicked', node.id());
    });
  }
  
  /**
   * 将通用节点格式转换为Cytoscape格式
   * @private
   */
  _formatNode(node) {
    // 将通用形状转换为Cytoscape形状
    const shapeMap = {
      'circle': 'ellipse',
      'rect': 'rectangle',
      'diamond': 'diamond',
      'pin': 'round-triangle',
      'roundRect': 'round-rectangle',
      'triangle': 'triangle'
    };
    
    const shape = shapeMap[node.symbol] || 'ellipse';
    
    return {
      group: 'nodes',
      data: {
        id: node.id,
        label: node.name,
        nodeType: node.nodeType,
        complexity: node.complexity,
        requiredPhases: node.requiredPhases,
        currentPhase: node.currentPhase,
        size: node.symbolSize,
        shape: shape,
        color: node.itemStyle.color,
        borderColor: node.itemStyle.borderColor,
        borderWidth: node.itemStyle.borderWidth,
        opacity: node.hidden ? 0 : node.itemStyle.opacity,
        originalColor: node.originalColor,
        originalBorderColor: node.originalBorderColor,
        status: node.status,
        progress: node.progress,
        hidden: node.hidden
      },
      position: {
        x: node.x,
        y: node.y
      },
      locked: true
    };
  }
  
  /**
   * 将通用连接格式转换为Cytoscape格式
   * @private
   */
  _formatLink(link) {
    return {
      group: 'edges',
      data: {
        id: `${link.source}-${link.target}`,
        source: link.source,
        target: link.target,
        sourceType: link.sourceType,
        targetType: link.targetType,
        originalColor: link.originalColor,
        color: link.color || link.originalColor,
        width: link.hidden ? 0 : (link.width || 1),
        opacity: link.hidden ? 0 : (link.opacity || 0.6),
        curveness: link.curveness || 0.2,
        type: link.type || 'solid',
        hidden: link.hidden
      }
    };
  }
  
  /**
   * 更新节点样式
   * @private
   */
  _updateNodeStyle(nodeId, status, colorRatio) {
    const node = this.cy.$id(nodeId);
    if (node.length === 0) return;
    
    const nodeData = node.data();
    let borderColor, borderWidth;
    
    if (status === 'analyzing') {
      borderColor = '#ff4d4f';
      borderWidth = 2;
    } else if (status === 'partial') {
      borderColor = nodeData.currentPhase === 1 ? '#faad14' : '#fa8c16';
      borderWidth = 2;
    } else if (status === 'completed') {
      borderColor = '#52c41a';
      borderWidth = 2;
    } else {
      borderColor = '#888888';
      borderWidth = 1;
    }
    
    // 计算当前颜色
    const currentColor = mixColors('#aaaaaa', nodeData.originalColor, colorRatio);
    
    // 更新节点样式
    node.data('color', currentColor);
    node.data('borderColor', borderColor);
    node.data('borderWidth', borderWidth);
    node.data('status', status);
    
    // 更新节点视觉样式
    node.style({
      'background-color': currentColor,
      'border-color': borderColor,
      'border-width': borderWidth
    });
  }
  
  /**
   * 更新与节点相关的连接
   * @private
   */
  _updateRelatedLinks(nodeId) {
    // 获取与节点相关的边
    const relatedEdges = this.cy.$(`edge[source = "${nodeId}"], edge[target = "${nodeId}"]`);
    
    relatedEdges.forEach(edge => {
      const sourceNode = this.cy.$id(edge.data('source'));
      const targetNode = this.cy.$id(edge.data('target'));
      
      if (sourceNode.length === 0 || targetNode.length === 0) return;
      
      const sourceData = sourceNode.data();
      const targetData = targetNode.data();
      const edgeData = edge.data();
      
      // 边的颜色状态取决于源节点和目标节点的状态
      if (sourceData.status === 'completed' && targetData.status === 'completed') {
        // 如果两个节点都已分析完成，则显示原始颜色
        edge.data('color', edgeData.originalColor);
        edge.style('line-color', edgeData.originalColor);
        edge.style('target-arrow-color', edgeData.originalColor);
      } else {
        // 否则计算混合颜色
        let sourceRatio = 0, targetRatio = 0;
        
        if (sourceData.status === 'completed') sourceRatio = 1;
        else if (sourceData.status === 'partial') sourceRatio = 0.5;
        else if (sourceData.status === 'analyzing') sourceRatio = 0.2;
        
        if (targetData.status === 'completed') targetRatio = 1;
        else if (targetData.status === 'partial') targetRatio = 0.5;
        else if (targetData.status === 'analyzing') targetRatio = 0.2;
        
        // 取较低的比例
        const ratio = Math.min(sourceRatio, targetRatio);
        
        // 计算混合颜色
        const mixedColor = mixColors('#aaaaaa', edgeData.originalColor, ratio);
        
        edge.data('color', mixedColor);
        edge.style('line-color', mixedColor);
        edge.style('target-arrow-color', mixedColor);
      }
    });
  }
  
  /**
   * 更新分析图标
   * @private
   */
  _updateAnalysisIcon(nodeId, show) {
    if (show) {
      // 添加或更新分析图标
      if (!this.analyzeIcons[nodeId]) {
        const node = this.cy.$id(nodeId);
        if (node.length === 0) return;
        
        const position = node.renderedPosition();
        
        const icon = document.createElement('div');
        icon.innerHTML = '⚙️';
        icon.style.position = 'absolute';
        icon.style.left = (position.x + 10) + 'px';
        icon.style.top = (position.y - 20) + 'px';
        icon.style.fontSize = '16px';
        icon.className = 'analyzing-icon';
        icon.style.display = node.data('hidden') ? 'none' : 'block';
        this.container.appendChild(icon);
        
        this.analyzeIcons[nodeId] = icon;
      }
    } else {
      // 移除分析图标
      if (this.analyzeIcons[nodeId]) {
        this.container.removeChild(this.analyzeIcons[nodeId]);
        delete this.analyzeIcons[nodeId];
      }
    }
  }
  
  /**
   * 清理进度显示元素
   * @private
   */
  _clearProgressElements() {
    // 清除进度条
    Object.values(this.progressBars).forEach(el => {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
    
    // 清除分析图标
    Object.values(this.analyzeIcons).forEach(el => {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
    
    // 清除阶段指示器
    Object.values(this.phaseIndicators).forEach(el => {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
    
    // 重置存储
    this.progressBars = {};
    this.analyzeIcons = {};
    this.phaseIndicators = {};
  }
}