import { Visualizer } from './visualizer.js';
import { mixColors } from '../utils/color-utils.js';

// 尝试获取echarts对象，支持不同的加载方式
let echartsLib;
try {
  // 方式1: 全局变量（如通过script标签加载）
  if (typeof window.echarts !== 'undefined') {
    echartsLib = window.echarts;
  }
  // 方式2: 如果以ESM方式导入echarts
  else {
    // 动态导入echarts，这将创建一个懒加载的chunk
    // 注意：这段代码在不支持动态导入的环境中会失败
    import('echarts').then(module => {
      echartsLib = module;
    });
  }
} catch (e) {
  console.error("尝试加载ECharts时出错:", e);
}

/**
 * ECharts适配器 - 将通用API转换为ECharts特定实现
 */
export class EChartsAdapter extends Visualizer {
  constructor(container, miniMapContainer, eventBus) {
    super(container, miniMapContainer, eventBus);
    this.chart = null;
    this.miniMap = null;
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
   * 初始化ECharts图表
   */
  initialize() {
    // 防御性检查
    if (!echartsLib && typeof echarts === 'undefined') {
      console.error('ECharts库未加载');
      this.eventBus.emit('visualization-error', 'ECharts库未加载');
      return this;
    }
    // 使用已确认可用的echarts
    const echart = echartsLib || echarts;

    // 检查容器
    if (!this.container) {
      console.error('图表容器不存在');
      this.eventBus.emit('visualization-error', '图表容器不存在');
      return this;
    }
    
    // 初始化主图表
    try {
      this.chart = echarts.init(this.container);
      console.log("ECharts初始化成功");
      
      // 初始化选项
      const option = {
        backgroundColor: '#1e1e2e',
        tooltip: {
          formatter: (params) => this._formatTooltip(params)
        },
        animation: true,
        animationDuration: 500,
        series: [
          {
            type: 'graph',
            layout: 'none',
            data: [],
            links: [],
            roam: 'move',
            draggable: true,
            zoom: this.currentZoom,
            scaleLimit: {
              min: this.minZoom,
              max: this.maxZoom
            },
            center: [400, 300],
            focusNodeAdjacency: true,
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.3)'
            },
            lineStyle: {
              width: 1,
              curveness: 0.2,
              opacity: 0.6
            },
            label: {
              position: 'bottom',
              distance: 5,
              fontSize: 12,
              fontFamily: 'JetBrains Mono, monospace'
            },
            emphasis: {
              scale: true,
              focus: 'adjacency',
              lineStyle: {
                width: 2
              },
              label: {
                fontWeight: 'bold'
              }
            },
            edgeSymbol: ['none', 'arrow'],
            edgeSymbolSize: [0, 5],
            edgeLabel: {
              show: false
            }
          }
        ]
      };
      
      this.chart.setOption(option);
      
      // 初始化小地图
      if (this.miniMapContainer) {
        this.miniMap = echarts.init(this.miniMapContainer);
        const miniMapOption = {
          backgroundColor: 'transparent',
          animation: false,
          tooltip: { show: false },
          series: [
            {
              type: 'graph',
              layout: 'none',
              data: [],
              links: [],
              roam: false,
              zoom: 0.5,
              left: 0,
              top: 0,
              right: 0,
              bottom: 0
            }
          ]
        };
        this.miniMap.setOption(miniMapOption);
      }
      
      // 添加事件监听
      this._setupEventListeners();
    } catch (error) {
      console.error("初始化ECharts时出错:", error);
      this.eventBus.emit('visualization-error', `初始化图表失败: ${error.message}`);
    }
    return this;
  }
  
  /**
   * 销毁图表实例
   */
  destroy() {
    // 清理DOM元素
    this._clearProgressElements();
    
    // 销毁图表
    if (this.chart) {
      this.chart.dispose();
      this.chart = null;
    }
    
    // 销毁小地图
    if (this.miniMap) {
      this.miniMap.dispose();
      this.miniMap = null;
    }
    
    return this;
  }
  
  /**
   * 更新节点数据
   */
  updateNodes(nodes) {
    if (!this.chart) return this;
    
    // 转换为ECharts格式
    const echartsNodes = nodes.map(node => this._formatNode(node));
    
    this.chart.setOption({
      series: [{
        data: echartsNodes
      }]
    });
    
    return this;
  }
  
  /**
   * 更新连接数据
   */
  updateLinks(links) {
    if (!this.chart) return this;
    
    // 转换为ECharts格式
    const echartsLinks = links.map(link => this._formatLink(link));
    
    this.chart.setOption({
      series: [{
        links: echartsLinks
      }]
    });
    
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
      const node = this._getNodeFromChart(nodeId);
      if (node) {
        const baseRatio = 0.25;
        const maxPhaseRatio = 0.75;
        colorRatio = baseRatio + ((node.currentPhase / node.requiredPhases) * (maxPhaseRatio - baseRatio));
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
    if (!this.chart) return this;
    
    this.currentZoom = Math.max(this.minZoom, Math.min(this.maxZoom, level));
    
    this.chart.setOption({
      series: [{
        zoom: this.currentZoom
      }]
    });
    
    this.updateMiniMap();
    
    return this;
  }
  
  /**
   * 重置视图
   */
  resetView() {
    if (!this.chart) return this;
    
    try {
      console.log("重置视图开始");
      
      // 获取当前数据
      const option = this.chart.getOption();
      if (!option || !option.series || !option.series[0]) {
        console.error("无法获取图表选项");
        return this;
      }
      
      // 保存现有数据
      const nodes = option.series[0].data || [];
      const links = option.series[0].links || [];
      
      console.log(`重置视图: 保存了 ${nodes.length} 个节点和 ${links.length} 个连接`);
      
      // 重置缩放
      this.currentZoom = this.defaultZoom;
      
      // 创建完整的新选项，确保保留所有数据
      const newOption = {
        backgroundColor: option.backgroundColor,
        tooltip: option.tooltip,
        animation: true,
        animationDuration: 500,
        series: [{
          type: 'graph',
          layout: 'none',
          data: nodes,  // 保留原始节点
          links: links, // 保留原始连接
          roam: 'move',
          draggable: true,
          zoom: this.defaultZoom,
          center: [400, 300],  // 重置中心点
          focusNodeAdjacency: true,
          scaleLimit: {
            min: this.minZoom,
            max: this.maxZoom
          },
          label: {
            position: 'bottom',
            distance: 5,
            fontSize: 12,
            fontFamily: 'JetBrains Mono, monospace'
          },
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.3)'
          },
          lineStyle: {
            width: 1,
            curveness: 0.2,
            opacity: 0.6
          },
          emphasis: {
            scale: true,
            focus: 'adjacency',
            lineStyle: {
              width: 2
            },
            label: {
              fontWeight: 'bold'
            }
          },
          edgeSymbol: ['none', 'arrow'],
          edgeSymbolSize: [0, 5],
          edgeLabel: {
            show: false
          }
        }]
      };
      
      // 使用完整选项重置图表
      this.chart.setOption(newOption, {
        replaceMerge: ['series']
      });
      
      console.log("图表已使用新选项重置");
      
      // 更新小地图
      this.updateMiniMap();
      
      // 更新DOM元素位置
      this.updateElementPositions();
      
      console.log("重置视图完成");
    } catch (error) {
      console.error("重置视图时出错:", error);
    }
    
    return this;
  }
  
  /**
   * 转换为屏幕坐标
   */
  convertToScreenCoordinates(x, y) {
    if (!this.chart) return [0, 0];
    
    return this.chart.convertToPixel({seriesIndex: 0}, [x, y]);
  }
  
  /**
   * 初始化进度显示元素
   */
  initProgressElements() {
    // 清理旧元素
    this._clearProgressElements();
    // 检查图表实例是否可用
    if (!this.chart) {
      console.warn("无法初始化进度元素: 图表实例不可用");
      return this;
    }
    try {
      // 获取当前图表数据
      const option = this.chart.getOption();
      // 确保option和series存在
      if (!option || !option.series || !option.series[0] || !option.series[0].data) {
        console.warn("无法初始化进度元素: 图表数据不可用");
        return this;
      }
      
      const nodes = option.series[0].data;
      
      // 为每个节点创建进度条
      nodes.forEach(node => {
        const domPos = this.convertToScreenCoordinates(node.x, node.y);
        if (!domPos) return;
        
        // 进度条容器
        const progressBarContainer = document.createElement('div');
        progressBarContainer.className = 'progress-bar-container';
        progressBarContainer.style.left = (domPos[0] - 15) + 'px';
        progressBarContainer.style.top = (domPos[1] + 15) + 'px';
        progressBarContainer.style.width = '30px';
        progressBarContainer.dataset.display = 'none';
        
        // 进度条填充
        const progressBarFill = document.createElement('div');
        progressBarFill.className = 'progress-bar-fill';
        
        progressBarContainer.appendChild(progressBarFill);
        this.container.appendChild(progressBarContainer);
        
        // 存储进度条引用
        this.progressBars[node.id] = progressBarContainer;
        
        // 初始状态为隐藏
        progressBarContainer.style.display = 'none';
      });
    } catch (error) {
      console.error("初始化进度元素时出错:", error);
    }
    
    
    return this;
  }
  
  /**
   * 更新DOM元素位置
   */
  updateElementPositions() {
    // 获取当前节点数据
    const option = this.chart.getOption();
    const nodes = option.series[0].data;
    
    nodes.forEach(node => {
      const progressBar = this.progressBars[node.id];
      const icon = this.analyzeIcons[node.id];
      const indicator = this.phaseIndicators[node.id];
      
      if (node.hidden) {
        // 隐藏相关DOM元素
        if (progressBar) progressBar.style.display = 'none';
        if (icon) icon.style.display = 'none';
        if (indicator) indicator.style.display = 'none';
        return;
      }
      
      const domPos = this.convertToScreenCoordinates(node.x, node.y);
      if (domPos) {
        if (progressBar) {
          progressBar.style.left = (domPos[0] - 15) + 'px';
          progressBar.style.top = (domPos[1] + 15) + 'px';
          progressBar.style.display = node.hidden ? 'none' : progressBar.dataset.display || 'none';
        }
        
        if (icon) {
          icon.style.left = (domPos[0] + 10) + 'px';
          icon.style.top = (domPos[1] - 20) + 'px';
          icon.style.display = node.hidden ? 'none' : 'block';
        }
        
        if (indicator) {
          indicator.style.left = (domPos[0] - 15) + 'px';
          indicator.style.top = (domPos[1] + 20) + 'px';
          indicator.style.display = node.hidden ? 'none' : 'block';
        }
      }
    });
    
    return this;
  }
  
  /**
   * 应用节点过滤
   */
  applyFilter(nodes, links) {
    if (!this.chart) return this;
    
    this.chart.setOption({
      series: [{
        data: nodes.map(node => ({
          ...node,
          itemStyle: {
            ...node.itemStyle,
            opacity: node.hidden ? 0 : node.itemStyle.opacity
          },
          label: {
            ...node.label,
            show: !node.hidden && node.label.show
          }
        })),
        links: links.map(link => ({
          ...link,
          lineStyle: {
            ...link.lineStyle,
            opacity: link.hidden ? 0 : link.lineStyle.opacity,
            width: link.hidden ? 0 : link.lineStyle.width
          }
        }))
      }]
    });
    
    this.updateMiniMap();
    this.updateElementPositions();
    
    return this;
  }
  
  /**
   * 更新小地图
   */
  updateMiniMap() {
    if (!this.miniMap || !this.chart) return this;
    
    // 获取主图当前数据
    const mainOption = this.chart.getOption();
    if (!mainOption.series || !mainOption.series[0]) return this;
    
    const nodes = mainOption.series[0].data;
    const links = mainOption.series[0].links;
    
    // 更新小地图数据
    this.miniMap.setOption({
      series: [{
        zoom: 0.5,
        data: nodes.map(node => ({
          ...node,
          itemStyle: {
            color: node.status === 'completed' ? node.originalColor : 
                   node.status === 'partial' ? mixColors('#aaaaaa', node.originalColor, 0.6) :
                   node.status === 'analyzing' ? mixColors('#aaaaaa', node.originalColor, 0.3) : 
                   '#aaaaaa',
            opacity: node.hidden ? 0 : 0.5,
            borderWidth: 0
          },
          symbolSize: 8,
          label: { show: false }
        })),
        links: links.map(link => ({
          ...link,
          lineStyle: {
            ...link.lineStyle,
            width: link.hidden ? 0 : 0.5,
            opacity: link.hidden ? 0 : 0.3
          }
        }))
      }]
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
    if (this.chart) {
      this.chart.setOption({
        series: [{
          roam: enabled ? 'move' : false
        }]
      });
    }
    
    return this;
  }
  
  /**
   * 添加事件监听器
   */
  on(eventName, callback) {
    if (!this.chart) return this;
    
    this.chart.on(eventName, callback);
    return this;
  }
  
  // 私有辅助方法
  
  /**
   * 设置图表事件监听器
   * @private
   */
  _setupEventListeners() {
    // 监听图表漫游事件
    this.chart.on('graphroam', () => {
      this.updateMiniMap();
      
      // 更新当前缩放比例
      const option = this.chart.getOption();
      if (option.series && option.series[0] && option.series[0].zoom) {
        this.currentZoom = option.series[0].zoom;
      }
      
      // 更新DOM元素位置
      this.updateElementPositions();
    });
    
    // 监听双击节点事件
    this.chart.on('dblclick', (params) => {
      if (params.dataType === 'node') {
        const option = this.chart.getOption();
        const nodes = option.series[0].data;
        const node = nodes.find(n => n.id === params.data.id);
        
        if (node) {
          this.chart.dispatchAction({
            type: 'graphRoam',
            zoom: 2,
            moveX: this.container.clientWidth / 2 - node.x * 2,
            moveY: this.container.clientHeight / 2 - node.y * 2
          });
          
          this.currentZoom = 2;
          this.updateMiniMap();
        }
      }
    });
    
    // 监听点击节点事件
    this.chart.on('click', (params) => {
      if (params.dataType === 'node') {
        this.eventBus.emit('node-clicked', params.data.id);
      }
    });
  }
  
  /**
   * 将通用节点格式转换为ECharts格式
   * @private
   */
  _formatNode(node) {
    return {
      id: node.id,
      name: node.name,
      nodeType: node.nodeType,
      complexity: node.complexity,
      requiredPhases: node.requiredPhases,
      currentPhase: node.currentPhase,
      symbolSize: node.symbolSize,
      symbol: node.symbol,
      itemStyle: {
        color: node.itemStyle.color,
        borderColor: node.itemStyle.borderColor,
        borderWidth: node.itemStyle.borderWidth,
        opacity: node.hidden ? 0 : node.itemStyle.opacity
      },
      originalColor: node.originalColor,
      originalBorderColor: node.originalBorderColor,
      x: node.x,
      y: node.y,
      fixed: node.fixed,
      status: node.status,
      progress: node.progress,
      label: {
        show: !node.hidden && node.label.show,
        formatter: node.name,
        fontSize: node.label.fontSize,
        fontFamily: 'JetBrains Mono, monospace',
        color: node.label.color,
        fontWeight: node.label.fontWeight,
        distance: node.label.distance,
        position: node.label.position
      },
      hidden: node.hidden
    };
  }
  
  /**
   * 将通用连接格式转换为ECharts格式
   * @private
   */
  _formatLink(link) {
    return {
      source: link.source,
      target: link.target,
      sourceType: link.sourceType,
      targetType: link.targetType,
      originalColor: link.originalColor,
      lineStyle: {
        color: link.color || link.originalColor,
        width: link.hidden ? 0 : (link.width || 1),
        opacity: link.hidden ? 0 : (link.opacity || 0.6),
        curveness: link.curveness || 0.2,
        type: link.type || 'solid'
      },
      symbol: link.symbol || ['none', 'arrow'],
      symbolSize: link.symbolSize || [0, 5],
      hidden: link.hidden
    };
  }
  
  /**
   * 格式化工具提示
   * @private
   */
  _formatTooltip(params) {
    if (params.dataType === 'node') {
      const data = params.data;
      
      // 获取节点类型信息
      const nodeTypes = {
        'function': '函数',
        'variable': '变量',
        'class': '类',
        'typedef': '类型定义',
        'macro': '宏/常量',
        'api': 'API'
      };
      const nodeTypeName = nodeTypes[data.nodeType] || data.nodeType;
      
      let statusText = '';
      if (data.status === 'analyzing') {
        statusText = `<div style="color:#ff4d4f;">正在分析中 (${data.progress}%)</div>`;
      } else if (data.status === 'partial') {
        statusText = `<div style="color:#fa8c16;">部分分析完成 (阶段 ${data.currentPhase}/${data.requiredPhases})</div>`;
      } else if (data.status === 'completed') {
        statusText = `<div style="color:#52c41a;">分析完成 (100%)</div>`;
      } else {
        statusText = '<div style="color:#d9d9d9;">等待分析</div>';
      }
      
      return `
        <div style="font-family:'JetBrains Mono', monospace;">
          <div style="font-weight:bold;">${data.name}</div>
          <div>类型: ${nodeTypeName}</div>
          <div>复杂度: ${data.complexity === 'high' ? '高' : data.complexity === 'medium' ? '中' : '低'}</div>
          <div>分析阶段: ${data.requiredPhases}</div>
          ${statusText}
        </div>
      `;
    } else if (params.dataType === 'edge') {
      const option = this.chart.getOption();
      const nodes = option.series[0].data;
      const source = nodes.find(n => n.id === params.data.source);
      const target = nodes.find(n => n.id === params.data.target);
      
      if (source && target) {
        return `
          <div style="font-family:'JetBrains Mono', monospace;">
            <div style="font-weight:bold;">连接关系</div>
            <div>${source.name} → ${target.name}</div>
          </div>
        `;
      }
      return '';
    }
  }
  
  /**
   * 获取图表中的节点
   * @private
   */
  _getNodeFromChart(nodeId) {
    const option = this.chart.getOption();
    const nodes = option.series[0].data;
    return nodes.find(node => node.id === nodeId);
  }
  
  /**
   * 更新节点样式
   * @private
   */
  _updateNodeStyle(nodeId, status, colorRatio) {
    const option = this.chart.getOption();
    const nodes = option.series[0].data;
    const nodeIndex = nodes.findIndex(node => node.id === nodeId);
    
    if (nodeIndex === -1) return;
    
    const node = nodes[nodeIndex];
    let borderColor, borderWidth;
    
    if (status === 'analyzing') {
      borderColor = '#ff4d4f';
      borderWidth = 2;
    } else if (status === 'partial') {
      borderColor = node.currentPhase === 1 ? '#faad14' : '#fa8c16';
      borderWidth = 2;
    } else if (status === 'completed') {
      borderColor = '#52c41a';
      borderWidth = 2;
    } else {
      borderColor = '#888888';
      borderWidth = 1;
    }
    
    // 计算当前颜色
    const currentColor = mixColors('#aaaaaa', node.originalColor, colorRatio);
    
    // 更新节点样式
    nodes[nodeIndex].itemStyle = {
      ...nodes[nodeIndex].itemStyle,
      color: currentColor,
      borderColor: borderColor,
      borderWidth: borderWidth
    };
    
    // 更新图表
    this.chart.setOption({
      series: [{
        data: nodes
      }]
    });
  }
  
  /**
   * 更新与节点相关的连接
   * @private
   */
  _updateRelatedLinks(nodeId) {
    const option = this.chart.getOption();
    const nodes = option.series[0].data;
    const links = option.series[0].links;
    
    // 找出与该节点相关的所有边
    const relatedLinks = links.filter(link => 
      link.source === nodeId || link.target === nodeId
    );
    
    relatedLinks.forEach(link => {
      const sourceNode = nodes.find(n => n.id === link.source);
      const targetNode = nodes.find(n => n.id === link.target);
      
      if (!sourceNode || !targetNode) return;
      
      // 边的颜色状态取决于源节点和目标节点的状态
      if (sourceNode.status === 'completed' && targetNode.status === 'completed') {
        // 如果两个节点都已分析完成，则显示原始颜色
        link.lineStyle.color = link.originalColor;
      } else {
        // 否则计算混合颜色
        // 根据源节点和目标节点的完成度决定颜色混合比例
        let sourceRatio = 0, targetRatio = 0;
        
        if (sourceNode.status === 'completed') sourceRatio = 1;
        else if (sourceNode.status === 'partial') sourceRatio = 0.5;
        else if (sourceNode.status === 'analyzing') sourceRatio = 0.2;
        
        if (targetNode.status === 'completed') targetRatio = 1;
        else if (targetNode.status === 'partial') targetRatio = 0.5;
        else if (targetNode.status === 'analyzing') targetRatio = 0.2;
        
        // 取较低的比例
        const ratio = Math.min(sourceRatio, targetRatio);
        
        // 计算混合颜色
        link.lineStyle.color = mixColors('#aaaaaa', link.originalColor, ratio);
      }
    });
    
    // 更新图表
    this.chart.setOption({
      series: [{
        links: links
      }]
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
        const node = this._getNodeFromChart(nodeId);
        if (!node) return;
        
        const domPos = this.convertToScreenCoordinates(node.x, node.y);
        if (!domPos) return;
        
        const icon = document.createElement('div');
        icon.innerHTML = '⚙️';
        icon.style.position = 'absolute';
        icon.style.left = (domPos[0] + 10) + 'px';
        icon.style.top = (domPos[1] - 20) + 'px';
        icon.style.fontSize = '16px';
        icon.className = 'analyzing-icon';
        icon.style.display = node.hidden ? 'none' : 'block';
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