import { describe, test, expect, beforeEach } from 'bun:test';
import { matchShortcut } from '../../src/public/js/utils/shortcuts.js';
import { store } from '../../src/public/js/store.js';

/**
 * 测试键盘快捷键逻辑（纯函数测试，不依赖 DOM）
 */

describe('键盘快捷键逻辑', () => {

  test('Ctrl+S 匹配保存', () => {
    expect(matchShortcut({ key: 's', ctrlKey: true, metaKey: false, shiftKey: false })).toBe('save');
  });

  test('Cmd+S 匹配保存', () => {
    expect(matchShortcut({ key: 's', ctrlKey: false, metaKey: true, shiftKey: false })).toBe('save');
  });

  test('Ctrl+Tab 匹配下一个标签', () => {
    expect(matchShortcut({ key: 'Tab', ctrlKey: true, metaKey: false, shiftKey: false }, 'DIV')).toBe('next-tab');
  });

  test('Cmd+Tab 匹配下一个标签', () => {
    expect(matchShortcut({ key: 'Tab', ctrlKey: false, metaKey: true, shiftKey: false }, 'DIV')).toBe('next-tab');
  });

  test('Ctrl+Shift+Tab 匹配上一个标签', () => {
    expect(matchShortcut({ key: 'Tab', ctrlKey: true, metaKey: false, shiftKey: true }, 'DIV')).toBe('prev-tab');
  });

  test('Cmd+Shift+Tab 匹配上一个标签', () => {
    expect(matchShortcut({ key: 'Tab', ctrlKey: false, metaKey: true, shiftKey: true }, 'DIV')).toBe('prev-tab');
  });

  test('Ctrl+Tab 在 input 中不触发', () => {
    expect(matchShortcut({ key: 'Tab', ctrlKey: true, metaKey: false, shiftKey: false }, 'INPUT')).toBeNull();
  });

  test('Ctrl+Tab 在 textarea 中不触发', () => {
    expect(matchShortcut({ key: 'Tab', ctrlKey: true, metaKey: false, shiftKey: false }, 'TEXTAREA')).toBeNull();
  });

  test('Ctrl+Tab 在 select 中不触发', () => {
    expect(matchShortcut({ key: 'Tab', ctrlKey: true, metaKey: false, shiftKey: false }, 'SELECT')).toBeNull();
  });

  test('Ctrl+Tab 在 contenteditable 元素中不触发', () => {
    expect(matchShortcut({ key: 'Tab', ctrlKey: true, metaKey: false, shiftKey: false }, 'DIV', true)).toBeNull();
  });

  test('Ctrl+Shift+N 匹配新建请求', () => {
    expect(matchShortcut({ key: 'N', ctrlKey: true, metaKey: false, shiftKey: true })).toBe('new-request');
  });

  test('Cmd+Shift+N 匹配新建请求', () => {
    expect(matchShortcut({ key: 'N', ctrlKey: false, metaKey: true, shiftKey: true })).toBe('new-request');
  });

  test('普通 N 键不匹配', () => {
    expect(matchShortcut({ key: 'n', ctrlKey: false, metaKey: false, shiftKey: false })).toBeNull();
  });

  test('Ctrl+N (无 Shift) 不匹配新建请求', () => {
    expect(matchShortcut({ key: 'N', ctrlKey: true, metaKey: false, shiftKey: false })).toBeNull();
  });

  test('Ctrl+Enter 匹配发送', () => {
    expect(matchShortcut({ key: 'Enter', ctrlKey: true, metaKey: false, shiftKey: false })).toBe('send');
  });

  test('Cmd+Enter 匹配发送', () => {
    expect(matchShortcut({ key: 'Enter', ctrlKey: false, metaKey: true, shiftKey: false })).toBe('send');
  });

  test('Escape 匹配关闭模态框', () => {
    expect(matchShortcut({ key: 'Escape', ctrlKey: false, metaKey: false, shiftKey: false })).toBe('close-modal');
  });

  test('Ctrl+W 匹配关闭标签', () => {
    expect(matchShortcut({ key: 'w', ctrlKey: true, metaKey: false, shiftKey: false })).toBe('close-tab');
  });

  test('Cmd+W 匹配关闭标签', () => {
    expect(matchShortcut({ key: 'w', ctrlKey: false, metaKey: true, shiftKey: false })).toBe('close-tab');
  });

  test('Ctrl+T 匹配新建标签', () => {
    expect(matchShortcut({ key: 't', ctrlKey: true, metaKey: false, shiftKey: false })).toBe('new-tab');
  });

  test('Cmd+T 匹配新建标签', () => {
    expect(matchShortcut({ key: 't', ctrlKey: false, metaKey: true, shiftKey: false })).toBe('new-tab');
  });
});

describe('标签循环切换逻辑', () => {
  beforeEach(() => {
    // 重置 store 状态，创建 3 个标签
    store.state.tabs = [
      { id: 1, method: 'GET', url: '', headers: [], params: [], body: '', bodyType: 'json', authType: 'none', authConfig: {}, preRequestScript: '', postResponseScript: '', scriptTests: null, response: null, multipartParts: [], binaryFile: null, requestId: null, collectionId: null, historyId: null, dirty: false, options: { timeout: 30000, followRedirects: true } },
      { id: 2, method: 'GET', url: '', headers: [], params: [], body: '', bodyType: 'json', authType: 'none', authConfig: {}, preRequestScript: '', postResponseScript: '', scriptTests: null, response: null, multipartParts: [], binaryFile: null, requestId: null, collectionId: null, historyId: null, dirty: false, options: { timeout: 30000, followRedirects: true } },
      { id: 3, method: 'GET', url: '', headers: [], params: [], body: '', bodyType: 'json', authType: 'none', authConfig: {}, preRequestScript: '', postResponseScript: '', scriptTests: null, response: null, multipartParts: [], binaryFile: null, requestId: null, collectionId: null, historyId: null, dirty: false, options: { timeout: 30000, followRedirects: true } },
    ];
    store.state.activeTabId = 1;
  });

  test('向后循环切换', () => {
    store.switchToNextTab();
    expect(store.state.activeTabId).toBe(2);
    store.switchToNextTab();
    expect(store.state.activeTabId).toBe(3);
    store.switchToNextTab();
    expect(store.state.activeTabId).toBe(1); // 循环回第一个
  });

  test('向前循环切换', () => {
    store.switchToPrevTab();
    expect(store.state.activeTabId).toBe(3); // 循环到最后一个
    store.switchToPrevTab();
    expect(store.state.activeTabId).toBe(2);
    store.switchToPrevTab();
    expect(store.state.activeTabId).toBe(1);
  });

  test('只有一个标签时不切换', () => {
    store.state.tabs = [store.state.tabs[0]];
    store.state.activeTabId = 1;
    store.switchToNextTab();
    expect(store.state.activeTabId).toBe(1);
    store.switchToPrevTab();
    expect(store.state.activeTabId).toBe(1);
  });

  test('两个标签时正常切换', () => {
    store.state.tabs = [store.state.tabs[0], store.state.tabs[1]];
    store.state.activeTabId = 1;
    store.switchToNextTab();
    expect(store.state.activeTabId).toBe(2);
    store.switchToNextTab();
    expect(store.state.activeTabId).toBe(1);
    store.switchToPrevTab();
    expect(store.state.activeTabId).toBe(2);
    store.switchToPrevTab();
    expect(store.state.activeTabId).toBe(1);
  });
});
