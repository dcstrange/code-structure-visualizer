/**
 * 将颜色解析为RGB组件
 * @param {string} color 十六进制颜色字符串
 * @returns {Object} RGB对象 {r, g, b}
 */
function parseColor(color) {
    const hex = color.replace('#', '');
    return {
      r: parseInt(hex.substring(0, 2), 16),
      g: parseInt(hex.substring(2, 4), 16),
      b: parseInt(hex.substring(4, 6), 16)
    };
  }
  
  /**
   * 将数值转换为十六进制颜色组件
   * @param {number} n 颜色分量值
   * @returns {string} 十六进制颜色组件
   */
  function toHex(n) {
    return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  }
  
  /**
   * 混合两种颜色
   * @param {string} color1 第一种颜色（十六进制）
   * @param {string} color2 第二种颜色（十六进制）
   * @param {number} ratio 混合比例（0-1）
   * @returns {string} 混合后的颜色（十六进制）
   */
  export function mixColors(color1, color2, ratio) {
    const c1 = parseColor(color1);
    const c2 = parseColor(color2);
    
    // 混合颜色
    const r = c1.r + (c2.r - c1.r) * ratio;
    const g = c1.g + (c2.g - c1.g) * ratio;
    const b = c1.b + (c2.b - c1.b) * ratio;
    
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  
  /**
   * 亮化颜色
   * @param {string} color 输入颜色（十六进制）
   * @param {number} amount 亮化量（0-1）
   * @returns {string} 亮化后的颜色（十六进制）
   */
  export function lightenColor(color, amount) {
    const c = parseColor(color);
    
    const r = c.r + (255 - c.r) * amount;
    const g = c.g + (255 - c.g) * amount;
    const b = c.b + (255 - c.b) * amount;
    
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  
  /**
   * 暗化颜色
   * @param {string} color 输入颜色（十六进制）
   * @param {number} amount 暗化量（0-1）
   * @returns {string} 暗化后的颜色（十六进制）
   */
  export function darkenColor(color, amount) {
    const c = parseColor(color);
    
    const r = c.r * (1 - amount);
    const g = c.g * (1 - amount);
    const b = c.b * (1 - amount);
    
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  
  /**
   * 获取对比色
   * @param {string} color 输入颜色（十六进制）
   * @returns {string} 对比色（黑色或白色）
   */
  export function getContrastColor(color) {
    const c = parseColor(color);
    
    // 计算亮度（基于人眼对不同颜色的感知）
    const luminance = (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
    
    // 亮度高于0.5返回黑色，否则返回白色
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }
  
  /**
   * 创建颜色渐变数组
   * @param {string} startColor 起始颜色（十六进制）
   * @param {string} endColor 结束颜色（十六进制）
   * @param {number} steps 步骤数量
   * @returns {Array} 颜色数组
   */
  export function createColorGradient(startColor, endColor, steps) {
    const result = [];
    
    for (let i = 0; i < steps; i++) {
      const ratio = i / (steps - 1);
      result.push(mixColors(startColor, endColor, ratio));
    }
    
    return result;
  }