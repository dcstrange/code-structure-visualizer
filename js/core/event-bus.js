/**
 * 事件总线 - 用于组件间解耦通信
 */
export class EventBus {
    constructor() {
      this.listeners = {};
    }
    
    /**
     * 添加事件监听器
     * @param {string} event 事件名称
     * @param {function} callback 回调函数
     * @returns {EventBus} 事件总线实例
     */
    on(event, callback) {
      if (!this.listeners[event]) {
        this.listeners[event] = [];
      }
      this.listeners[event].push(callback);
      return this;
    }
    
    /**
     * 移除事件监听器
     * @param {string} event 事件名称
     * @param {function} callback 特定回调函数，如果不提供则移除所有
     * @returns {EventBus} 事件总线实例
     */
    off(event, callback) {
      if (!this.listeners[event]) return this;
      
      if (callback) {
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
      } else {
        delete this.listeners[event];
      }
      return this;
    }
    
    /**
     * 触发事件
     * @param {string} event 事件名称
     * @param {...any} args 事件参数
     * @returns {EventBus} 事件总线实例
     */
    emit(event, ...args) {
      if (this.listeners[event]) {
        this.listeners[event].forEach(callback => callback(...args));
      }
      return this;
    }
    
    /**
     * 仅触发一次的事件监听
     * @param {string} event 事件名称
     * @param {function} callback 回调函数
     * @returns {EventBus} 事件总线实例
     */
    once(event, callback) {
      const onceCallback = (...args) => {
        callback(...args);
        this.off(event, onceCallback);
      };
      return this.on(event, onceCallback);
    }
  }