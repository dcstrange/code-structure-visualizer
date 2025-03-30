/**
 * 分析引擎 - 处理代码节点分析逻辑
 */
export class AnalysisEngine {
    constructor(dataModel, eventBus) {
      this.dataModel = dataModel;
      this.eventBus = eventBus;
      this.running = false;
      this.threadPool = [];
      this.priorityQueue = [];
      this.analysisMode = 'progressive'; // 'progressive' or 'complete'
      
      // 绑定事件监听
      this.eventBus.on('analysis-mode-changed', (mode) => {
        this.analysisMode = mode;
      });
    }
    
    /**
     * 启动分析进程
     * @param {number} threadCount 线程数量
     */
    startAnalysis(threadCount = 3) {
      if (this.running) return;
      
      this.running = true;
      this.threadPool = [];
      this.priorityQueue = [];
      
      // 重置所有节点状态
      this.dataModel.resetAllNodes();
      
      // 创建并启动分析线程
      for (let i = 0; i < threadCount; i++) {
        const thread = this._createAnalysisThread(i);
        this.threadPool.push(thread);
        thread.start();
      }
      
      // 通知UI分析已开始
      this.eventBus.emit('analysis-started', threadCount);
    }
    
    /**
     * 停止分析进程
     */
    stopAnalysis() {
      if (!this.running) return;
      
      this.running = false;
      
      // 停止所有线程
      this.threadPool.forEach(thread => thread.stop());
      this.threadPool = [];
      
      // 通知UI分析已停止
      this.eventBus.emit('analysis-stopped');
    }
    
    /**
     * 继续深入分析
     * @param {number} threadCount 线程数量
     */
    continueAnalysis(threadCount = 3) {
      if (this.running) return;
      
      this.running = true;
      this.threadPool = [];
      
      // 创建并启动分析线程
      for (let i = 0; i < threadCount; i++) {
        const thread = this._createAnalysisThread(i);
        this.threadPool.push(thread);
        thread.start();
      }
      
      // 通知UI深入分析已开始
      this.eventBus.emit('deep-analysis-started', threadCount);
    }
    
    /**
     * 添加优先分析节点
     * @param {string} nodeId 节点ID
     */
    prioritizeNode(nodeId) {
      const node = this.dataModel.getNode(nodeId);
      if (node && (node.status === 'pending' || node.status === 'partial')) {
        this.priorityQueue.push(node);
        this.eventBus.emit('node-prioritized', nodeId);
      }
    }
    
    /**
     * 创建分析线程
     * @private
     */
    _createAnalysisThread(threadId) {
      let running = true;
      
      const threadFunction = async () => {
        console.log(`线程 ${threadId} 已启动`);
        
        while (running && this.running) {
          // 获取下一个要分析的节点
          let nextNode = null;
          
          if (this.priorityQueue.length > 0) {
            nextNode = this.priorityQueue.shift();
          } else {
            nextNode = this._getNextNodeToAnalyze();
          }
          
          if (!nextNode) {
            // 没有更多节点需要分析
            await new Promise(resolve => setTimeout(resolve, 100));
            continue;
          }
          
          // 分析节点
          await this._analyzeNode(nextNode);
        }
      };
      
      return {
        start: () => {
          running = true;
          threadFunction();
        },
        stop: () => {
          running = false;
        }
      };
    }
    
    /**
     * 获取下一个要分析的节点
     * @private
     */
    _getNextNodeToAnalyze() {
      const pendingNodes = this.dataModel.getPendingNodes();
      const partialNodes = this.dataModel.getPartialNodes();
      
      if (this.analysisMode === 'progressive') {
        // 递进式：先分析所有节点的第一阶段，再进行后续阶段
        if (pendingNodes.length > 0) {
          return pendingNodes[Math.floor(Math.random() * pendingNodes.length)];
        } else if (partialNodes.length > 0) {
          // 按当前阶段排序，优先分析阶段较低的节点
          partialNodes.sort((a, b) => a.currentPhase - b.currentPhase);
          return partialNodes[0];
        }
      } else {
        // 完整分析：优先完成一个节点的所有阶段
        if (partialNodes.length > 0) {
          return partialNodes[Math.floor(Math.random() * partialNodes.length)];
        } else if (pendingNodes.length > 0) {
          return pendingNodes[Math.floor(Math.random() * pendingNodes.length)];
        }
      }
      
      return null;
    }
    
    /**
     * 分析单个节点
     * @private
     */
    async _analyzeNode(node) {
      const currentPhase = node.currentPhase;
      const nextPhase = currentPhase + 1;
      const totalPhases = node.requiredPhases;
      
      if (nextPhase > totalPhases) {
        console.log(`节点 ${node.name} 已完成所有阶段`);
        return;
      }
      
      // 设置为分析中状态
      this.dataModel.updateNodeStatus(node.id, 'analyzing', 0, currentPhase);
      
      // 分析时间基于节点类型和阶段
      const baseTime = {
        'function': 100,
        'variable': 50,
        'class': 150,
        'typedef': 75,
        'macro': 40,
        'api': 80
      };
      
      // 后续阶段通常更复杂
      const phaseMultiplier = nextPhase === 1 ? 1 : nextPhase === 2 ? 1.5 : 2;
      
      // 模拟分析过程
      const analysisDuration = baseTime[node.nodeType] * phaseMultiplier + Math.random() * 50;
      const updateInterval = 10;
      const steps = analysisDuration / updateInterval;
      
      for (let i = 1; i <= steps; i++) {
        if (!this.running) {
          // 分析被中断
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, updateInterval));
        
        const progress = Math.min(100, Math.round((i / steps) * 100));
        this.dataModel.updateNodeStatus(node.id, 'analyzing', progress, currentPhase);
      }
      
      // 如果分析没有被中断，则标记为部分完成或完全完成
      if (this.running) {
        if (nextPhase === totalPhases) {
          // 最后一个阶段，标记为完成
          this.dataModel.updateNodeStatus(node.id, 'completed', 100, nextPhase);
        } else {
          // 还有后续阶段，标记为部分完成
          this.dataModel.updateNodeStatus(node.id, 'partial', 100, nextPhase);
        }
      }
    }
    
    /**
     * 检查分析是否完成
     */
    isAnalysisComplete() {
      const pendingCount = this.dataModel.nodes.filter(n => n.status === 'pending').length;
      const analyzingCount = this.dataModel.nodes.filter(n => n.status === 'analyzing').length;
      const partialCount = this.dataModel.nodes.filter(n => n.status === 'partial').length;
      
      return pendingCount === 0 && analyzingCount === 0 && partialCount === 0;
    }
    
    /**
     * 检查是否需要深入分析
     */
    needsDeepAnalysis() {
      const pendingCount = this.dataModel.nodes.filter(n => n.status === 'pending').length;
      const analyzingCount = this.dataModel.nodes.filter(n => n.status === 'analyzing').length;
      const partialCount = this.dataModel.nodes.filter(n => n.status === 'partial').length;
      
      return pendingCount === 0 && analyzingCount === 0 && partialCount > 0;
    }
  }