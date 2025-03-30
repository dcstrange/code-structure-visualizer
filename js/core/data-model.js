import { getNodeTypeConfig } from '../utils/node-types.js';

/**
 * 通用数据模型 - 管理节点和连接数据
 */
export class DataModel {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.nodes = [];
    this.links = [];
    this.nodeTypeConfig = getNodeTypeConfig();
    this.complexityConfig = {
      'high': { phases: 3, phaseNames: ['基础结构', '逻辑分析', '深度检查'] },
      'medium': { phases: 2, phaseNames: ['基础分析', '深度检查'] },
      'low': { phases: 1, phaseNames: ['完整分析'] }
    };
    
    // 存储代码元素数据
    this.codeElements = {
      'function': [
        'getData()', 'processResult()', 'validateInput()', 'calculateSum()', 
        'findUserById()', 'updateConfig()', 'handleRequest()', 'parseJSON()', 
        'renderUI()', 'sendNotification()', 'checkPermissions()', 'encryptData()', 
        'connectDatabase()', 'logActivity()', 'fetchResources()'
      ],
      'variable': [
        'userCount', 'dataCache', 'resultSet', 'configOptions', 
        'errorMessage', 'isActive', 'currentUser', 'pageIndex', 
        'totalItems', 'selectedOption'
      ],
      'class': [
        'UserManager', 'DataProcessor', 'EventHandler', 'ConfigService', 
        'ApiClient', 'CacheStore', 'Logger'
      ],
      'typedef': [
        'UserProfile', 'RequestParams', 'ResponseData', 'ErrorCode',
        'ConfigOption', 'ValidationRule', 'DatabaseRecord'
      ],
      'macro': [
        'MAX_RETRY_COUNT', 'DEFAULT_TIMEOUT', 'LOG_LEVEL', 'API_VERSION',
        'ENABLE_CACHING', 'DEBUG_MODE'
      ],
      'api': [
        'GET /users', 'POST /auth', 'PUT /profile', 'DELETE /session',
        'GET /products', 'POST /orders'
      ]
    };
  }
  
  /**
   * 获取节点类型配置
   */
  getNodeTypeConfig() {
    return this.nodeTypeConfig;
  }
  
  /**
   * 生成图形数据（节点和连接）
   */
  generateData() {
    this.generateNodes();
    this.generateLinks();
    return this;
  }
  
  /**
   * 生成节点数据
   */
  generateNodes() {
    let index = 0;
    this.nodes = [];
    
    // 为每种类型的代码元素创建节点
    Object.entries(this.codeElements).forEach(([type, elements]) => {
      const elementCount = elements.length;
      
      elements.forEach((name, i) => {
        // 使用布局算法获取坐标
        const position = this.generateNodeCoordinates(type, i, elementCount);
        
        // 确定节点复杂度
        const complexity = this.nodeTypeConfig[type].complexity;
        const requiredPhases = this.complexityConfig[complexity].phases;
        const nodeColor = this.nodeTypeConfig[type].color;
        const nodeBorderColor = this.nodeTypeConfig[type].borderColor;
        
        this.nodes.push({
          id: index.toString(),
          name: name,
          nodeType: type,
          complexity: complexity,
          requiredPhases: requiredPhases,
          currentPhase: 0, // 从0开始，表示尚未分析
          symbolSize: 30,
          symbol: this.nodeTypeConfig[type].symbol,
          itemStyle: {
            color: '#aaaaaa', // 初始为灰色
            borderColor: '#888888',
            borderWidth: 1,
            opacity: 0.8
          },
          originalColor: nodeColor,
          originalBorderColor: nodeBorderColor,
          x: position.x,
          y: position.y,
          fixed: true,
          status: 'pending',
          progress: 0,
          label: {
            show: true,
            text: name,
            fontSize: 12
          },
          hidden: false
        });
        index++;
      });
    });
    
    // 通知视图更新节点
    console.log(`生成了 ${this.nodes.length} 个节点`); // 添加日志
    this.eventBus.emit('nodes-updated', this.nodes);
    return this;
  }
  
  /**
   * 生成连接数据
   */
  generateLinks() {
    this.links = [];
    const functionNodes = this.nodes.filter(n => n.nodeType === 'function');
    const variableNodes = this.nodes.filter(n => n.nodeType === 'variable');
    const classNodes = this.nodes.filter(n => n.nodeType === 'class');
    const typedefNodes = this.nodes.filter(n => n.nodeType === 'typedef');
    const macroNodes = this.nodes.filter(n => n.nodeType === 'macro');
    const apiNodes = this.nodes.filter(n => n.nodeType === 'api');
    
    // 函数调用函数
    functionNodes.forEach(source => {
      const callCount = Math.floor(Math.random() * 2) + 1;
      for (let i = 0; i < callCount; i++) {
        const target = functionNodes[Math.floor(Math.random() * functionNodes.length)];
        if (source.id !== target.id) {
          this._createLink(source, target, '#5470c6');
        }
      }
    });
    
    // 函数使用变量
    functionNodes.forEach(source => {
      if (variableNodes.length === 0) return;
      
      const useCount = Math.floor(Math.random() * 3);
      for (let i = 0; i < useCount; i++) {
        const target = variableNodes[Math.floor(Math.random() * variableNodes.length)];
        this._createLink(source, target, '#91cc75');
      }
    });
    
    // 类包含函数
    classNodes.forEach(source => {
      if (functionNodes.length === 0) return;
      
      const methodCount = Math.floor(Math.random() * 4) + 1;
      for (let i = 0; i < methodCount; i++) {
        const target = functionNodes[Math.floor(Math.random() * functionNodes.length)];
        this._createLink(source, target, '#fac858');
      }
    });
    
    // 类使用typedef
    classNodes.forEach(source => {
      if (typedefNodes.length === 0) return;
      
      const useTypeCount = Math.floor(Math.random() * 2) + 1;
      for (let i = 0; i < useTypeCount; i++) {
        const target = typedefNodes[Math.floor(Math.random() * typedefNodes.length)];
        this._createLink(source, target, '#ee6666');
      }
    });
    
    // 函数使用宏
    functionNodes.forEach(source => {
      if (macroNodes.length === 0) return;
      
      if (Math.random() > 0.7) { // 30%概率使用宏
        const target = macroNodes[Math.floor(Math.random() * macroNodes.length)];
        this._createLink(source, target, '#73c0de');
      }
    });
    
    // 函数调用API
    functionNodes.forEach(source => {
      if (apiNodes.length === 0) return;
      
      if (Math.random() > 0.6) { // 40%概率调用API
        const target = apiNodes[Math.floor(Math.random() * apiNodes.length)];
        this._createLink(source, target, '#fc8452');
      }
    });
    
    // 通知视图更新连接
    this.eventBus.emit('links-updated', this.links);
    return this;
  }
  
  // 添加辅助方法创建连接
  _createLink(source, target, color) {
    this.links.push({
      source: source.id,
      target: target.id,
      sourceType: source.nodeType,
      targetType: target.nodeType,
      originalColor: color,
      color: '#aaaaaa', // 初始为灰色
      width: 1,
      opacity: 0.6,
      curveness: 0.2,
      type: 'solid',
      symbol: ['none', 'arrow'],
      symbolSize: [0, 5],
      hidden: false
    });
  }

  /**
   * 生成节点坐标
   */
  generateNodeCoordinates(type, index, totalNodes) {
    const config = this.nodeTypeConfig[type];
    const region = config.region;
    const centerX = region.x + region.w / 2;
    const centerY = region.y + region.h / 2;
    
    // 网格布局
    const cols = Math.ceil(Math.sqrt(totalNodes));
    const rows = Math.ceil(totalNodes / cols);
    const cellWidth = region.w / (cols + 1);
    const cellHeight = region.h / (rows + 1);
    const row = Math.floor(index / cols);
    const col = index % cols;
        
    return {
      x: region.x + cellWidth * (col + 1),
      y: region.y + cellHeight * (row + 1)
    };
  }
  
  /**
   * 更新节点状态
   */
  updateNodeStatus(nodeId, status, progress, phase = null) {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return this;
    
    node.status = status;
    node.progress = progress;
    
    if (phase !== null) {
      node.currentPhase = phase;
    }
    
    // 通知视图更新
    this.eventBus.emit('node-status-updated', nodeId, status, progress, phase);
    // 同时更新与此节点相关的边的状态
    //this.updateEdgeStatusByNodes(nodeId);
    // 计算总进度
    this.calculateTotalProgress();
    
    return this;
  }
  
  /**
   * 获取节点信息
   */
  getNode(nodeId) {
    return this.nodes.find(n => n.id === nodeId);
  }
  
  /**
   * 获取与节点相关的连接
   */
  getNodeLinks(nodeId) {
    return this.links.filter(link => 
      link.source === nodeId || link.target === nodeId
    );
  }
  
  /**
   * 更新节点过滤状态
   */
  updateNodeVisibility(typesToShow) {
    if (!typesToShow || typesToShow.length === 0) {
      // 显示所有节点
      this.nodes.forEach(node => {
        node.hidden = false;
      });
    } else {
      // 根据类型过滤
      this.nodes.forEach(node => {
        node.hidden = !typesToShow.includes(node.nodeType);
      });
    }
    
    // 更新连接可见性
    this.links.forEach(link => {
      const sourceNode = this.nodes.find(n => n.id === link.source);
      const targetNode = this.nodes.find(n => n.id === link.target);
      
      if (sourceNode && targetNode) {
        link.hidden = sourceNode.hidden || targetNode.hidden;
      }
    });
    
    // 通知视图更新
    this.eventBus.emit('visibility-updated', this.nodes, this.links);
    return this;
  }

  /**
   * 重置所有节点状态
   */
  resetAllNodes() {
    this.nodes.forEach(node => {
      node.currentPhase = 0;
      node.status = 'pending';
      node.progress = 0;
      node.itemStyle = {
        color: '#aaaaaa', // 恢复为灰色
        borderColor: '#888888',
        borderWidth: 1,
        opacity: 0.8
      };
    });
    
    // 重置所有连接为灰色
    this.links.forEach(link => {
      link.color = '#aaaaaa';
    });
    
    // 通知视图更新
    this.eventBus.emit('nodes-reset', this.nodes, this.links);
    this.calculateTotalProgress();
    
    return this;
  }
  
  /**
   * 计算总体进度
   */
  calculateTotalProgress() {
    const pendingCount = this.nodes.filter(n => n.status === 'pending').length;
    const analyzingCount = this.nodes.filter(n => n.status === 'analyzing').length;
    const partialCount = this.nodes.filter(n => n.status === 'partial').length;
    const completedCount = this.nodes.filter(n => n.status === 'completed').length;
    
    // 计算总体进度
    let totalProgress = 0;
    this.nodes.forEach(node => {
      if (node.status === 'completed') {
        totalProgress += 100;
      } else if (node.status === 'partial') {
        // 每个阶段占总进度的一部分
        totalProgress += (node.currentPhase / node.requiredPhases) * 100;
      } else if (node.status === 'analyzing') {
        // 分析中的进度
        const phaseProgress = node.progress / 100;
        const currentPhaseContribution = phaseProgress / node.requiredPhases;
        const previousPhasesContribution = (node.currentPhase / node.requiredPhases);
        totalProgress += previousPhasesContribution * 100 + currentPhaseContribution * 100;
      }
    });
    
    totalProgress = Math.round(totalProgress / this.nodes.length);
    
    // 通知统计信息更新
    this.eventBus.emit('stats-updated', {
      pending: pendingCount,
      analyzing: analyzingCount,
      partial: partialCount,
      completed: completedCount,
      totalProgress: totalProgress
    });
    
    return totalProgress;
  }
  
  /**
   * 获取待分析的节点
   */
  getPendingNodes() {
    return this.nodes.filter(node => node.status === 'pending' && !node.hidden);
  }
  
  /**
   * 获取部分分析的节点
   */
  getPartialNodes() {
    return this.nodes.filter(node => node.status === 'partial' && !node.hidden);
  }
}