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
    // 创建可视化实例
    this._createVisualizer(this.currentVisualizerType);
    
    // 初始化UI组件
    this.controls.initialize();
    this.filters.initialize();
    this.statistics.initialize();
    
    // 加载节点类型配置
    this.eventBus.emit('node-types-loaded', getNodeTypeConfig());
    
    // 生成数据
    this.dataModel.generateData();
    
    console.log('应用初始化完成');
    
    return this;
  }
  
  /**
   * 创建可视化实例
   * @private
   */
  _createVisualizer(type) {
    // 销毁现有可视化实例
    if (this.visualizer) {
      this.visualizer.destroy();
    }
    
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
    
    // 初始化进度元素
    this.visualizer.initProgressElements();
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
      if (this.visualizer) {
        this.visualizer.resetView();
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
  window.app = new App().initialize();
});