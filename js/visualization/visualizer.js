/**
 * 可视化抽象接口 - 定义所有可视化适配器必须实现的方法
 */
export class Visualizer {
    constructor(container, miniMapContainer, eventBus) {
      if (this.constructor === Visualizer) {
        throw new Error("抽象类不能实例化");
      }
      
      this.container = container;
      this.miniMapContainer = miniMapContainer;
      this.eventBus = eventBus;
      this.progressBars = {};
      this.analyzeIcons = {};
      this.phaseIndicators = {};
    }
    
    /**
     * 初始化可视化
     */
    initialize() { 
      throw new Error("必须实现initialize()方法"); 
    }
    
    /**
     * 销毁可视化
     */
    destroy() { 
      throw new Error("必须实现destroy()方法"); 
    }
    
    /**
     * 更新节点数据
     * @param {Array} nodes 节点数据
     */
    updateNodes(nodes) { 
      throw new Error("必须实现updateNodes()方法"); 
    }
    
    /**
     * 更新连接数据
     * @param {Array} links 连接数据
     */
    updateLinks(links) { 
      throw new Error("必须实现updateLinks()方法"); 
    }
    
    /**
     * 更新节点状态
     * @param {string} nodeId 节点ID
     * @param {string} status 状态
     * @param {number} progress 进度
     * @param {number} phase 阶段
     */
    updateNodeStatus(nodeId, status, progress, phase) { 
      throw new Error("必须实现updateNodeStatus()方法"); 
    }
    
    /**
     * 设置缩放级别
     * @param {number} level 缩放级别
     */
    setZoom(level) { 
      throw new Error("必须实现setZoom()方法"); 
    }
    
    /**
     * 重置视图
     */
    resetView() { 
      throw new Error("必须实现resetView()方法"); 
    }
    
    /**
     * 转换为屏幕坐标
     * @param {number} x X坐标
     * @param {number} y Y坐标
     * @returns {Array} 屏幕坐标 [x, y]
     */
    convertToScreenCoordinates(x, y) { 
      throw new Error("必须实现convertToScreenCoordinates()方法"); 
    }
    
    /**
     * 初始化进度显示元素
     */
    initProgressElements() { 
      throw new Error("必须实现initProgressElements()方法"); 
    }
    
    /**
     * 更新DOM元素位置
     */
    updateElementPositions() { 
      throw new Error("必须实现updateElementPositions()方法"); 
    }
    
    /**
     * 应用节点过滤
     * @param {Array} nodes 节点数据
     * @param {Array} links 连接数据
     */
    applyFilter(nodes, links) { 
      throw new Error("必须实现applyFilter()方法"); 
    }
    
    /**
     * 更新小地图
     */
    updateMiniMap() { 
      throw new Error("必须实现updateMiniMap()方法"); 
    }
    
    /**
     * 设置交互启用状态
     * @param {boolean} enabled 是否启用
     */
    setInteractionEnabled(enabled) { 
      throw new Error("必须实现setInteractionEnabled()方法"); 
    }
    
    /**
     * 添加事件监听器
     * @param {string} eventName 事件名称
     * @param {function} callback 回调函数
     */
    on(eventName, callback) { 
      throw new Error("必须实现on()方法"); 
    }
  }