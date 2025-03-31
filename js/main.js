import { EventBus } from './core/event-bus.js';
import { DataModel } from './core/data-model.js';
import { AnalysisEngine } from './core/analysis-engine.js';
import { VisualizerFactory } from './visualization/visualizer-factory.js';
import { Controls } from './ui/controls.js';
import { Filters } from './ui/filters.js';
import { Statistics } from './ui/statistics.js';
import { getNodeTypeConfig } from './utils/node-types.js';

/**
 * 应用主类 - 协调各组件
 */
class App {
  constructor() {
    // 创建事件总线
    this.eventBus = new EventBus();
    
    // DOM元素
    this.container = document.getElementById('container');
    this.miniMapContainer = document.getElementById('mini-map-container');
    
    // 应用状态
    this.currentVisualizerType = 'echarts';
    this.nodeCount = 500; // 默认节点数量
    
    // 组件初始化
    this.dataModel = new DataModel(this.eventBus);
    this.analysisEngine = new AnalysisEngine(this.dataModel, this.eventBus);
    this.controls = new Controls(this.eventBus);
    this.filters = new Filters(this.eventBus);
    this.statistics = new Statistics(this.eventBus);
    
    // 当前可视化实例
    this.visualizer = null;
    
    // 设置事件监听
    this._setupEventListeners();
  }
  
  /**
   * 初始化应用
   */
  initialize() {
    try {
      console.log("开始初始化应用");
      
      // 添加加载提示
      this._showLoadingIndicator(`正在准备${this.nodeCount}个节点的结构图...`);
      
      // 加载节点类型配置
      this.eventBus.emit('node-types-loaded', getNodeTypeConfig());
      console.log("节点类型配置已加载");
      
      // 使用延迟加载和批处理优化初始化流程
      setTimeout(() => {
        try {
          // 第一步：生成数据
          console.time('数据生成');
          this.dataModel.generateData(this.nodeCount);
          console.timeEnd('数据生成');
          console.log(`生成了 ${this.dataModel.nodes.length} 个节点`);
          
          // 更新加载提示
          this._showLoadingIndicator("正在初始化可视化引擎...");
          
          // 第二步：延迟创建可视化实例
          setTimeout(() => {
            try {
              console.time('可视化初始化');
              this._createVisualizer(this.currentVisualizerType);
              console.timeEnd('可视化初始化');
              
              // 确保数据传递给可视化组件
              if (this.visualizer) {
                console.log("正在更新可视化组件数据...");
                this.visualizer.updateNodes(this.dataModel.nodes);
                this.visualizer.updateLinks(this.dataModel.links);
                
                // 在数据更新后重新初始化进度条
                console.log("重新初始化进度显示元素...");
                setTimeout(() => {
                  if (this.visualizer && typeof this.visualizer.initProgressElements === 'function') {
                    this.visualizer.initProgressElements();
                  }
                }, 100);
              }
              
              // 第三步：延迟初始化UI组件
              setTimeout(() => {
                try {
                  console.time('UI初始化');
                  // 初始化UI组件
                  this.controls.initialize();
                  this.filters.initialize();
                  this.statistics.initialize();
                  console.timeEnd('UI初始化');
                  
                  // 隐藏加载提示
                  this._hideLoadingIndicator();
                  
                  // 显示性能提示
                  this._showPerformanceInfo();
                } catch (e) {
                  console.error("UI组件初始化期间出错:", e);
                  this._hideLoadingIndicator();
                }
              }, 100);
            } catch (e) {
              console.error("可视化初始化期间出错:", e);
              this._hideLoadingIndicator();
            }
          }, 50);
        } catch (e) {
          console.error("数据生成期间出错:", e);
          this._hideLoadingIndicator();
        }
      }, 0);
      
      console.log("初始化流程已启动");
    } catch (error) {
      console.error("应用初始化失败:", error);
      this._hideLoadingIndicator();
    }
    
    return this;
  }
  
  /**
   * 显示加载指示器
   * @private
   */
  _showLoadingIndicator(message) {
    // 检查是否已存在加载指示器
    let loadingEl = document.getElementById('loading-indicator');
    
    if (!loadingEl) {
      loadingEl = document.createElement('div');
      loadingEl.id = 'loading-indicator';
      loadingEl.innerHTML = `
        <div class="loading-spinner"></div>
        <div class="loading-message">${message || '加载中...'}</div>
      `;
      loadingEl.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        color: white;
        font-size: 18px;
      `;
      
      // 添加旋转动画
      const style = document.createElement('style');
      style.textContent = `
        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 5px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s ease-in-out infinite;
          margin-bottom: 20px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
      
      document.body.appendChild(loadingEl);
    } else {
      // 更新消息
      const messageEl = loadingEl.querySelector('.loading-message');
      if (messageEl && message) {
        messageEl.textContent = message;
      }
    }
  }
  
  /**
   * 隐藏加载指示器
   * @private
   */
  _hideLoadingIndicator() {
    const loadingEl = document.getElementById('loading-indicator');
    if (loadingEl) {
      loadingEl.style.opacity = '0';
      loadingEl.style.transition = 'opacity 0.5s';
      setTimeout(() => {
        if (loadingEl.parentNode) {
          loadingEl.parentNode.removeChild(loadingEl);
        }
      }, 500);
    }
  }
  
  /**
   * 显示性能信息
   * @private
   */
  _showPerformanceInfo() {
    const infoEl = document.createElement('div');
    infoEl.className = 'performance-info';
    infoEl.innerHTML = `
      <div>节点总数: ${this.dataModel.nodes.length}</div>
      <div>连接总数: ${this.dataModel.links.length}</div>
      <div>可视化引擎: ${this.currentVisualizerType}</div>
    `;
    infoEl.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      background: rgba(0,0,0,0.7);
      color: white;
      padding: 10px;
      border-radius: 5px;
      font-size: 12px;
      z-index: 900;
    `;
    
    document.body.appendChild(infoEl);
    
    // 3秒后隐藏
    setTimeout(() => {
      infoEl.style.opacity = '0';
      infoEl.style.transition = 'opacity 0.5s';
      setTimeout(() => {
        if (infoEl.parentNode) {
          infoEl.parentNode.removeChild(infoEl);
        }
      }, 500);
    }, 3000);
  }

  /**
   * 创建可视化实例
   * @private
   */
  _createVisualizer(type) {
    // 防御性检查
    if (!this.container) {
      console.error("无法创建可视化实例: 容器元素不存在");
      // 尝试重新获取容器
      this.container = document.getElementById('container');
      if (!this.container) {
        console.error("即使重试后仍无法找到容器元素");
        return;
      }
    }
    
    // 销毁现有可视化实例
    if (this.visualizer) {
      try {
        this.visualizer.destroy();
      } catch (e) {
        console.error("销毁现有可视化实例时出错:", e);
      }
    }
    
    try {
      // 创建新的可视化实例
      this.visualizer = VisualizerFactory.create(
        type, 
        this.container, 
        this.miniMapContainer, 
        this.eventBus
      );
      
      // 初始化可视化
      this.visualizer.initialize();
      
      // 更新应用状态
      this.currentVisualizerType = type;
      
      // 安全地初始化进度元素
      if (this.visualizer.chart) {
        this.visualizer.initProgressElements();
      } else {
        console.warn("跳过进度元素初始化，图表实例尚未准备好");
      }
    } catch (error) {
      console.error("创建可视化实例时出错:", error);
    }
  }
  
  /**
   * 设置事件监听器
   * @private
   */
  _setupEventListeners() {
    // 分析事件
    this.eventBus.on('start-analysis-requested', (threadCount, mode) => {
      // 设置分析模式
      this.analysisEngine.analysisMode = mode;
      
      // 如果可视化实例存在，则开始分析
      if (this.visualizer) {
        console.log(`开始分析, 模式=${mode}, 线程数=${threadCount}`);
        this.analysisEngine.startAnalysis(threadCount);
      }
    });
    
    this.eventBus.on('stop-analysis-requested', () => {
      this.analysisEngine.stopAnalysis();
    });
    
    this.eventBus.on('continue-analysis-requested', (threadCount) => {
      this.analysisEngine.continueAnalysis(threadCount);
    });
    
    // 过滤事件
    this.eventBus.on('filter-changed', (types) => {
      if (this.dataModel && this.visualizer) {
        this.dataModel.updateNodeVisibility(types);
        this.visualizer.applyFilter(this.dataModel.nodes, this.dataModel.links);
      }
    });
    
    // 可视化相关事件
    this.eventBus.on('visualizer-type-changed', (type) => {
      if (type !== this.currentVisualizerType) {
        this._createVisualizer(type);
      }
    });
    
    // 节点数量变更事件
    this.eventBus.on('node-count-changed', (count) => {
      if (count !== this.nodeCount) {
        this.nodeCount = count;
        console.log(`节点数量已变更为 ${count}`);
        
        // 显示加载提示
        this._showLoadingIndicator(`正在重新生成${count}个节点的结构图...`);
        
        // 使用setTimeout避免UI冻结
        setTimeout(() => {
          // 停止当前分析（如果有）
          if (this.analysisEngine.isAnalysisRunning()) {
            this.analysisEngine.stopAnalysis();
          }
          
          // 重新生成数据
          this.dataModel.generateData(count);
          
          // 更新可视化
          if (this.visualizer) {
            this.visualizer.updateNodes(this.dataModel.nodes);
            this.visualizer.updateLinks(this.dataModel.links);
            
            // 重新初始化进度条
            setTimeout(() => {
              if (typeof this.visualizer.initProgressElements === 'function') {
                this.visualizer.initProgressElements();
              }
              this._hideLoadingIndicator();
            }, 100);
          } else {
            this._hideLoadingIndicator();
          }
        }, 50);
      }
    });
    
    // 监听重置视图请求
    this.eventBus.on('reset-view-requested', () => {
      console.log("收到重置视图请求");
      if (this.visualizer) {
        this.visualizer.resetView();
      } else {
        console.error("无法重置视图: 可视化实例不存在");
      }
    });
    
    // 监听缩放请求
    this.eventBus.on('zoom-in-requested', () => {
      if (this.visualizer) {
        this.visualizer.setZoom(this.visualizer.currentZoom * 1.2);
      }
    });
    
    this.eventBus.on('zoom-out-requested', () => {
      if (this.visualizer) {
        this.visualizer.setZoom(this.visualizer.currentZoom / 1.2);
      }
    });
    
    this.eventBus.on('zoom-fit-requested', () => {
      if (this.visualizer) {
        this.visualizer.resetView();
      }
    });
    
    // 监听节点点击事件
    this.eventBus.on('node-clicked', (nodeId) => {
      if (this.analysisEngine.isAnalysisRunning()) return;
      
      const node = this.dataModel.getNode(nodeId);
      if (node && (node.status === 'pending' || node.status === 'partial')) {
        this.analysisEngine.prioritizeNode(nodeId);
      }
    });
    
    // 监听节点状态更新
    this.eventBus.on('node-status-updated', (nodeId, status, progress, phase) => {
      if (this.visualizer) {
        this.visualizer.updateNodeStatus(nodeId, status, progress, phase);
      }
    });
    
    // 监听节点和连接数据更新
    this.eventBus.on('nodes-updated', (nodes) => {
      if (this.visualizer) {
        this.visualizer.updateNodes(nodes);
      }
    });
    
    this.eventBus.on('links-updated', (links) => {
      if (this.visualizer) {
        this.visualizer.updateLinks(links);
      }
    });
    
    // 监听节点重置
    this.eventBus.on('nodes-reset', () => {
      if (this.visualizer) {
        this.visualizer.initProgressElements();
      }
    });
    
    // 监听分析状态变化
    this.eventBus.on('analysis-started', () => {
      if (this.visualizer) {
        this.visualizer.setInteractionEnabled(false);
      }
    });
    
    this.eventBus.on('analysis-stopped', () => {
      if (this.visualizer) {
        this.visualizer.setInteractionEnabled(true);
      }
    });
    
    // 监听可见性更新
    this.eventBus.on('visibility-updated', (nodes, links) => {
      if (this.visualizer) {
        this.visualizer.applyFilter(nodes, links);
      }
    });
  }
}

// 应用启动
document.addEventListener('DOMContentLoaded', () => {
  try {
    console.log("DOM内容加载完成，开始初始化应用");
    
    // 检查关键DOM元素
    const container = document.getElementById('container');
    const miniMapContainer = document.getElementById('mini-map-container');
    
    console.log("主容器:", container);
    console.log("小地图容器:", miniMapContainer);
    
    // 验证库加载
    console.log("ECharts库:", typeof echarts);
    console.log("Cytoscape库:", typeof cytoscape);
    
    // 初始化应用
    window.app = new App().initialize();
    
  } catch (error) {
    console.error("应用初始化失败:", error);
    document.body.innerHTML = `
      <div style="color:red; padding:20px;">
        <h2>初始化错误</h2>
        <pre>${error.stack}</pre>
      </div>
    `;
  }
});