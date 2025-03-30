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
      
      // 加载节点类型配置
      this.eventBus.emit('node-types-loaded', getNodeTypeConfig());
      console.log("节点类型配置已加载");
      
      // 延迟创建可视化实例，确保DOM和依赖已加载
      setTimeout(() => {
        try {
          this._createVisualizer(this.currentVisualizerType);
          console.log("可视化实例已创建");
          
          // 初始化UI组件
          this.controls.initialize();
          this.filters.initialize();
          this.statistics.initialize();
          console.log("UI组件已初始化");
          
          // 生成数据
          this.dataModel.generateData();
          console.log("数据已生成:", this.dataModel.nodes.length, "个节点");
          
          // 如果可视化已就绪，更新数据
          if (this.visualizer && this.visualizer.chart) {
            this.visualizer.updateNodes(this.dataModel.nodes);
            this.visualizer.updateLinks(this.dataModel.links);
          }
        } catch (e) {
          console.error("应用初始化期间出错:", e);
        }
      }, 100); // 短暂延迟确保DOM已完全加载
      
      console.log("初始化流程已启动");
    } catch (error) {
      console.error("应用初始化失败:", error);
    }
    
    return this;
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
    // 监听开始分析请求
    this.eventBus.on('start-analysis-requested', (threadCount, mode) => {
      this.analysisEngine.startAnalysis(threadCount);
    });
    
    // 监听停止分析请求
    this.eventBus.on('stop-analysis-requested', () => {
      this.analysisEngine.stopAnalysis();
    });
    
    // 监听继续分析请求
    this.eventBus.on('continue-analysis-requested', (threadCount) => {
      this.analysisEngine.continueAnalysis(threadCount);
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
    
    // 监听过滤变更
    this.eventBus.on('filter-changed', (typesToShow) => {
      this.dataModel.updateNodeVisibility(typesToShow);
    });
    
    // 监听可视化类型变更
    this.eventBus.on('visualizer-type-changed', (type) => {
      if (type !== this.currentVisualizerType) {
        this._createVisualizer(type);
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