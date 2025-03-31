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
    
    // 监听全局连线更新事件
    this.eventBus.on('update-all-links', () => {
      this.updateAllLinks();
    });
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
    
    // 确保进度条和图标对象已初始化
    this.progressBars = {};
    this.analyzeIcons = {};
    this.phaseIndicators = {};
    
    // 初始化主图表
    try {
      this.chart = echarts.init(this.container);
      console.log("ECharts初始化成功");
      
      // 初始化选项 - 为大量节点优化
      const option = {
        backgroundColor: '#1e1e2e',
        tooltip: {
          formatter: (params) => this._formatTooltip(params),
          enterable: false,
          confine: true,
          triggerOn: 'click' // 点击触发，减少触发频率
        },
        animation: false, // 初始禁用动画以提高性能
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
            focusNodeAdjacency: false, // 关闭高亮相邻节点，提高性能
            itemStyle: {
              shadowBlur: 2, // 减少阴影模糊半径
              shadowColor: 'rgba(0, 0, 0, 0.2)'
            },
            lineStyle: {
              width: 1,
              curveness: 0.1, // 减少曲率
              opacity: 0.4 // 降低不透明度
            },
            label: {
              show: false, // 默认不显示标签，提高性能
              position: 'bottom',
              distance: 5,
              fontSize: 10,
              fontFamily: 'JetBrains Mono, monospace'
            },
            emphasis: {
              scale: false, // 禁用缩放效果
              focus: 'none', // 禁用关联高亮
              lineStyle: {
                width: 1.5
              },
              label: {
                show: true // 仅在强调时显示标签
              }
            },
            edgeSymbol: ['none', 'arrow'],
            edgeSymbolSize: [0, 5],
            edgeLabel: {
              show: false
            },
            // 增加大数据量优化选项
            large: true,
            largeThreshold: 300, // 超过300个节点时启用大规模绘制优化
            progressive: 300, // 分批绘制
            progressiveThreshold: 500 // 节点超过500时启用渐进渲染
          }
        ]
      };
      
      this.chart.setOption(option);
      
      // 初始化小地图 - 简化小地图配置
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
              bottom: 0,
              // 简化小地图渲染
              symbol: 'circle',
              symbolSize: 2,
              itemStyle: {
                borderWidth: 0
              },
              lineStyle: {
                width: 0.1,
                opacity: 0.2
              },
              label: { show: false }
            }
          ]
        };
        this.miniMap.setOption(miniMapOption);
      }
      
      // 添加事件监听
      this._setupEventListeners();
      
      // 为大量节点优化的额外初始化
      this._setupPerformanceOptimizations();
    } catch (error) {
      console.error("初始化ECharts时出错:", error);
      this.eventBus.emit('visualization-error', `初始化图表失败: ${error.message}`);
    }
    return this;
  }
  
  /**
   * 设置性能优化
   * @private
   */
  _setupPerformanceOptimizations() {
    // 延迟resize处理
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (this.chart) this.chart.resize();
        if (this.miniMap) this.miniMap.resize();
      }, 200);
    });
    
    // 减少元素更新频率
    this.lastElementUpdateTime = 0;
    
    // 初始加载完成后开启动画
    setTimeout(() => {
      if (this.chart) {
        this.chart.setOption({
          animation: true,
          animationDuration: 300,
          animationEasing: 'linear'
        });
      }
    }, 2000);
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
    // 防御性检查 - 确保参数有效
    if (!nodeId || !status) {
      console.warn("更新节点状态: 无效的参数", nodeId, status);
      return this;
    }
    
    // 获取节点信息用于日志
    const node = this._getNodeFromChart(nodeId);
    
    // 获取进度条元素
    const progressBar = this.progressBars[nodeId];
    if (!progressBar) {
      console.warn(`未找到节点 ${nodeId} (${node ? node.nodeType : '未知类型'}) 的进度条元素`);
      return this;
    }
    
    // 确保进度填充元素存在
    let progressFill = progressBar.firstChild;
    if (!progressFill) {
      progressFill = document.createElement('div');
      progressFill.className = 'progress-bar-fill';
      progressBar.appendChild(progressFill);
    }
    
    // 计算颜色渐变程度
    let colorRatio = 0;
    
    if (status === 'pending') {
      colorRatio = 0; // 灰色
    } else if (status === 'analyzing') {
      // 分析中 - 0-25%的彩色
      colorRatio = Math.min(0.25, (progress / 100) * 0.25);
    } else if (status === 'partial') {
      // 根据完成的阶段计算颜色混合比例
      if (node) {
        const baseRatio = 0.25;
        const maxPhaseRatio = 0.75;
        colorRatio = baseRatio + ((node.currentPhase / node.requiredPhases) * (maxPhaseRatio - baseRatio));
      }
    } else if (status === 'completed') {
      colorRatio = 1.0; // 完全显示原始颜色
    }
    
    console.log(`更新节点状态: ${nodeId}, 类型: ${node ? node.nodeType : '未知'}, 状态: ${status}, 进度: ${progress}, 颜色比例: ${colorRatio}`);
    
    // 立即更新节点在图表中的状态，确保其properties属性正确
    if (node) {
      node.status = status;
      node.progress = progress;
      if (phase !== null) node.currentPhase = phase;
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
      
      // 直接存储对进度条元素的引用
      const pb = progressBar;
      
      // 直接执行隐藏进度条逻辑，不使用立即执行函数
      console.log(`准备隐藏节点 ${nodeId} (${node.nodeType || '未知类型'}) 的进度条`);
      
      // 第一个延时 - 等待一小段时间后开始淡出
      setTimeout(() => {
        if (pb && pb.style) {
          console.log(`开始淡出节点 ${nodeId} 的进度条`);
          pb.style.opacity = '0';
          pb.style.transition = 'opacity 0.5s';
          
          // 第二个延时 - 淡出完成后隐藏元素
          setTimeout(() => {
            if (pb && pb.style) {
              console.log(`完全隐藏节点 ${nodeId} 的进度条`);
              pb.style.display = 'none';
              pb.dataset.display = 'none';
              pb.style.opacity = '1';
              
              // 检查是否正确隐藏
              console.log(`节点 ${nodeId} 进度条显示状态: ${pb.style.display}`);
            }
          }, 500);
        }
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
      
      console.log(`正在为 ${nodes.length} 个节点创建进度条元素...`);
      
      // 为每个节点创建进度条
      nodes.forEach(node => {
        if (!node || !node.id) {
          console.warn("跳过无效节点");
          return;
        }
        
        const nodeId = node.id;
        
        // 转换节点坐标到屏幕坐标
        let x = node.x;
        let y = node.y;
        if (node.value && Array.isArray(node.value) && node.value.length >= 2) {
          x = node.value[0];
          y = node.value[1];
        }
        
        const domPos = this.convertToScreenCoordinates(x, y);
        if (!domPos) {
          console.warn(`无法获取节点 ${nodeId} 的屏幕坐标`);
          return;
        }
        
        // 清理可能已存在的进度条元素
        if (this.progressBars[nodeId] && this.progressBars[nodeId].parentNode) {
          this.progressBars[nodeId].parentNode.removeChild(this.progressBars[nodeId]);
          delete this.progressBars[nodeId];
        }
        
        // 创建新的进度条容器
        const progressBarContainer = document.createElement('div');
        progressBarContainer.className = 'progress-bar-container';
        progressBarContainer.style.position = 'absolute';
        progressBarContainer.style.left = (domPos[0] - 15) + 'px';
        progressBarContainer.style.top = (domPos[1] + 15) + 'px';
        progressBarContainer.style.width = '30px';
        progressBarContainer.style.height = '4px';
        progressBarContainer.style.backgroundColor = '#444444';
        progressBarContainer.style.borderRadius = '2px';
        progressBarContainer.style.overflow = 'hidden';
        progressBarContainer.style.zIndex = '100';
        progressBarContainer.dataset.nodeId = nodeId;
        progressBarContainer.dataset.nodeType = node.nodeType;
        progressBarContainer.dataset.display = 'none';
        
        // 进度条填充
        const progressBarFill = document.createElement('div');
        progressBarFill.className = 'progress-bar-fill';
        progressBarFill.style.height = '100%';
        progressBarFill.style.width = '0%';
        progressBarFill.style.backgroundColor = node.originalColor || node.originColor || '#aaaaaa';
        progressBarFill.style.transition = 'width 0.2s ease-in-out';
        
        progressBarContainer.appendChild(progressBarFill);
        this.container.appendChild(progressBarContainer);
        
        // 存储进度条引用
        this.progressBars[nodeId] = progressBarContainer;
        
        // 初始状态为隐藏
        progressBarContainer.style.display = 'none';
        
        // 如果节点已经有状态，立即应用
        if (node.status && node.status !== 'pending') {
          this.updateNodeStatus(nodeId, node.status, node.progress || 0, node.currentPhase || 0);
        }
      });
      
      console.log(`成功为 ${Object.keys(this.progressBars).length} 个节点创建了进度条元素`);
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
    
    try {
      // 获取主图表数据
      const mainOption = this.chart.getOption();
      const nodes = mainOption.series[0].data;
      const links = mainOption.series[0].links;
      
      // 更新小地图数据
      this.miniMap.setOption({
        series: [{
          data: nodes,
          links: links
        }]
      });
      
      // 标记当前视口范围
      // 获取当前缩放和平移信息
      const center = mainOption.series[0].center;
      const zoom = mainOption.series[0].zoom;
      
      // 计算视口矩形
      const viewWidth = this.container.clientWidth / zoom;
      const viewHeight = this.container.clientHeight / zoom;
      
      // 暂时不实现视口框选，在高级版本中添加
    } catch (error) {
      console.error("更新小地图时出错:", error);
    }
    
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
    // 防御性检查
    if (!this.chart) return;
    
    // 缩放事件处理
    this.chart.on('datazoom', (params) => {
      // 更新DOM元素位置
      this.updateElementPositions();
    });
    
    // 视图变换事件（缩放、平移）
    this.chart.on('viewportchange', (params) => {
      // 更新DOM元素位置
      this.updateElementPositions();
    });
    
    // 图表缩放事件
    this.chart.on('graphroam', (params) => {
      // 更新小地图显示
      this.updateMiniMap();
      
      // 更新当前缩放比例
      const option = this.chart.getOption();
      if (option.series && option.series[0] && option.series[0].zoom) {
        this.currentZoom = option.series[0].zoom;
      }
      
      // 更新DOM元素位置
      this.updateElementPositions();
    });
    
    // 窗口大小变化事件
    window.addEventListener('resize', () => {
      // 图表大小调整
      this.chart.resize();
      if (this.miniMap) this.miniMap.resize();
      // 更新小地图
      this.updateMiniMap();
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
    
    // 节点点击事件
    this.chart.on('click', (params) => {
      if (params.componentType === 'series' && params.dataType === 'node') {
        // 获取节点ID
        const nodeId = params.data.id;
        // 触发节点点击事件
        this.eventBus.emit('node-clicked', nodeId);
      }
    });
    
    // 布局优化完成事件
    this.eventBus.on('layout-optimized', () => {
      console.log('ECharts收到布局优化完成事件');
      // 强制图表重绘，确保所有位置更新
      this.chart.resize();
      // 更新小地图
      this.updateMiniMap();
      // 更新DOM元素位置
      this.updateElementPositions();
    });
  }
  
  /**
   * 将通用节点格式转换为ECharts格式
   * @private
   */
  _formatNode(node) {
    // 防御性检查 - 确保node.label存在
    const defaultLabel = {
      show: true,
      fontSize: 10,
      fontFamily: 'JetBrains Mono, monospace',
      color: '#333',
      fontWeight: 'normal',
      distance: 5,
      position: 'bottom'
    };
    
    // 合并默认label和节点自身的label（如果存在）
    const nodeLabel = node.label || {};
    const mergedLabel = {...defaultLabel, ...nodeLabel};
    
    // 处理节点hidden属性（如果不存在则默认为false）
    const isHidden = node.hidden || node.visible === false;
    
    return {
      id: node.id,
      name: node.name,
      value: node.value || [node.x, node.y],
      symbolSize: node.symbolSize || 20,
      symbol: node.symbol || 'circle',
      itemStyle: node.itemStyle || {
        color: '#aaaaaa',
        borderColor: '#888888',
        borderWidth: 1,
        opacity: 0.8
      },
      nodeType: node.nodeType,
      complexity: node.complexity,
      requiredPhases: node.requiredPhases,
      currentPhase: node.currentPhase,
      // 确保以下属性存在，使用节点自身的属性或默认值
      originalColor: node.originColor || node.originalColor || '#aaaaaa',
      originalBorderColor: node.originBorderColor || node.originalBorderColor || '#888888',
      x: node.x || 0,
      y: node.y || 0,
      fixed: node.fixed || false,
      status: node.status || 'pending',
      progress: node.progress || 0,
      label: {
        show: !isHidden && mergedLabel.show,
        formatter: node.name,
        fontSize: mergedLabel.fontSize,
        fontFamily: mergedLabel.fontFamily,
        color: mergedLabel.color,
        fontWeight: mergedLabel.fontWeight,
        distance: mergedLabel.distance,
        position: mergedLabel.position
      },
      hidden: isHidden
    };
  }
  
  /**
   * 将通用连接格式转换为ECharts格式
   * @private
   */
  _formatLink(link) {
    // 处理连接hidden属性（如果不存在则默认为false）
    const isHidden = link.hidden || link.visible === false;
    
    // 设置默认的线条样式和属性
    const defaultLineStyle = {
      color: '#aaaaaa',
      width: 1,
      opacity: 0.6,
      curveness: 0.2,
      type: 'solid'
    };
    
    // 合并默认和实际的线条样式
    const lineStyle = link.lineStyle || {};
    
    return {
      source: link.source,
      target: link.target,
      sourceType: link.sourceType,
      targetType: link.targetType,
      originalColor: link.originalColor || '#aaaaaa',
      lineStyle: {
        color: isHidden ? 'transparent' : (lineStyle.color || link.color || link.originalColor || defaultLineStyle.color),
        width: isHidden ? 0 : (lineStyle.width || link.width || defaultLineStyle.width),
        opacity: isHidden ? 0 : (lineStyle.opacity || link.opacity || defaultLineStyle.opacity),
        curveness: lineStyle.curveness || link.curveness || defaultLineStyle.curveness,
        type: lineStyle.type || link.type || defaultLineStyle.type
      },
      symbol: link.symbol || ['none', 'arrow'],
      symbolSize: link.symbolSize || [0, 5],
      hidden: isHidden
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
    if (!this.chart || !nodeId) return null;
    
    try {
      const option = this.chart.getOption();
      if (!option || !option.series || !option.series[0] || !option.series[0].data) {
        return null;
      }
      
      const nodes = option.series[0].data;
      return nodes.find(node => node && node.id === nodeId) || null;
    } catch (e) {
      console.error("获取节点数据时出错:", e);
      return null;
    }
  }
  
  /**
   * 更新节点样式
   * @private
   */
  _updateNodeStyle(nodeId, status, colorRatio) {
    if (!this.chart) return;
  
    try {
      const option = this.chart.getOption();
      if (!option || !option.series || !option.series[0] || !option.series[0].data) return;
      
      const nodes = option.series[0].data;
      const nodeIndex = nodes.findIndex(node => node && node.id === nodeId);
      
      if (nodeIndex === -1) {
        console.warn(`未找到节点 ${nodeId} 进行样式更新`);
        return;
      }
      
      const node = nodes[nodeIndex];
      let borderColor, borderWidth;
      
      // 根据状态设置不同的边框颜色和宽度
      if (status === 'analyzing') {
        borderColor = '#ff4d4f'; // 红色 - 分析中
        borderWidth = 2;
      } else if (status === 'partial') {
        // 部分完成 - 橙色，不同阶段稍微不同色调
        borderColor = node.currentPhase === 1 ? '#faad14' : '#fa8c16';
        borderWidth = 2;
      } else if (status === 'completed') {
        borderColor = '#52c41a'; // 绿色 - 完成
        borderWidth = 2;
      } else {
        // 默认/待分析 - 灰色
        borderColor = '#888888';
        borderWidth = 1;
      }
      
      // 计算当前颜色 - 从灰色到节点原色的过渡
      const originalColor = node.originalColor || node.originColor || '#aaaaaa';
      const currentColor = mixColors('#aaaaaa', originalColor, colorRatio);
      
      console.log(`更新节点样式: ${nodeId}, 类型: ${node.nodeType || '未知'}, 状态: ${status}, 颜色: ${currentColor}, 边框: ${borderColor}`);
      
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
    } catch (error) {
      console.error(`更新节点 ${nodeId} 样式时出错:`, error);
    }
  }
  
  /**
   * 更新与节点相关的连接
   * @private
   */
  _updateRelatedLinks(nodeId) {
    if (!this.chart || !nodeId) return;
    
    try {
      const option = this.chart.getOption();
      if (!option || !option.series || !option.series[0]) return;
      
      const nodes = option.series[0].data || [];
      const links = option.series[0].links || [];
      
      // 找出与该节点相关的所有边
      const relatedLinks = links.filter(link => 
        link && (link.source === nodeId || link.target === nodeId)
      );
      
      if (relatedLinks.length === 0) return;
      
      // 记录已修改的连线
      const updatedLinks = [];
      
      relatedLinks.forEach(link => {
        const sourceNode = nodes.find(n => n && n.id === link.source);
        const targetNode = nodes.find(n => n && n.id === link.target);
        
        if (!sourceNode || !targetNode) return;
        
        // 打印节点状态用于调试
        console.log(`检查连线: ${sourceNode.id}(${sourceNode.nodeType}) [${sourceNode.status}] → ${targetNode.id}(${targetNode.nodeType}) [${targetNode.status}]`);
        
        // 边的颜色状态取决于源节点和目标节点的状态
        if (sourceNode.status === 'completed' && targetNode.status === 'completed') {
          // 如果两个节点都已分析完成，则显示原始彩色
          const linkColor = link.originalColor || '#f39c12'; // 使用原始颜色，如果没有则默认橙色
          const newWidth = 2;
          
          console.log(`连线两端节点均完成，设置为彩色(${linkColor}): ${sourceNode.id} → ${targetNode.id}`);
          
          // 直接更改连线对象
          if (link.lineStyle) {
            link.lineStyle.color = linkColor;
            link.lineStyle.width = newWidth;
            link.lineStyle.opacity = 0.9;
            link.lineStyle.curveness = 0.2;
          } else {
            link.lineStyle = {
              color: linkColor,
              width: newWidth,
              opacity: 0.9,
              curveness: 0.2
            };
          }
          
          // 记录已修改的连线
          updatedLinks.push(link);
        } else {
          // 至少有一个节点未完成，使用灰色
          const baseColor = '#aaaaaa';
          const baseWidth = 1;
          
          // 直接更改连线对象
          if (link.lineStyle) {
            link.lineStyle.color = baseColor;
            link.lineStyle.width = baseWidth;
            link.lineStyle.opacity = 0.6;
          } else {
            link.lineStyle = {
              color: baseColor,
              width: baseWidth,
              opacity: 0.6,
              curveness: 0.2
            };
          }
          
          // 记录已修改的连线
          updatedLinks.push(link);
        }
      });
      
      // 如果有连线被修改，更新图表
      if (updatedLinks.length > 0) {
        console.log(`更新了 ${updatedLinks.length} 条连线样式`);
        
        // 更新图表
        this.chart.setOption({
          series: [{
            links: links
          }]
        }, false);
      }
    } catch (error) {
      console.error(`更新与节点 ${nodeId} 相关的连接时出错:`, error);
    }
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
    for (const nodeId in this.progressBars) {
      const el = this.progressBars[nodeId];
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }
    
    // 清除分析图标
    for (const nodeId in this.analyzeIcons) {
      const el = this.analyzeIcons[nodeId];
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }
    
    // 清除阶段指示器
    for (const nodeId in this.phaseIndicators) {
      const el = this.phaseIndicators[nodeId];
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }
    
    // 重置存储
    this.progressBars = {};
    this.analyzeIcons = {};
    this.phaseIndicators = {};
    
    console.log("已清理所有进度显示元素");
  }
  
  /**
   * 获取与指定节点相关的所有连线 (在 ECharts 缓存中)
   * @private
   */
  _getLinksForNode(nodeId) {
    const option = this.chart.getOption();
    if (!option || !option.series || !option.series[0] || !option.series[0].links) return [];
    return option.series[0].links.filter(link =>
        (link.source === nodeId || link.target === nodeId)
    );
  }
  
  /**
   * 更新连线样式
   * @private
   */
  _updateLinkStyle(link, color, width) {
    // 取出当前图表配置
    const option = this.chart.getOption();
    const seriesLinks = option.series[0].links;
    
    // 找到该连线在 links 数组的索引
    const linkIndex = seriesLinks.findIndex(l => l.source === link.source && l.target === link.target);
    if (linkIndex === -1) return;
    
    seriesLinks[linkIndex].lineStyle = {
        ...(seriesLinks[linkIndex].lineStyle || {}),
        color: color,
        width: width,
        opacity: 0.8
    };

    // 重新设置到图表中
    this.chart.setOption({
        series: [{
            links: seriesLinks
        }]
    });
  }
  
  /**
   * 更新所有连线
   * 遍历图表中的所有连线，根据连接节点的状态更新样式
   */
  updateAllLinks() {
    if (!this.chart) return this;
    
    try {
      console.log("开始全局连线更新...");
      
      const option = this.chart.getOption();
      if (!option || !option.series || !option.series[0]) return this;
      
      const nodes = option.series[0].data || [];
      const links = option.series[0].links || [];
      
      if (links.length === 0) {
        console.log("没有找到连线，更新终止");
        return this;
      }
      
      console.log(`找到 ${links.length} 条连线需要更新`);
      let coloredCount = 0;
      
      // 遍历所有连线
      links.forEach(link => {
        const sourceNode = nodes.find(n => n && n.id === link.source);
        const targetNode = nodes.find(n => n && n.id === link.target);
        
        if (!sourceNode || !targetNode) return;
        
        // 检查两端节点状态
        const bothCompleted = sourceNode.status === 'completed' && targetNode.status === 'completed';
        
        if (bothCompleted) {
          // 两端节点都完成，使用原始彩色
          const originalColor = link.originalColor || '#f39c12';
          if (link.lineStyle) {
            link.lineStyle.color = originalColor;
            link.lineStyle.width = 2;
            link.lineStyle.opacity = 0.9;
          }
          coloredCount++;
        } else {
          // 至少一端节点未完成，使用灰色
          if (link.lineStyle) {
            link.lineStyle.color = '#aaaaaa';
            link.lineStyle.width = 1;
            link.lineStyle.opacity = 0.6;
          }
        }
      });
      
      // 更新图表
      this.chart.setOption({
        series: [{
          links: links
        }]
      }, false);
      
      console.log(`连线更新完成: ${coloredCount}/${links.length} 条连线设置为彩色`);
    } catch (error) {
      console.error("更新所有连线时出错:", error);
    }
    
    return this;
  }
}