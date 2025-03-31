import { mixColors } from '../utils/color-utils.js';
import { getNodeTypeConfig } from '../utils/node-types.js';

/**
 * 通用数据模型 - 管理节点和连接数据
 */
export class DataModel {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.nodes = [];
    this.links = [];
    
    // 获取基础节点类型配置
    const baseConfig = getNodeTypeConfig();
    
    // 扩展节点类型配置，添加布局属性
    this.nodeTypeConfig = {};
    
    // 为每种类型添加类型分组布局
    Object.entries(baseConfig).forEach(([type, config]) => {
      this.nodeTypeConfig[type] = {
        ...config,
        layout: 'typeGrouped' // 使用类型分组布局提高聚类效果
      };
    });
    
    this.complexityConfig = {
      'high': { phases: 3, phaseNames: ['基础结构', '逻辑分析', '深度检查'] },
      'medium': { phases: 2, phaseNames: ['基础结构', '逻辑分析'] },
      'low': { phases: 1, phaseNames: ['基础检查'] }
    };
    
    // 统计数据
    this.stats = {
      totalNodes: 0,
      totalLinks: 0,
      nodeStats: {},
      linkStats: {},
      progress: 0,
      completedNodes: 0
    };
    
    // 初始示例数据
    this.mockData = this._generateMockData();
    
    // 存储代码元素数据 - 扩展为约500个节点
    this.codeElements = {
      'function': [
        // 原有函数列表
        'getData()', 'processResult()', 'validateInput()', 'calculateSum()', 
        'findUserById()', 'updateConfig()', 'handleRequest()', 'parseJSON()', 
        'renderUI()', 'sendNotification()', 'checkPermissions()', 'encryptData()', 
        'connectDatabase()', 'logActivity()', 'fetchResources()',
        // 增加额外的函数
        'convertToString()', 'parseXML()', 'calculateAverage()', 'getMaxValue()', 'getMinValue()',
        'initializeSystem()', 'shutdownSystem()', 'restartService()', 'validateEmail()', 'validatePhone()',
        'formatCurrency()', 'formatDate()', 'calculateTax()', 'generateReport()', 'exportToPDF()',
        'exportToExcel()', 'importFromCSV()', 'mergeData()', 'splitString()', 'joinArrays()',
        'findDuplicates()', 'removeDuplicates()', 'sortArray()', 'filterResults()', 'mapValues()',
        'reduceArray()', 'flattenObject()', 'deepClone()', 'shallowCopy()', 'getUniqueId()',
        'generateHash()', 'verifyHash()', 'compressData()', 'decompressData()', 'encodeBase64()',
        'decodeBase64()', 'sanitizeInput()', 'escapeHTML()', 'unescapeHTML()', 'truncateText()',
        'capitalizeText()', 'lowercaseText()', 'uppercaseText()', 'camelCaseText()', 'snakeCaseText()',
        'trimWhitespace()', 'padLeft()', 'padRight()', 'replaceAll()', 'countOccurrences()',
        'getRandomNumber()', 'getRandomString()', 'shuffleArray()', 'getElement()', 'createElement()',
        'removeElement()', 'addClass()', 'removeClass()', 'toggleClass()', 'getParentElement()',
        'getChildElements()', 'getSiblingElements()', 'addEventListener()', 'removeEventListener()', 'dispatchEvent()',
        'preventDefaultAction()', 'stopPropagation()', 'getComputedStyle()', 'setStyle()', 'getScrollPosition()',
        'scrollToTop()', 'scrollToElement()', 'fadeIn()', 'fadeOut()', 'slideDown()',
        'slideUp()', 'animateElement()', 'setCookie()', 'getCookie()', 'deleteCookie()',
        'getLocalStorage()', 'setLocalStorage()', 'removeLocalStorage()', 'clearLocalStorage()', 'getSessionStorage()',
        'setSessionStorage()', 'removeSessionStorage()', 'clearSessionStorage()', 'fetchAPI()', 'getJSON()',
        'postJSON()', 'putJSON()', 'deleteJSON()', 'uploadFile()', 'downloadFile()',
        'createWebSocket()', 'closeWebSocket()', 'sendWebSocketMessage()', 'handleWebSocketMessage()', 'handleWebSocketError()'
      ],
      'variable': [
        // 原有变量列表
        'userCount', 'dataCache', 'resultSet', 'configOptions', 
        'errorMessage', 'isActive', 'currentUser', 'pageIndex', 
        'totalItems', 'selectedOption',
        // 增加额外的变量
        'maxRetryCount', 'connectionTimeout', 'bufferSize', 'maxFileSize', 'defaultPageSize',
        'isAuthenticated', 'isAuthorized', 'isLoading', 'isProcessing', 'isValid',
        'hasErrors', 'hasWarnings', 'hasChanges', 'isDirty', 'isClean',
        'username', 'password', 'email', 'phoneNumber', 'address',
        'firstName', 'lastName', 'fullName', 'birthDate', 'gender',
        'country', 'city', 'state', 'zipCode', 'postalCode',
        'language', 'timezone', 'currency', 'taxRate', 'discountRate',
        'totalPrice', 'subTotal', 'shippingCost', 'taxAmount', 'grandTotal',
        'startDate', 'endDate', 'createdAt', 'updatedAt', 'deletedAt',
        'statusCode', 'responseData', 'requestParams', 'headerData', 'bodyData',
        'backgroundColor', 'textColor', 'borderColor', 'fontSize', 'fontFamily',
        'cacheEnabled', 'debugMode', 'testMode', 'productionMode', 'maintenanceMode'
      ],
      'class': [
        // 原有类列表
        'UserManager', 'DataProcessor', 'EventHandler', 'ConfigService', 
        'ApiClient', 'CacheStore', 'Logger',
        // 增加额外的类
        'DatabaseConnector', 'QueryBuilder', 'AuthenticationService', 'AuthorizationService', 'ValidationService',
        'NotificationManager', 'EmailService', 'FileManager', 'ReportGenerator', 'DataExporter',
        'DataImporter', 'CacheManager', 'SessionManager', 'EncryptionService', 'CompressionService',
        'ImageProcessor', 'TemplateEngine', 'FormBuilder', 'WebSocketManager', 'HttpClient',
        'RouterService', 'StorageManager', 'LoggingService', 'ErrorHandler', 'PaymentProcessor',
        'ShippingCalculator', 'TaxCalculator', 'UserProfileService', 'ProductCatalog', 'OrderProcessor'
      ],
      'typedef': [
        // 原有类型定义
        'UserProfile', 'RequestParams', 'ResponseData', 'ErrorCode',
        'ConfigOption', 'ValidationRule', 'DatabaseRecord',
        // 增加额外的类型定义
        'ApiResponse', 'ApiRequest', 'UserCredentials', 'UserPermissions', 'UserSettings',
        'SystemConfig', 'CacheConfig', 'DatabaseConfig', 'LoggingConfig', 'NotificationConfig',
        'FileMetadata', 'ImageMetadata', 'DocumentMetadata', 'AudioMetadata', 'VideoMetadata',
        'GeoLocation', 'AddressInfo', 'ContactInfo', 'PaymentInfo', 'ShippingInfo',
        'ProductInfo', 'OrderInfo', 'InvoiceInfo', 'TaxInfo', 'DiscountInfo',
        'AuthToken', 'RefreshToken', 'SessionData', 'CookieOptions', 'LocalStorageItem',
        'ValidationError', 'SystemError', 'NetworkError', 'DatabaseError', 'FileSystemError'
      ],
      'macro': [
        // 原有宏定义
        'MAX_RETRY_COUNT', 'DEFAULT_TIMEOUT', 'LOG_LEVEL', 'API_VERSION',
        'ENABLE_CACHING', 'DEBUG_MODE',
        // 增加额外的宏定义
        'MAX_FILE_SIZE', 'MAX_UPLOAD_SIZE', 'MAX_DOWNLOAD_SIZE', 'BUFFER_SIZE', 'CHUNK_SIZE',
        'DEFAULT_PAGE_SIZE', 'MAX_PAGE_SIZE', 'DEFAULT_SORT_ORDER', 'DEFAULT_LANGUAGE', 'DEFAULT_TIMEZONE',
        'DEFAULT_CURRENCY', 'DEFAULT_TAX_RATE', 'DEFAULT_DISCOUNT_RATE', 'MINIMUM_PASSWORD_LENGTH', 'PASSWORD_EXPIRY_DAYS',
        'SESSION_TIMEOUT', 'CACHE_TTL', 'CACHE_MAX_SIZE', 'LOG_RETENTION_DAYS', 'TOKEN_EXPIRY_TIME',
        'API_RATE_LIMIT', 'API_THROTTLE_LIMIT', 'DEFAULT_PRECISION', 'DATE_FORMAT', 'TIME_FORMAT'
      ],
      'api': [
        // 原有API列表
        'GET /users', 'POST /auth', 'PUT /profile', 'DELETE /session',
        'GET /products', 'POST /orders',
        // 增加额外的API
        'GET /users/{id}', 'PATCH /users/{id}', 'DELETE /users/{id}', 'GET /users/{id}/profile', 'PUT /users/{id}/profile',
        'GET /auth/status', 'POST /auth/login', 'POST /auth/logout', 'POST /auth/refresh', 'POST /auth/reset-password',
        'GET /products/{id}', 'POST /products', 'PUT /products/{id}', 'PATCH /products/{id}', 'DELETE /products/{id}',
        'GET /orders/{id}', 'POST /orders', 'PUT /orders/{id}', 'PATCH /orders/{id}', 'DELETE /orders/{id}',
        'GET /invoices', 'GET /invoices/{id}', 'POST /invoices', 'PUT /invoices/{id}', 'DELETE /invoices/{id}',
        'GET /reports', 'GET /reports/{id}', 'POST /reports', 'GET /files', 'GET /files/{id}',
        'POST /files', 'DELETE /files/{id}', 'POST /files/upload', 'GET /files/download/{id}', 'POST /notifications'
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
   * 生成模拟数据
   * @private
   * @returns {Object} 模拟数据对象
   */
  _generateMockData() {
    // 返回一个空对象，实际上我们会使用codeElements生成真实数据
    return {
      nodes: [],
      links: []
    };
  }
  
  /**
   * 生成图形数据（节点和连接）
   * @param {number} maxNodeCount 可选参数，指定要生成的最大节点数量
   */
  generateData(maxNodeCount = null) {
    this.generateNodes(maxNodeCount);
    this.generateLinks();
    return this;
  }
  
  /**
   * 生成节点数据
   * @param {number} maxNodeCount 可选参数，指定要生成的最大节点数量
   */
  generateNodes(maxNodeCount = null) {
    let index = 0;
    this.nodes = [];
    
    console.log(`开始生成节点数据${maxNodeCount ? `，最大数量: ${maxNodeCount}` : ''}...`);
    const startTime = performance.now();
    
    // 计算每种类型应该生成的节点数量
    const totalElementCount = Object.values(this.codeElements).reduce((sum, arr) => sum + arr.length, 0);
    const typeRatios = {};
    
    // 计算每种类型的比例
    Object.entries(this.codeElements).forEach(([type, elements]) => {
      typeRatios[type] = elements.length / totalElementCount;
    });
    
    // 为每种类型的代码元素创建节点
    Object.entries(this.codeElements).forEach(([type, elements]) => {
      const typeConfig = this.nodeTypeConfig[type];
      
      // 强制使用低复杂度，只需一个分析阶段
      const complexity = 'low';
      const requiredPhases = 1; // 所有节点都只需要一个阶段
      
      const nodeColor = typeConfig.color;
      const nodeBorderColor = typeConfig.borderColor;
      
      // 如果有指定最大节点数，按比例分配给每种类型
      let elementCount = elements.length;
      if (maxNodeCount) {
        const typeCount = Math.floor(maxNodeCount * typeRatios[type]);
        elementCount = Math.min(elements.length, typeCount);
      }
      
      // 批量处理元素，优化性能
      for (let i = 0; i < elementCount; i++) {
        // 如果到达最大节点数，提前结束
        if (maxNodeCount && this.nodes.length >= maxNodeCount) {
          break;
        }
        
        const name = elements[i];
        
        // 使用布局算法获取坐标
        const position = this.generateNodeCoordinates(type, i, elementCount);
        
        this.nodes.push({
          id: index.toString(),
          name: name,
          nodeType: type,
          complexity: complexity,
          requiredPhases: requiredPhases,
          currentPhase: 0, // 从0开始，表示尚未分析
          symbolSize: 20, // 减小节点大小，提高显示密度
          symbol: this.nodeTypeConfig[type].symbol,
          itemStyle: {
            color: '#aaaaaa', // 初始为灰色
            borderColor: '#888888',
            borderWidth: 1,
            opacity: 0.8
          },
          status: 'pending', // 初始状态：待分析
          progress: 0,       // 初始进度：0
          originColor: nodeColor,
          originBorderColor: nodeBorderColor,
          value: [position.x, position.y], // ECharts坐标
          x: position.x,  // Cytoscape坐标
          y: position.y,
          visible: true   // 默认可见
        });
        
        index++;
      }
    });
    
    console.log(`生成了 ${this.nodes.length} 个节点，用时 ${(performance.now() - startTime).toFixed(2)}ms`);
    return this;
  }
  
  /**
   * 生成连接数据
   */
  generateLinks() {
    const startTime = performance.now();
    this.links = [];
    
    // 优化：预先计算每个类型的节点
    const nodesByType = {};
    Object.keys(this.nodeTypeConfig).forEach(type => {
      nodesByType[type] = this.nodes.filter(node => node.nodeType === type);
    });
    
    // 增强连接规则 - 使更相关的节点类型间有更高概率连接
    const connectionRules = {
      'function': { 
        'variable': 0.3,  // 函数经常使用变量，增加连接概率
        'class': 0.2,     // 函数与类有关联
        'function': 0.15, // 函数相互调用
        'api': 0.15,      // 函数调用API
        'macro': 0.1      // 函数使用宏/常量
      },
      'variable': { 
        'function': 0.25, // 变量在函数中使用
        'class': 0.2,     // 变量作为类的属性
        'variable': 0.1   // 变量之间有关联（新增）
      },
      'class': { 
        'function': 0.3,  // 类包含方法
        'class': 0.2,     // 类继承/实现
        'typedef': 0.15,  // 类使用类型定义
        'variable': 0.1   // 类使用变量
      },
      'typedef': { 
        'class': 0.3,     // 类型定义用于类
        'typedef': 0.15,  // 类型定义互相引用
        'function': 0.15, // 类型定义用于函数
        'variable': 0.1   // 类型定义用于变量（新增）
      },
      'macro': { 
        'function': 0.25, // 宏用于函数
        'variable': 0.2,  // 宏定义变量值
        'macro': 0.15     // 宏之间互相引用（新增）
      },
      'api': { 
        'function': 0.3,  // API被函数调用
        'class': 0.2,     // API被类使用
        'api': 0.1        // API之间互相关联（新增）
      }
    };
    
    // 限制每个节点的连接数范围（用最小值和最大值）
    const connectionLimits = {
      'function': { min: 1, max: 4 },  // 函数至少1个，最多4个连接
      'variable': { min: 1, max: 3 },  // 变量至少1个，最多3个连接
      'class': { min: 2, max: 6 },     // 类至少2个，最多6个连接
      'typedef': { min: 1, max: 4 },   // 类型定义至少1个，最多4个连接
      'macro': { min: 1, max: 3 },     // 宏至少1个，最多3个连接
      'api': { min: 1, max: 4 }        // API至少1个，最多4个连接
    };
    
    // 统计每个节点已创建的连接数
    const nodeConnectionCount = {};
    this.nodes.forEach(node => {
      nodeConnectionCount[node.id] = 0;
    });
    
    // 第一阶段：确保每个节点至少有最小数量的连接
    this.nodes.forEach(source => {
      const sourceType = source.nodeType;
      const minConnections = connectionLimits[sourceType].min;
      
      // 如果节点已经有足够连接，跳过
      if (nodeConnectionCount[source.id] >= minConnections) {
        return;
      }
      
      // 获取该节点可能连接的目标类型及其权重
      const targetTypeWeights = connectionRules[sourceType];
      if (!targetTypeWeights) return;
      
      // 根据权重选择目标类型
      const targetTypes = Object.entries(targetTypeWeights)
        .sort((a, b) => b[1] - a[1]) // 按权重降序
        .map(entry => entry[0]);
      
      // 尝试连接到每种目标类型
      for (const targetType of targetTypes) {
        // 如果已经达到最小连接数，则退出
        if (nodeConnectionCount[source.id] >= minConnections) {
          break;
        }
        
        const potentialTargets = nodesByType[targetType];
        if (!potentialTargets || potentialTargets.length === 0) {
          continue;
        }
        
        // 打乱目标节点，以获得更自然的连接
        const shuffledTargets = [...potentialTargets].sort(() => 0.5 - Math.random());
        
        // 尝试连接
        for (const target of shuffledTargets) {
          // 不连接自身
          if (source.id === target.id) {
            continue;
          }
          
          // 如果目标节点已达到最大连接数，跳过
          if (nodeConnectionCount[target.id] >= connectionLimits[target.nodeType].max) {
            continue;
          }
          
          // 创建连接
          this._createLink(source, target);
          
          // 更新连接计数
          nodeConnectionCount[source.id]++;
          nodeConnectionCount[target.id]++;
          
          // 如果已经达到最小连接数，则退出
          if (nodeConnectionCount[source.id] >= minConnections) {
            break;
          }
        }
      }
    });
    
    // 第二阶段：在保证最小连接的基础上，添加一些随机连接，但不超过最大限制
    this.nodes.forEach(source => {
      const sourceType = source.nodeType;
      const maxConnections = connectionLimits[sourceType].max;
      
      // 如果节点已达最大连接数，跳过
      if (nodeConnectionCount[source.id] >= maxConnections) {
        return;
      }
      
      // 获取该节点可能连接的目标类型及其权重
      const targetTypeWeights = connectionRules[sourceType];
      if (!targetTypeWeights) return;
      
      // 在保证最小连接的基础上，随机添加一些额外连接
      Object.entries(targetTypeWeights).forEach(([targetType, probability]) => {
        // 如果节点已达最大连接数，跳过
        if (nodeConnectionCount[source.id] >= maxConnections) {
          return;
        }
        
        const potentialTargets = nodesByType[targetType];
        if (!potentialTargets || potentialTargets.length === 0) {
          return;
        }
        
        // 随机选择一些目标，但数量受限
        const maxExtraConnections = Math.min(
          maxConnections - nodeConnectionCount[source.id],
          Math.ceil(potentialTargets.length * probability * 0.1) // 限制连接数量
        );
        
        // 不要尝试创建太多额外连接
        if (maxExtraConnections <= 0) {
          return;
        }
        
        const shuffledTargets = [...potentialTargets].sort(() => 0.5 - Math.random());
        let extraConnectionsCreated = 0;
        
        for (const target of shuffledTargets) {
          // 如果已创建足够的额外连接，退出
          if (extraConnectionsCreated >= maxExtraConnections) {
            break;
          }
          
          // 不连接自身，不重复连接已连接的节点
          if (source.id === target.id || this._linkExists(source.id, target.id)) {
            continue;
          }
          
          // 如果目标节点已达最大连接数，跳过
          if (nodeConnectionCount[target.id] >= connectionLimits[target.nodeType].max) {
            continue;
          }
          
          // 根据概率决定是否创建连接
          if (Math.random() < probability) {
            this._createLink(source, target);
            
            // 更新连接计数
            nodeConnectionCount[source.id]++;
            nodeConnectionCount[target.id]++;
            extraConnectionsCreated++;
          }
          
          // 如果已创建足够的额外连接，退出
          if (extraConnectionsCreated >= maxExtraConnections) {
            break;
          }
        }
      });
    });
    
    console.log(`生成了 ${this.links.length} 个连接，用时 ${(performance.now() - startTime).toFixed(2)}ms`);
    
    // 通知节点和连接数据更新
    this.eventBus.emit('nodes-updated', this.nodes);
    this.eventBus.emit('links-updated', this.links);
    
    // 更新统计
    this._updateStats();
    
    return this;
  }
  
  /**
   * 检查连接是否已存在
   * @private
   */
  _linkExists(sourceId, targetId) {
    return this.links.some(link => 
      (link.source === sourceId && link.target === targetId) || 
      (link.source === targetId && link.target === sourceId)
    );
  }
  
  /**
   * 创建连接
   * @private
   */
  _createLink(source, target) {
    // 获取连接样式颜色 - 使用目标节点类型的颜色
    const targetNodeColor = this.nodeTypeConfig[target.nodeType].color;
    
    this.links.push({
      source: source.id,
      target: target.id,
      sourceType: source.nodeType,
      targetType: target.nodeType,
      value: Math.random() * 2 + 1, // 连接强度/宽度
      originalColor: targetNodeColor, // 保存原始颜色，用于状态变化后恢复
      lineStyle: {
      color: '#aaaaaa', // 初始为灰色
      width: 1,
        curveness: Math.random() * 0.3, // 随机曲率
        opacity: 0.6
      },
      visible: true // 默认可见
    });
  }
  
  /**
   * 更新统计信息
   * @private
   */
  _updateStats() {
    // 计算各类节点数量
    const stats = {
      total: this.nodes.length,
      links: this.links.length,
      pending: 0,
      analyzing: 0,
      partial: 0, 
      completed: 0,
      totalProgress: 0
    };
    
    // 统计各个状态的节点数量
    this.nodes.forEach(node => {
      if (node.status === 'pending') stats.pending++;
      else if (node.status === 'analyzing') stats.analyzing++;
      else if (node.status === 'partial') stats.partial++;
      else if (node.status === 'completed') stats.completed++;
    });
    
    // 简化进度计算 - 只考虑已完成节点和分析中节点
    let totalProgress = 0;
    
    // 已完成的节点贡献100%进度
    totalProgress += stats.completed * 100;
    
    // 分析中的节点贡献它们当前的进度
    this.nodes.forEach(node => {
      if (node.status === 'analyzing') {
        totalProgress += node.progress || 0;
      }
    });
    
    // 计算平均进度
    stats.totalProgress = this.nodes.length > 0 ? 
      Math.floor(totalProgress / this.nodes.length) : 0;
    
    // 确保进度不超过100%
    stats.totalProgress = Math.min(stats.totalProgress, 100);
    
    console.log(`_updateStats: 待分析=${stats.pending}, 分析中=${stats.analyzing}, 部分完成=${stats.partial}, 已完成=${stats.completed}, 总进度=${stats.totalProgress}%`);
    
    // 发送统计更新事件
    this.eventBus.emit('stats-updated', stats);
    
    return stats;
  }

  /**
   * 生成节点坐标
   * @private
   */
  generateNodeCoordinates(type, index, totalCount) {
    const config = this.nodeTypeConfig[type];
    const region = config.region;
    const layout = config.layout || 'clustered'; // 默认改为聚类布局
    
    // 为大量节点优化布局计算
    if (layout === 'grid') {
      // 计算网格布局参数
      const gridSize = Math.ceil(Math.sqrt(totalCount));
      const cellWidth = region.w / gridSize;
      const cellHeight = region.h / gridSize;
      
      // 计算当前索引在网格中的行和列
      const row = Math.floor(index / gridSize);
      const col = index % gridSize;
      
      // 在单元格内添加少量随机偏移，避免节点完全重叠
      const jitterX = (Math.random() - 0.5) * (cellWidth * 0.5);
      const jitterY = (Math.random() - 0.5) * (cellHeight * 0.5);
      
      return {
        x: region.x + col * cellWidth + cellWidth / 2 + jitterX,
        y: region.y + row * cellHeight + cellHeight / 2 + jitterY
      };
    } else if (layout === 'circular') {
      // 圆形布局
      const radius = Math.min(region.w, region.h) / 2;
      const centerX = region.x + region.w / 2;
      const centerY = region.y + region.h / 2;
      const angleStep = (2 * Math.PI) / totalCount;
      const angle = index * angleStep;
      
      return {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    } else if (layout === 'clustered') {
      // 每个类型节点形成初始聚类，以更好地支持力导向布局
      const numClusters = 5; // 每种类型的节点分成几个子聚类
      const clusterIndex = index % numClusters; // 当前节点属于哪个聚类
      
      // 计算该类型节点的中心位置
      const centerX = region.x + region.w / 2;
      const centerY = region.y + region.h / 2;
      
      // 每个聚类的中心点偏移
      const clusterOffsets = [
        { x: -region.w * 0.2, y: -region.h * 0.2 }, // 左上
        { x: region.w * 0.2, y: -region.h * 0.2 },  // 右上
        { x: 0, y: 0 },                            // 中心
        { x: -region.w * 0.2, y: region.h * 0.2 },  // 左下
        { x: region.w * 0.2, y: region.h * 0.2 }    // 右下
      ];
      
      // 获取当前聚类的中心点
      const clusterCenter = {
        x: centerX + clusterOffsets[clusterIndex].x,
        y: centerY + clusterOffsets[clusterIndex].y
      };
      
      // 在聚类中心周围随机分布，但保持聚集
      const clusterRadius = Math.min(region.w, region.h) * 0.15;
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * clusterRadius;
      
      return {
        x: clusterCenter.x + distance * Math.cos(angle),
        y: clusterCenter.y + distance * Math.sin(angle)
      };
    } else if (layout === 'typeGrouped') {
      // 将同类型节点初始化在相邻区域，形成类型聚类
      // 确定类型对应的区域中心
      const typeIndexMap = {
        'function': 0,
        'variable': 1,
        'class': 2,
        'typedef': 3,
        'macro': 4,
        'api': 5
      };
      
      const typeIndex = typeIndexMap[type] || 0;
      const typesCount = Object.keys(typeIndexMap).length;
      
      // 计算六边形布局的中心点
    const centerX = region.x + region.w / 2;
    const centerY = region.y + region.h / 2;
    
      // 每个类型的区域中心
      const typeRadius = Math.min(region.w, region.h) * 0.3;
      const typeAngle = (typeIndex / typesCount) * 2 * Math.PI;
      const typeCenter = {
        x: centerX + typeRadius * Math.cos(typeAngle),
        y: centerY + typeRadius * Math.sin(typeAngle)
      };
      
      // 在类型中心周围随机分布节点
      const nodeSpread = Math.min(region.w, region.h) * 0.1;
      const randomAngle = Math.random() * 2 * Math.PI;
      const randomDistance = Math.random() * nodeSpread;
        
    return {
        x: typeCenter.x + randomDistance * Math.cos(randomAngle),
        y: typeCenter.y + randomDistance * Math.sin(randomAngle)
      };
    } else {
      // 默认随机位置，但限制在区域内
      return {
        x: region.x + Math.random() * region.w,
        y: region.y + Math.random() * region.h
      };
    }
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
    // 直接计算各状态的节点数量
    const pendingCount = this.nodes.filter(n => n.status === 'pending').length;
    const analyzingCount = this.nodes.filter(n => n.status === 'analyzing').length;
    const partialCount = this.nodes.filter(n => n.status === 'partial').length;
    const completedCount = this.nodes.filter(n => n.status === 'completed').length;
    
    // 简化进度计算 - 适用于单阶段节点
    let totalProgress = 0;
    
    // 已完成的节点贡献100%进度
    totalProgress += completedCount * 100;
    
    // 分析中节点按当前进度计算贡献
    this.nodes.forEach(node => {
      if (node.status === 'analyzing') {
        totalProgress += node.progress || 0;
      }
    });
    
    // 计算平均进度
    totalProgress = this.nodes.length > 0 ? 
      Math.round(totalProgress / this.nodes.length) : 0;
    
    // 确保进度不超过100%
    totalProgress = Math.min(totalProgress, 100);
    
    console.log(`统计更新: 待分析=${pendingCount}, 分析中=${analyzingCount}, 部分完成=${partialCount}, 已完成=${completedCount}, 总进度=${totalProgress}%`);
    
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