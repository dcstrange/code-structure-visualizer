/**
 * 事件总线实现，用于模块间通信
 */
export class EventEmitter {
  constructor() {
    this.events = {};
  }

  /**
   * 注册事件监听器
   * @param {string} eventName 事件名称
   * @param {Function} listener 监听器函数
   */
  on(eventName, listener) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(listener);
    return this;
  }

  /**
   * 移除事件监听器
   * @param {string} eventName 事件名称
   * @param {Function} listener 监听器函数
   */
  off(eventName, listener) {
    if (!this.events[eventName]) return this;
    
    this.events[eventName] = this.events[eventName].filter(
      l => l !== listener
    );
    return this;
  }

  /**
   * 触发事件
   * @param {string} eventName 事件名称
   * @param {...any} args 传递给监听器的参数
   */
  emit(eventName, ...args) {
    if (!this.events[eventName]) return false;
    
    this.events[eventName].forEach(listener => {
      listener(...args);
    });
    return true;
  }

  /**
   * 注册只执行一次的事件监听器
   * @param {string} eventName 事件名称
   * @param {Function} listener 监听器函数
   */
  once(eventName, listener) {
    const onceWrapper = (...args) => {
      listener(...args);
      this.off(eventName, onceWrapper);
    };
    return this.on(eventName, onceWrapper);
  }

  /**
   * 移除所有事件监听器
   * @param {string} [eventName] 事件名称，如不提供则移除所有事件的所有监听器
   */
  removeAllListeners(eventName) {
    if (eventName) {
      delete this.events[eventName];
    } else {
      this.events = {};
    }
    return this;
  }
} 