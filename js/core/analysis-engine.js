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
      
      // 性能优化参数 - 适应大量节点
      this.batchSize = 10; // 每批处理的节点数量
      this.batchDelay = 50; // 批处理间隔时间(ms)
      this.updateInterval = 200; // UI更新间隔(ms)
      this.lastUpdateTime = 0;
      this.pendingUpdates = new Set(); // 待更新节点ID集合
      
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
      this.pendingUpdates.clear();
      
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
      
      // 启动批量更新处理器
      this._startBatchUpdateProcessor();
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
      
      // 强制再次更新统计数据
      setTimeout(() => {
        console.log("分析停止后强制更新统计数据");
        
        // 确保任何部分完成但所有阶段已完成的节点标记为completed
        this.dataModel.nodes.forEach(node => {
          if (node.currentPhase >= node.requiredPhases && node.status !== 'completed') {
            node.status = 'completed';
            this.pendingUpdates.add(node.id);
            console.log(`节点 ${node.id} (${node.nodeType}): 强制设置为completed状态`);
          }
        });
        
        // 最后一次处理待更新节点
        if (this.pendingUpdates.size > 0) {
          const updates = Array.from(this.pendingUpdates);
          this.pendingUpdates.clear();
          
          updates.forEach(nodeId => {
            const node = this.dataModel.getNode(nodeId);
            if (node) {
              this.eventBus.emit('node-status-updated', nodeId, node.status, node.progress, node.currentPhase);
            }
          });
        }
        
        // 更新统计数据
        this.dataModel._updateStats();
        
        // 分析结束后，执行额外的完整连线更新
        setTimeout(() => {
          console.log("分析完成后，执行全局连线颜色更新");
          this.eventBus.emit('update-all-links');
        }, 500);
      }, 100);
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
        try {
          while (running) {
            // 获取下一个要分析的节点
            const node = this._getNextNode();
            
            if (!node) {
              // 无可分析节点，线程休眠
              await this._sleep(100);
              continue;
            }
            
            // 设置节点为分析中状态
            node.status = 'analyzing';
            this.pendingUpdates.add(node.id);
            
            // 模拟分析过程
            await this._analyzeNode(node);
            
            // 如果节点需要更多阶段分析
            if (node.currentPhase < node.requiredPhases) {
              // 设置为部分完成状态
              node.status = 'partial';
            } else {
              // 设置为完全完成状态
              node.status = 'completed';
            }
            
            // 添加到更新列表
            this.pendingUpdates.add(node.id);
          }
        } catch (error) {
          console.error(`分析线程 ${threadId} 出错:`, error);
        }
      };
      
      return {
        id: threadId,
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
     * 启动批量更新处理器
     * @private
     */
    _startBatchUpdateProcessor() {
      const processUpdates = () => {
        if (!this.running) return;
        
        const now = Date.now();
        
        // 如果距上次更新的时间超过了更新间隔，执行批量更新
        if (now - this.lastUpdateTime >= this.updateInterval && this.pendingUpdates.size > 0) {
          const updates = Array.from(this.pendingUpdates);
          this.pendingUpdates.clear();
          
          console.log(`批量更新 ${updates.length} 个节点状态`);
          
          updates.forEach(nodeId => {
            const node = this.dataModel.getNode(nodeId);
            if (node) {
              console.log(`更新节点 ${nodeId} (${node.nodeType}): status=${node.status}, progress=${node.progress}, currentPhase=${node.currentPhase}, requiredPhases=${node.requiredPhases}`);
              
              // 显式检查节点是否完成全部分析
              if (node.currentPhase >= node.requiredPhases && node.status !== 'completed') {
                node.status = 'completed';
                console.log(`节点 ${nodeId} (${node.nodeType}) 已完成所有阶段，强制设置为completed状态`);
              }
              
              // 通知UI更新节点状态
              this.eventBus.emit('node-status-updated', nodeId, node.status, node.progress, node.currentPhase);
            }
          });
          
          // 每次批量更新后，强制更新统计信息
          this.dataModel._updateStats();
          
          this.lastUpdateTime = now;
        }
        
        // 继续调度下一次更新
        requestAnimationFrame(processUpdates);
      };
      
      // 启动更新处理循环
      requestAnimationFrame(processUpdates);
    }
    
    /**
     * 分析节点
     * @private
     */
    _analyzeNode(node) {
      return new Promise(resolve => {
        const complexity = node.complexity;
        const analysisTime = this._getAnalysisTimeForComplexity(complexity);
        const updateInterval = analysisTime / 10; // 更新10次进度
        let progress = 0;
        
        const updateProgress = () => {
          progress += 10;
          node.progress = progress;
          
          // 添加到更新列表
          this.pendingUpdates.add(node.id);
          
          if (progress >= 100) {
            // 增加当前阶段
            node.currentPhase++;
            
            // 显式记录完成状态
            if (node.currentPhase >= node.requiredPhases) {
              node.status = 'completed';
              console.log(`节点 ${node.id} (${node.name}) 完全分析完成，设置为completed状态`);
            } else {
              node.status = 'partial';
              console.log(`节点 ${node.id} (${node.name}) 完成阶段 ${node.currentPhase}/${node.requiredPhases}`);
            }
            
            resolve();
          } else {
            setTimeout(updateProgress, updateInterval);
          }
        };
        
        setTimeout(updateProgress, updateInterval);
      });
    }
    
    /**
     * 根据复杂度获取分析时间
     * @private
     */
    _getAnalysisTimeForComplexity(complexity) {
      // 为大量节点优化分析时间
      switch (complexity) {
        case 'high':
          return 1000; // 1秒
        case 'medium':
          return 700;  // 0.7秒
        case 'low':
          return 400;  // 0.4秒
        default:
          return 500;  // 默认0.5秒
      }
    }
    
    /**
     * 休眠
     * @private
     */
    _sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * 获取下一个要分析的节点
     * @private
     */
    _getNextNode() {
      // 优先处理优先级队列中的节点
      if (this.priorityQueue.length > 0) {
        return this.priorityQueue.shift();
      }
      
      // 处理常规节点
      const pendingNodes = this.dataModel.nodes.filter(node => node.status === 'pending');
      
      // progressive模式下没有pending节点时，也要继续分析partial节点
      if (pendingNodes.length === 0) {
        if (this.analysisMode === 'progressive') {
          const partialNodes = this.dataModel.nodes.filter(node => 
            node.status === 'partial' && node.currentPhase < node.requiredPhases
          );
          if (partialNodes.length > 0) {
            // 按当前阶段升序，让节点依次完成下一阶段
            partialNodes.sort((a, b) => a.currentPhase - b.currentPhase);
            return partialNodes[0];
          }
        }
        
        // 原有完整分析模式 / 其他逻辑
        if (this.analysisMode === 'complete') {
          const partialNodes = this.dataModel.nodes.filter(node => 
            node.status === 'partial' && node.currentPhase < node.requiredPhases
          );
          if (partialNodes.length > 0) {
            // 随机选择一个部分完成的节点
            const randomIndex = Math.floor(Math.random() * partialNodes.length);
            return partialNodes[randomIndex];
          }
        }
        
        return null;
      }
      
      // 随机选择一个待分析节点
      const randomIndex = Math.floor(Math.random() * pendingNodes.length);
      return pendingNodes[randomIndex];
    }
    
    /**
     * 检查分析是否正在运行
     */
    isAnalysisRunning() {
      return this.running;
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