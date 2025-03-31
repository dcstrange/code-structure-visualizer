import { Visualizer } from './visualizer.js';
import { mixColors } from '../utils/color-utils.js';

// 尝试获取cytoscape对象，支持不同的加载方式
let cytoscapeLib;
try {
  // 方式1: 全局变量（如通过script标签加载）
  if (typeof window.cytoscape !== 'undefined') {
    cytoscapeLib = window.cytoscape;
  }
  // 方式2: 如果以ESM方式导入cytoscape
  else {
    // 动态导入cytoscape，这将创建一个懒加载的chunk
    import('cytoscape').then(module => {
      cytoscapeLib = module.default || module;
    });
  }
} catch (e) {
  console.error("尝试加载Cytoscape时出错:", e);
}

export class CytoscapeAdapter extends Visualizer {
  constructor(container, miniMapContainer, eventBus) {
    super(container, miniMapContainer, eventBus);
    // 初始化属性
    this.cy = null;
    this.miniMap = null;
    // 其他属性...
    
    // 监听全局连线更新事件
    this.eventBus.on('update-all-links', () => {
      this.updateAllLinks();
    });
  }
  
  // 其他方法实现...

  _formatNode(node) {
    // 为不同类型节点设置不同颜色
    const colorMap = {
      'function': '#5470c6',  // 蓝色
      'variable': '#91cc75',  // 绿色
      'class': '#fac858',     // 黄色
      'typedef': '#ee6666',   // 红色
      'macro': '#73c0de',     // 浅蓝色
      'api': '#fc8452'        // 橙色
    };
    
    // 获取节点类型对应的颜色
    const originalColor = node.originalColor || node.originColor || colorMap[node.nodeType] || '#aaaaaa';
    
    return {
      group: 'nodes',
      data: {
        id: node.id,
        name: node.name,
        nodeType: node.nodeType,
        complexity: node.complexity,
        requiredPhases: node.requiredPhases,
        currentPhase: node.currentPhase || 0,
        status: node.status || 'pending',
        progress: node.progress || 0,
        originalColor: originalColor
      },
      position: { 
        x: node.x, 
        y: node.y 
      },
      style: {
        'background-color': node.status === 'completed' ? originalColor : '#aaaaaa'
      },
      classes: [
        node.nodeType, 
        node.status || 'pending',
        node.hidden ? 'hidden' : ''
      ].filter(c => c) // 移除空类名
    };
  }

  _formatEdge(link) {
    // 为不同类型连接设置不同颜色
    const colorMap = {
      'function': '#5470c6',  // 蓝色
      'variable': '#91cc75',  // 绿色
      'class': '#fac858',     // 黄色
      'typedef': '#ee6666',   // 红色
      'macro': '#73c0de',     // 浅蓝色
      'api': '#fc8452'        // 橙色
    };
    
    // 获取连接类型对应的颜色（使用目标节点类型）
    const originalColor = link.originalColor || colorMap[link.targetType] || '#aaaaaa';
    
    // 生成唯一ID
    const edgeId = `${link.source}-${link.target}`;
    
    return {
      group: 'edges',
      data: {
        id: edgeId,
        source: link.source,
        target: link.target,
        sourceType: link.sourceType,
        targetType: link.targetType,
        originalColor: originalColor
      },
      style: {
        'line-color': '#aaaaaa',  // 默认灰色
        'target-arrow-color': '#aaaaaa'
      },
      classes: [
        'gray-edge',
        link.hidden ? 'hidden' : ''
      ].filter(c => c) // 移除空类名
    };
  }

  updateAllLinks() {
    if (!this.cy) return this;
    
    console.log("开始全局连线更新...");
    let coloredCount = 0;
    
    // 遍历所有边
    this.cy.edges().forEach(edge => {
      const sourceNode = edge.source();
      const targetNode = edge.target();
      
      // 检查两端节点状态
      const bothCompleted = sourceNode.data('status') === 'completed' && 
                            targetNode.data('status') === 'completed';
      
      if (bothCompleted) {
        // 使用原始彩色
        const originalColor = edge.data('originalColor') || '#f39c12';
        edge.removeClass('gray-edge')
            .addClass('colored-edge')
            .style({
              'line-color': originalColor,
              'width': 2,
              'opacity': 0.9
            });
        coloredCount++;
      } else {
        // 使用灰色
        edge.removeClass('colored-edge')
            .addClass('gray-edge')
            .style({
              'line-color': '#aaaaaa',
              'width': 1,
              'opacity': 0.6
            });
      }
    });
    
    console.log(`连线更新完成: ${coloredCount}/${this.cy.edges().length} 条连线设置为彩色`);
    return this;
  }

  _updateRelatedLinks(nodeId) {
    if (!this.cy) return;
    
    const node = this.cy.getElementById(nodeId);
    if (!node) return;
    
    // 获取与节点相关的所有边
    const connectedEdges = node.connectedEdges();
    
    connectedEdges.forEach(edge => {
      const sourceNode = edge.source();
      const targetNode = edge.target();
      
      // 两端节点都完成时，使用彩色
      if (sourceNode.data('status') === 'completed' && 
          targetNode.data('status') === 'completed') {
        const originalColor = edge.data('originalColor') || '#f39c12';
        edge.style({
          'line-color': originalColor,
          'width': 2,
          'opacity': 0.9
        });
      } else {
        // 否则使用灰色
        edge.style({
          'line-color': '#aaaaaa',
          'width': 1,
          'opacity': 0.6
        });
      }
    });
  }

  /**
   * 初始化Cytoscape图表
   */
  initialize() {
    // 防御性检查
    if (!cytoscapeLib && typeof cytoscape === 'undefined') {
      console.error('Cytoscape库未加载');
      this.eventBus.emit('visualization-error', 'Cytoscape库未加载');
      return this;
    }
    
    // 使用已确认可用的cytoscape
    const cyLib = cytoscapeLib || cytoscape;
    
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
    
    try {
      // 初始化Cytoscape实例
      this.cy = cyLib({
        container: this.container,
        style: cytoscapeStyle,
        elements: [], // 初始为空
        layout: { name: 'preset' }, // 使用预设位置
        wheelSensitivity: 0.2,
        minZoom: 0.5,
        maxZoom: 5,
        autoungrabify: false, // 允许拖动节点
        autounselectify: false // 允许选择节点
      });
      
      console.log("Cytoscape初始化成功");
      
      // 添加事件监听
      this._setupEventListeners();
      
      // 适用于Cytoscape的性能优化
      this._setupPerformanceOptimizations();
      
      // 初始化迷你地图（如果有cytoscape-minimap扩展）
      this._initMiniMap();
    } catch (error) {
      console.error("初始化Cytoscape时出错:", error);
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
        if (this.cy) this.cy.resize();
      }, 200);
    });
    
    // 减少渲染频率，提高性能
    if (this.cy) {
      // 设置更低级别的动画
      this.cy.userZoomingEnabled(true);
      this.cy.userPanningEnabled(true);
      
      // 对于大量节点，禁用一些计算密集型功能
      if (this.cy.nodes().length > 500) {
        this.cy.nodes().style({
          'text-opacity': 0 // 大量节点时隐藏标签
        });
      }
    }
  }

  /**
   * 初始化迷你地图
   * @private
   */
  _initMiniMap() {
    // Cytoscape-minimap是一个可选扩展
    if (this.miniMapContainer && this.cy && typeof this.cy.minimap === 'function') {
      try {
        this.miniMap = this.cy.minimap({
          container: this.miniMapContainer,
          size: { w: 120, h: 120 },
          position: 'top-left',
          locked: true
        });
        console.log("小地图初始化成功");
      } catch (error) {
        console.error("初始化小地图时出错:", error);
      }
    } else {
      console.log("未找到小地图扩展或容器");
    }
  }

  /**
   * 设置事件监听器
   * @private
   */
  _setupEventListeners() {
    if (!this.cy) return;
    
    // 节点点击事件
    this.cy.on('tap', 'node', (event) => {
      const nodeId = event.target.id();
      this.eventBus.emit('node-clicked', nodeId);
    });
    
    // 节点双击事件 - 聚焦到节点
    this.cy.on('dbltap', 'node', (event) => {
      const node = event.target;
      this.cy.animate({
        zoom: 2,
        center: {
          eles: node
        },
        duration: 500
      });
    });
    
    // 视图变化事件 - 更新DOM元素位置
    this.cy.on('viewport', () => {
      this.updateElementPositions();
    });
  }

  /**
   * 更新节点数据
   * @param {Array} nodes 节点数据数组
   */
  updateNodes(nodes) {
    if (!this.cy) return this;
    
    try {
      console.log(`更新 ${nodes.length} 个节点`);
      
      // 移除现有节点
      this.cy.nodes().remove();
      
      // 批量添加新节点
      const formattedNodes = nodes.map(node => this._formatNode(node));
      this.cy.add(formattedNodes);
      
      // 如果节点数较少，启用标签显示
      if (nodes.length < 300) {
        this.cy.nodes().style({
          'text-opacity': 1
        });
      }
      
      // 获取当前视口大小
      const containerWidth = this.container.clientWidth;
      const containerHeight = this.container.clientHeight;
      
      // 使用力导向布局 - 真正的物理模拟，让有连接的节点自然聚集
      this.cy.layout({
        name: 'cose',
        // 基本设置
        randomize: true,           // 使用随机初始位置
        fit: true,                 // 适应视图
        padding: 80,               // 边距
        nodeDimensionsIncludeLabels: true,
        
        // 布局迭代参数
        refresh: 20,               // 更新频率
        componentSpacing: 200,     // 组件间隔，增大到200让不同组间距更大
        nodeRepulsion: function(node) {  // 节点间斥力，差异化处理不同类型节点
          // 让不同类型节点有不同的排斥力，增强类型分组效果
          const nodeType = node.data('nodeType');
          switch(nodeType) {
            case 'function': return 9000;  // 函数节点更分散
            case 'class': return 10000;    // 类节点最分散
            case 'variable': return 7000;  // 变量节点更聚集
            case 'typedef': return 8500;   // 类型定义适中
            case 'macro': return 8000;     // 宏定义适中
            case 'api': return 9500;       // API节点较分散
            default: return 8000;          // 默认值
          }
        },
        nodeOverlap: 8,           // 节点重叠避免，减小到8让紧密关联的节点更靠近
        
        // 边处理参数
        idealEdgeLength: function(edge) {  // 差异化理想边长度
          // 根据连接的节点类型设置不同的理想边长度
          const sourceType = edge.source().data('nodeType');
          const targetType = edge.target().data('nodeType');
          
          // 同类型节点间连接更短，不同类型节点间连接更长
          if (sourceType === targetType) {
            return 80;  // 同类型节点连接更短，更紧密聚类
          } else {
            return 150; // 不同类型节点连接更长，促进类型分组
          }
        },
        edgeElasticity: 120,       // 边的弹性，增大到120提高边的约束力
        
        // 布局收敛参数
        numIter: 2500,             // 迭代次数增加到2500，获得更稳定的布局
        initialTemp: 250,          // 初始温度提高到250，增加初始活跃度
        coolingFactor: 0.97,       // 冷却因子调整为0.97，更缓慢降温
        minTemp: 1.0,              // 最低温度
        
        // 物理模拟参数
        gravity: 80,               // 引力增强到80，让聚类更明显
        gravityRangeCompound: 1.8, // 引力范围扩大到1.8
        gravityCompound: 1.2,      // 复合引力增强到1.2
        nestingFactor: 1.5,        // 嵌套因子增大到1.5，增强层次结构
        
        // 性能参数
        animate: 'end',            // 只在结束时动画
        animationDuration: 1000,   // 动画时长
        animationEasing: 'ease-out',
        
        // 布局事件回调
        ready: function() {
          console.log('力导向布局准备完成');
        },
        stop: function() {
          console.log('力导向布局完成');
        }
      }).run();
      
      // 布局完成后，增加第二阶段的边束缚，强化同类型节点聚集
      setTimeout(() => {
        console.log('开始第二阶段布局优化 - 强化类型聚类');
        
        // 对每种类型的节点进行额外微调，让相同类型的节点更紧密
        const nodeTypeMap = {};
        
        // 按类型收集节点
        this.cy.nodes().forEach(node => {
          const nodeType = node.data('nodeType');
          if (!nodeTypeMap[nodeType]) {
            nodeTypeMap[nodeType] = [];
          }
          nodeTypeMap[nodeType].push(node);
        });
        
        // 对每个类型的组单独应用收缩引力
        Object.entries(nodeTypeMap).forEach(([nodeType, nodes]) => {
          if (nodes.length >= 3) { // 只对节点数足够的类型进行优化
            // 寻找该类型节点组的中心位置
            let centerX = 0, centerY = 0;
            nodes.forEach(node => {
              const pos = node.position();
              centerX += pos.x;
              centerY += pos.y;
            });
            centerX /= nodes.length;
            centerY /= nodes.length;
            
            // 向中心靠拢，但保持原有的相对位置
            nodes.forEach(node => {
              const pos = node.position();
              const dx = centerX - pos.x;
              const dy = centerY - pos.y;
              
              // 根据距离中心的远近调整收缩力度，越远收缩越弱
              const distance = Math.sqrt(dx*dx + dy*dy);
              const factor = 0.2 * Math.min(1, 150 / Math.max(distance, 1));
              
              // 向中心收缩，越近的收缩越多
              node.position({
                x: pos.x + dx * factor,
                y: pos.y + dy * factor
              });
            });
          }
        });
        
        // 第三阶段：应用圆形布局优化大型节点组
        Object.entries(nodeTypeMap).forEach(([nodeType, nodes]) => {
          if (nodes.length >= 8) { // 只对较大节点组应用圆形布局
            console.log(`优化 ${nodeType} 类型的大型节点组 (${nodes.length}个节点)`);
            
            // 获取当前组的中心
            let centerX = 0, centerY = 0;
            nodes.forEach(node => {
              const pos = node.position();
              centerX += pos.x;
              centerY += pos.y;
            });
            centerX /= nodes.length;
            centerY /= nodes.length;
            
            // 计算平均散布半径
            let totalRadius = 0;
            nodes.forEach(node => {
              const pos = node.position();
              const dx = pos.x - centerX;
              const dy = pos.y - centerY;
              totalRadius += Math.sqrt(dx*dx + dy*dy);
            });
            const avgRadius = Math.max(100, totalRadius / nodes.length);
            
            // 按连接关系相似度排序，使相似节点相邻
            nodes.sort((a, b) => {
              const aConnections = a.connectedEdges().length;
              const bConnections = b.connectedEdges().length;
              return bConnections - aConnections; // 连接多的节点优先
            });
            
            // 以更均匀的圆形分布排列节点
            const angleStep = (2 * Math.PI) / nodes.length;
            nodes.forEach((node, i) => {
              const angle = i * angleStep;
              // 增加一点随机扰动，避免完美对称
              const randomFactor = 0.9 + Math.random() * 0.2; 
              const radius = avgRadius * randomFactor;
              
              node.position({
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle)
              });
            });
          }
        });
        
        // 最后应用关联节点的调整，让互相连接的节点更靠近
        this.cy.edges().forEach(edge => {
          const source = edge.source();
          const target = edge.target();
          const sourceType = source.data('nodeType');
          const targetType = target.data('nodeType');
          
          // 对不同类型的节点连接进行微调
          if (sourceType !== targetType) {
            const sourcePos = source.position();
            const targetPos = target.position();
            
            // 计算两点间距离
            const dx = targetPos.x - sourcePos.x;
            const dy = targetPos.y - sourcePos.y;
            const distance = Math.sqrt(dx*dx + dy*dy);
            
            // 只对距离太远的连接进行调整
            if (distance > 250) {
              // 将两个节点轻微拉近
              const factor = 0.1; // 调整系数，避免过度移动
              
              // 将两个节点向彼此靠近
              source.position({
                x: sourcePos.x + dx * factor,
                y: sourcePos.y + dy * factor
              });
              
              target.position({
                x: targetPos.x - dx * factor,
                y: targetPos.y - dy * factor
              });
            }
          }
        });
        
        console.log('第二阶段布局优化完成');
        
        // 优化布局完成后触发事件
        this.eventBus.emit('layout-optimized');
      }, 1500); // 等待初始布局完成后再应用优化
    } catch (error) {
      console.error("更新节点时出错:", error);
    }
    
    return this;
  }

  /**
   * 更新连接数据
   * @param {Array} links 连接数据数组
   */
  updateLinks(links) {
    if (!this.cy) return this;
    
    try {
      console.log(`更新 ${links.length} 个连接`);
      
      // 移除现有边
      this.cy.edges().remove();
      
      // 批量添加新边
      const formattedEdges = links.map(link => this._formatEdge(link));
      this.cy.add(formattedEdges);
      
      // 在下一帧渲染
      requestAnimationFrame(() => {
        this.updateAllLinks();
      });
    } catch (error) {
      console.error("更新连接时出错:", error);
    }
    
    return this;
  }

  /**
   * 更新节点状态
   * @param {string} nodeId 节点ID
   * @param {string} status 状态
   * @param {number} progress 进度
   * @param {number} phase 当前阶段
   */
  updateNodeStatus(nodeId, status, progress, phase = null) {
    if (!this.cy) return this;
    
    try {
      // 获取节点
      const node = this.cy.getElementById(nodeId);
      if (!node || node.length === 0) {
        console.warn(`未找到节点 ${nodeId}`);
        return this;
      }
      
      // 更新节点数据
      node.data('status', status);
      node.data('progress', progress);
      if (phase !== null) {
        node.data('currentPhase', phase);
      }
      
      // 更新节点样式
      this._updateNodeStyle(node, status, progress);
      
      // 更新进度条
      this._updateProgressBar(nodeId, status, progress);
      
      // 更新相关连接
      this._updateRelatedLinks(nodeId);
      
      console.log(`更新节点状态: ${nodeId}, 状态: ${status}, 进度: ${progress}`);
    } catch (error) {
      console.error(`更新节点 ${nodeId} 状态时出错:`, error);
    }
    
    return this;
  }

  /**
   * 更新节点样式
   * @private
   */
  _updateNodeStyle(node, status, progress) {
    // 移除所有状态类
    node.removeClass('pending analyzing partial completed');
    
    // 添加当前状态类
    node.addClass(status);
    
    // 计算颜色渐变程度
    let colorRatio = 0;
    if (status === 'analyzing') {
      colorRatio = Math.min(0.25, (progress / 100) * 0.25);
    } else if (status === 'partial') {
      const currentPhase = node.data('currentPhase');
      const requiredPhases = node.data('requiredPhases');
      const baseRatio = 0.25;
      const maxPhaseRatio = 0.75;
      colorRatio = baseRatio + ((currentPhase / requiredPhases) * (maxPhaseRatio - baseRatio));
    } else if (status === 'completed') {
      colorRatio = 1.0;
    }
    
    // 设置节点颜色
    const originalColor = node.data('originalColor') || '#aaaaaa';
    const currentColor = mixColors('#aaaaaa', originalColor, colorRatio);
    
    // 设置节点边框颜色
    let borderColor, borderWidth;
    if (status === 'analyzing') {
      borderColor = '#ff4d4f'; // 红色
      borderWidth = 2;
    } else if (status === 'partial') {
      // 部分完成 - 橙色
      const currentPhase = node.data('currentPhase');
      borderColor = currentPhase === 1 ? '#faad14' : '#fa8c16';
      borderWidth = 2;
    } else if (status === 'completed') {
      borderColor = '#52c41a'; // 绿色
      borderWidth = 2;
    } else {
      borderColor = '#888888'; // 灰色
      borderWidth = 1;
    }
    
    // 应用样式
    node.style({
      'background-color': currentColor,
      'border-color': borderColor,
      'border-width': borderWidth
    });
  }

  /**
   * 更新进度条
   * @private
   */
  _updateProgressBar(nodeId, status, progress) {
    // 获取进度条元素
    const progressBar = this.progressBars[nodeId];
    if (!progressBar) {
      console.warn(`未找到节点 ${nodeId} 的进度条元素`);
      return;
    }
    
    // 获取填充元素
    let progressFill = progressBar.firstChild;
    if (!progressFill) {
      progressFill = document.createElement('div');
      progressFill.className = 'progress-bar-fill';
      progressBar.appendChild(progressFill);
    }
    
    // 根据状态更新视觉效果
    if (status === 'analyzing') {
      // 显示进度条
      progressBar.style.display = 'block';
      progressBar.dataset.display = 'block';
      progressFill.style.width = progress + '%';
      
      // 添加分析图标
      this._updateAnalysisIcon(nodeId, true);
      
    } else if (status === 'partial') {
      // 更新进度条
      progressFill.style.width = '100%';
      progressBar.style.display = 'block';
      progressBar.dataset.display = 'block';
      
      // 移除分析图标
      this._updateAnalysisIcon(nodeId, false);
      
    } else if (status === 'completed') {
      // 更新进度条
      progressFill.style.width = '100%';
      
      // 移除分析图标
      this._updateAnalysisIcon(nodeId, false);
      
      // 直接存储对进度条元素的引用
      const pb = progressBar;
      
      // 淡出进度条
      setTimeout(() => {
        if (pb && pb.style) {
          pb.style.opacity = '0';
          pb.style.transition = 'opacity 0.5s';
          
          setTimeout(() => {
            if (pb && pb.style) {
              pb.style.display = 'none';
              pb.dataset.display = 'none';
              pb.style.opacity = '1';
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
        const node = this.cy.getElementById(nodeId);
        if (!node || node.length === 0) return;
        
        // 获取节点在屏幕上的位置
        const position = node.renderedPosition();
        
        // 创建图标
        const icon = document.createElement('div');
        icon.innerHTML = '⚙️';
        icon.style.position = 'absolute';
        icon.style.left = (position.x + 10) + 'px';
        icon.style.top = (position.y - 20) + 'px';
        icon.style.fontSize = '16px';
        icon.className = 'analyzing-icon';
        icon.style.display = 'block';
        
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
   * 初始化进度显示元素
   */
  initProgressElements() {
    // 清理旧元素
    this._clearProgressElements();
    
    // 检查图表实例是否可用
    if (!this.cy) {
      console.warn("无法初始化进度元素: 图表实例不可用");
      return this;
    }
    
    try {
      // 获取所有节点
      const nodes = this.cy.nodes();
      
      console.log(`正在为 ${nodes.length} 个节点创建进度条元素...`);
      
      // 为每个节点创建进度条
      nodes.forEach(node => {
        const nodeId = node.id();
        
        // 获取节点在屏幕上的位置
        const position = node.renderedPosition();
        
        // 清理可能已存在的进度条元素
        if (this.progressBars[nodeId] && this.progressBars[nodeId].parentNode) {
          this.progressBars[nodeId].parentNode.removeChild(this.progressBars[nodeId]);
          delete this.progressBars[nodeId];
        }
        
        // 创建新的进度条容器
        const progressBarContainer = document.createElement('div');
        progressBarContainer.className = 'progress-bar-container';
        progressBarContainer.style.position = 'absolute';
        progressBarContainer.style.left = (position.x - 15) + 'px';
        progressBarContainer.style.top = (position.y + 15) + 'px';
        progressBarContainer.style.width = '30px';
        progressBarContainer.style.height = '4px';
        progressBarContainer.style.backgroundColor = '#444444';
        progressBarContainer.style.borderRadius = '2px';
        progressBarContainer.style.overflow = 'hidden';
        progressBarContainer.style.zIndex = '100';
        progressBarContainer.dataset.nodeId = nodeId;
        progressBarContainer.dataset.nodeType = node.data('nodeType');
        progressBarContainer.dataset.display = 'none';
        
        // 进度条填充
        const progressBarFill = document.createElement('div');
        progressBarFill.className = 'progress-bar-fill';
        progressBarFill.style.height = '100%';
        progressBarFill.style.width = '0%';
        progressBarFill.style.backgroundColor = node.data('originalColor') || '#aaaaaa';
        progressBarFill.style.transition = 'width 0.2s ease-in-out';
        
        progressBarContainer.appendChild(progressBarFill);
        this.container.appendChild(progressBarContainer);
        
        // 存储进度条引用
        this.progressBars[nodeId] = progressBarContainer;
        
        // 初始状态为隐藏
        progressBarContainer.style.display = 'none';
        
        // 如果节点已经有状态，立即应用
        const status = node.data('status');
        if (status && status !== 'pending') {
          this.updateNodeStatus(nodeId, status, node.data('progress') || 0, node.data('currentPhase') || 0);
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
    if (!this.cy) return this;
    
    // 更新需要间隔控制，避免频繁更新导致性能问题
    const now = Date.now();
    if (now - (this.lastElementUpdateTime || 0) < 50) return this;
    this.lastElementUpdateTime = now;
    
    try {
      // 获取所有节点
      this.cy.nodes().forEach(node => {
        const nodeId = node.id();
        const position = node.renderedPosition();
        
        // 更新进度条位置
        const progressBar = this.progressBars[nodeId];
        if (progressBar) {
          progressBar.style.left = (position.x - 15) + 'px';
          progressBar.style.top = (position.y + 15) + 'px';
          
          // 根据节点可见性和进度条状态决定是否显示
          const isHidden = node.hasClass('hidden');
          progressBar.style.display = isHidden ? 'none' : progressBar.dataset.display || 'none';
        }
        
        // 更新分析图标位置
        const icon = this.analyzeIcons[nodeId];
        if (icon) {
          icon.style.left = (position.x + 10) + 'px';
          icon.style.top = (position.y - 20) + 'px';
          
          // 根据节点可见性决定是否显示
          const isHidden = node.hasClass('hidden');
          icon.style.display = isHidden ? 'none' : 'block';
        }
      });
    } catch (error) {
      console.error("更新DOM元素位置时出错:", error);
    }
    
    return this;
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
   * 设置缩放级别
   * @param {number} level 缩放级别
   */
  setZoom(level) {
    if (!this.cy) return this;
    
    // 限制缩放范围
    const zoom = Math.max(0.5, Math.min(5, level));
    
    // 应用缩放
    this.cy.zoom(zoom);
    this.cy.center();
    
    // 更新DOM元素位置
    this.updateElementPositions();
    
    return this;
  }

  /**
   * 重置视图
   */
  resetView() {
    if (!this.cy) return this;
    
    // 适应视图
    this.cy.fit();
    this.cy.center();
    
    // 更新DOM元素位置
    this.updateElementPositions();
    
    return this;
  }

  /**
   * 转换为屏幕坐标
   * @param {number} x 
   * @param {number} y 
   */
  convertToScreenCoordinates(x, y) {
    if (!this.cy) return [0, 0];
    
    // 创建一个临时位置模型
    const position = this.cy.pan();
    const zoom = this.cy.zoom();
    
    // 转换坐标
    const screenX = position.x + zoom * x;
    const screenY = position.y + zoom * y;
    
    return [screenX, screenY];
  }

  /**
   * 应用节点过滤
   * @param {Array} nodes 节点数据
   * @param {Array} links 连接数据
   */
  applyFilter(nodes, links) {
    if (!this.cy) return this;
    
    try {
      // 更新节点可见性
      nodes.forEach(node => {
        const cyNode = this.cy.getElementById(node.id);
        if (cyNode.length > 0) {
          if (node.hidden) {
            cyNode.addClass('hidden');
            cyNode.style('opacity', 0);
          } else {
            cyNode.removeClass('hidden');
            cyNode.style('opacity', 1);
          }
        }
      });
      
      // 更新连接可见性
      links.forEach(link => {
        const edgeId = `${link.source}-${link.target}`;
        const cyEdge = this.cy.getElementById(edgeId);
        if (cyEdge.length > 0) {
          if (link.hidden) {
            cyEdge.addClass('hidden');
            cyEdge.style('opacity', 0);
          } else {
            cyEdge.removeClass('hidden');
            cyEdge.style('opacity', 1);
          }
        }
      });
      
      // 更新DOM元素位置
      this.updateElementPositions();
    } catch (error) {
      console.error("应用过滤器时出错:", error);
    }
    
    return this;
  }

  /**
   * 设置交互启用状态
   * @param {boolean} enabled 是否启用交互
   */
  setInteractionEnabled(enabled) {
    if (!this.cy) return this;
    
    // 设置交互选项
    this.cy.userZoomingEnabled(enabled);
    this.cy.userPanningEnabled(enabled);
    this.cy.boxSelectionEnabled(enabled);
    
    return this;
  }

  /**
   * 销毁实例
   */
  destroy() {
    // 清理DOM元素
    this._clearProgressElements();
    
    // 销毁实例
    if (this.cy) {
      this.cy.destroy();
      this.cy = null;
    }
    
    console.log("Cytoscape实例已销毁");
    
    return this;
  }
}

const cytoscapeStyle = [
  {
    selector: 'node',
    style: {
      'background-color': '#aaaaaa', // 默认灰色
      'border-width': 1,
      'border-color': '#888888',
      'label': 'data(name)',
      'font-size': '10px',
      'text-valign': 'bottom',
      'text-halign': 'center',
      'width': '16px',  // 更小的节点
      'height': '16px', // 更小的节点
      'text-margin-y': '5px',  // 增加标签和节点间距
      'text-background-opacity': 0.5,  // 半透明背景
      'text-background-color': '#000',
      'text-background-padding': '1px',
      'text-background-shape': 'roundrectangle',
      'color': '#fff',  // 标签文字颜色
      'text-outline-width': 0.5,
      'text-outline-opacity': 0.5
    }
  },
  // 为不同类型节点设置不同形状和样式
  {
    selector: 'node[nodeType="function"]',
    style: {
      'shape': 'ellipse',  // 函数为圆形
      'background-color': '#5470c6',
      'border-color': '#4060b8',
      'border-width': 1.5,
      'width': '18px',
      'height': '18px'
    }
  },
  {
    selector: 'node[nodeType="variable"]',
    style: {
      'shape': 'round-rectangle',  // 变量为圆角矩形
      'background-color': '#91cc75',
      'border-color': '#81bc65',
      'border-width': 1.5,
      'width': '14px',
      'height': '14px'
    }
  },
  {
    selector: 'node[nodeType="class"]',
    style: {
      'shape': 'diamond',  // 类为菱形
      'background-color': '#fac858',
      'border-color': '#eab848',
      'border-width': 1.5,
      'width': '20px',
      'height': '20px'
    }
  },
  {
    selector: 'node[nodeType="typedef"]',
    style: {
      'shape': 'hexagon',  // 类型定义为六边形
      'background-color': '#ee6666',
      'border-color': '#de5656',
      'border-width': 1.5,
      'width': '17px',
      'height': '17px'
    }
  },
  {
    selector: 'node[nodeType="macro"]',
    style: {
      'shape': 'rectangle',  // 宏为矩形
      'background-color': '#73c0de',
      'border-color': '#63b0ce',
      'border-width': 1.5,
      'width': '16px',
      'height': '16px'
    }
  },
  {
    selector: 'node[nodeType="api"]',
    style: {
      'shape': 'octagon',  // API为八边形
      'background-color': '#fc8452',
      'border-color': '#ec7442',
      'border-width': 1.5,
      'width': '18px',
      'height': '18px'
    }
  },
  // 状态样式
  {
    selector: 'node[status="completed"]',
    style: {
      'background-color': 'data(originalColor)',
      'border-color': 'data(originalColor)',
      'border-width': 2,
      'border-opacity': 0.8,
      'shadow-blur': 5,
      'shadow-color': 'data(originalColor)',
      'shadow-opacity': 0.6
    }
  },
  {
    selector: 'node[status="analyzing"]',
    style: {
      'background-color': '#cccccc',
      'border-color': '#888888',
      'border-style': 'dashed'
    }
  },
  {
    selector: 'node[status="pending"]',
    style: {
      'background-color': '#aaaaaa',
      'border-color': '#888888'
    }
  },
  // 边样式
  {
    selector: 'edge',
    style: {
      'width': 1,
      'line-color': '#aaaaaa',
      'target-arrow-color': '#aaaaaa',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'opacity': 0.6
    }
  },
  {
    selector: 'edge.colored-edge',
    style: {
      'line-color': 'data(originalColor)',
      'target-arrow-color': 'data(originalColor)',
      'opacity': 0.8
    }
  },
  {
    selector: 'edge.gray-edge',
    style: {
      'line-color': '#aaaaaa',
      'target-arrow-color': '#aaaaaa',
      'opacity': 0.5
    }
  },
  // 隐藏元素
  {
    selector: '.hidden',
    style: {
      'display': 'none'
    }
  },
  // 高亮样式
  {
    selector: 'node:selected',
    style: {
      'border-width': 3,
      'border-color': '#ffffff', 
      'border-opacity': 1,
      'shadow-blur': 10,
      'shadow-color': '#ffffff',
      'shadow-opacity': 0.8,
      'shadow-offset-x': 0,
      'shadow-offset-y': 0
    }
  },
  {
    selector: 'edge:selected',
    style: {
      'width': 3,
      'line-color': '#ffffff',
      'target-arrow-color': '#ffffff',
      'opacity': 1
    }
  }
];
