/**
 * 获取节点类型配置
 * @returns {Object} 节点类型配置
 */
export function getNodeTypeConfig() {
    return {
      'function': {
        symbol: 'circle',
        color: '#5470c6',
        borderColor: 'rgba(84, 112, 198, 0.7)',
        name: '函数',
        complexity: 'high',
        region: { x: 100, y: 150, w: 200, h: 300 }, // 放置在左侧
        layout: 'grid',
        count: 15
      },
      'variable': {
        symbol: 'rect',
        color: '#91cc75',
        borderColor: 'rgba(145, 204, 117, 0.7)',
        name: '变量',
        complexity: 'low',
        region: { x: 350, y: 100, w: 200, h: 200 }, // 放置在中部偏上
        layout: 'grid',
        count: 10
      },
      'class': {
        symbol: 'diamond',
        color: '#fac858',
        borderColor: 'rgba(250, 200, 88, 0.7)',
        name: '类',
        complexity: 'high',
        region: { x: 350, y: 350, w: 200, h: 200 }, // 放置在中部偏下
        layout: 'grid',
        count: 7
      },
      'typedef': {
        symbol: 'pin',
        color: '#ee6666',
        borderColor: 'rgba(238, 102, 102, 0.7)',
        name: '类型定义',
        complexity: 'medium',
        region: { x: 600, y: 100, w: 200, h: 200 }, // 放置在右侧偏上
        layout: 'grid',
        count: 7
      },
      'macro': {
        symbol: 'roundRect',
        color: '#73c0de',
        borderColor: 'rgba(115, 192, 222, 0.7)',
        name: '宏/常量',
        complexity: 'low',
        region: { x: 600, y: 350, w: 200, h: 100 }, // 放置在右侧偏下
        layout: 'grid',
        count: 6
      },
      'api': {
        symbol: 'triangle',
        color: '#fc8452',
        borderColor: 'rgba(252, 132, 82, 0.7)',
        name: 'API',
        complexity: 'medium',
        region: { x: 600, y: 500, w: 200, h: 100 }, // 放置在右下角
        layout: 'grid',
        count: 6
      }
    };
  }