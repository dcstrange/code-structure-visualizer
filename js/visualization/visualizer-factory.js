import { EChartsAdapter } from './echarts-adapter.js';
import { CytoscapeAdapter } from './cytoscape-adapter.js';

/**
 * 可视化工厂 - 创建不同类型的可视化适配器
 */
export class VisualizerFactory {
  /**
   * 创建可视化实例
   * @param {string} type 可视化类型，支持 'echarts' 或 'cytoscape'
   * @param {HTMLElement} container 主容器元素
   * @param {HTMLElement} miniMapContainer 小地图容器元素
   * @param {EventBus} eventBus 事件总线实例
   * @returns {Visualizer} 可视化实例
   */
  static create(type, container, miniMapContainer, eventBus) {
    switch(type.toLowerCase()) {
      case 'echarts':
        return new EChartsAdapter(container, miniMapContainer, eventBus);
      case 'cytoscape':
        return new CytoscapeAdapter(container, miniMapContainer, eventBus);
      default:
        throw new Error(`不支持的可视化库类型: ${type}`);
    }
  }
}