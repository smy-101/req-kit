import { describe, test, expect, beforeEach } from 'bun:test';
import { toggleTheme } from '../../src/public/js/components/theme-switcher.js';

/**
 * 测试主题切换逻辑（localStorage 持久化 + data-theme 切换）
 */

describe('主题切换逻辑', () => {
  let storage: { [key: string]: string };
  let docElement: { getAttribute: (k: string) => string | null; setAttribute: (k: string, v: string) => void };

  beforeEach(() => {
    storage = {};
    docElement = {
      getAttribute: (_k: string) => storage['data-theme'] || null,
      setAttribute: (k: string, v: string) => { storage[k] = v; },
    };
  });

  test('默认使用深色主题', () => {
    expect(docElement.getAttribute('data-theme')).toBeNull();
    const theme = docElement.getAttribute('data-theme') || 'dark';
    expect(theme).toBe('dark');
  });

  test('切换到浅色主题后保存到 localStorage 并更新 data-theme', () => {
    const current = docElement.getAttribute('data-theme') || 'dark';
    const next = toggleTheme(current);
    docElement.setAttribute('data-theme', next);
    storage['theme'] = next;

    expect(next).toBe('light');
    expect(storage['theme']).toBe('light');
    expect(docElement.getAttribute('data-theme')).toBe('light');
  });

  test('从浅色切换回深色', () => {
    docElement.setAttribute('data-theme', 'light');
    storage['theme'] = 'light';

    const current = docElement.getAttribute('data-theme') || 'dark';
    const next = toggleTheme(current);
    docElement.setAttribute('data-theme', next);
    storage['theme'] = next;

    expect(next).toBe('dark');
    expect(storage['theme']).toBe('dark');
    expect(docElement.getAttribute('data-theme')).toBe('dark');
  });

  test('页面刷新后保持浅色主题偏好（从 localStorage 恢复）', () => {
    // 模拟用户选择浅色
    storage['theme'] = 'light';

    // 模拟 index.html 内联脚本的恢复逻辑
    const saved = storage['theme'];
    if (saved) docElement.setAttribute('data-theme', saved);

    expect(docElement.getAttribute('data-theme')).toBe('light');
  });

  test('无偏好记录时默认深色，不设置 data-theme', () => {
    // 模拟 index.html 内联脚本：if(t) setAttribute
    const saved = storage['theme'];
    if (saved) docElement.setAttribute('data-theme', saved);

    expect(saved).toBeUndefined();
    expect(docElement.getAttribute('data-theme')).toBeNull();
  });

  test('多次切换最终状态正确', () => {
    let current = docElement.getAttribute('data-theme') || 'dark';
    let next = toggleTheme(current);
    docElement.setAttribute('data-theme', next);
    expect(next).toBe('light');

    current = docElement.getAttribute('data-theme') || 'dark';
    next = toggleTheme(current);
    docElement.setAttribute('data-theme', next);
    expect(next).toBe('dark');

    current = docElement.getAttribute('data-theme') || 'dark';
    next = toggleTheme(current);
    docElement.setAttribute('data-theme', next);
    expect(next).toBe('light');
  });
});
