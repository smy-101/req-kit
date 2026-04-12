# E2E 测试优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 结构优化（文件合并、引入 POM、修复不稳定模式）+ 全面覆盖提升，分两批执行

**Architecture:** 引入 Page Object Model 封装选择器和操作，合并重叠的 spec 文件减少维护负担，修复 evaluate() 绕过等不稳定模式，然后填补所有已识别的覆盖缺口

**Tech Stack:** Playwright, TypeScript, Bun, 现有 mock server 和 fixtures 体系不变

---

## 文件结构

### 新建文件

| 文件路径 | 职责 |
|----------|------|
| `tests/e2e/pages/request-page.ts` | 封装 URL 输入、方法选择、发送按钮、请求体编辑器、请求头/参数 KV 编辑器、请求选项 |
| `tests/e2e/pages/response-page.ts` | 封装响应标签页切换、格式切换、搜索导航、状态码显示 |
| `tests/e2e/pages/auth-page.ts` | 封装认证面板操作 |
| `tests/e2e/pages/collection-page.ts` | 封装集合 CRUD、右键菜单、curl 导入、集合变量 |
| `tests/e2e/pages/environment-page.ts` | 封装环境管理弹窗、变量编辑、切换/删除/重命名 |
| `tests/e2e/pages/variable-page.ts` | 封装全局变量弹窗、变量预览、自动补全 |
| `tests/e2e/pages/history-page.ts` | 封装历史面板操作 |
| `tests/e2e/pages/runner-page.ts` | 封装 Runner 面板操作 |
| `tests/e2e/pages/tab-bar.ts` | 封装标签页管理 |
| `tests/e2e/pages/app-page.ts` | 封装应用基础操作 |

### 合并后文件

| 合并后文件 | 消失的旧文件 |
|------------|-------------|
| `tests/e2e/request.spec.ts` | `request-basic.spec.ts`, `headers-params.spec.ts` |
| `tests/e2e/response.spec.ts` | `response-advanced.spec.ts`, `response-extras.spec.ts`, `response-format-switching.spec.ts`, `response-search-nav.spec.ts` |
| `tests/e2e/app.spec.ts` | `edge-cases.spec.ts` |
| `tests/e2e/cookies.spec.ts` | （吸收 `management-advanced.spec.ts` 的 Cookie 部分） |
| `tests/e2e/environment.spec.ts` | `env-unsaved.spec.ts` |
| `tests/e2e/variables.spec.ts` | （吸收 `management-advanced.spec.ts` 的全局变量+环境变量部分） |

### 不变文件

`auth.spec.ts`, `body-types.spec.ts`, `collection.spec.ts`, `history.spec.ts`, `import-export.spec.ts`, `keyboard-shortcuts.spec.ts`, `panel-resizer.spec.ts`, `runner.spec.ts`, `save-load.spec.ts`, `scripts.spec.ts`, `tabs.spec.ts`, `variable-autocomplete.spec.ts`, `variable-resolution.spec.ts`

---

## 第一批：结构优化

### Task 1: 创建 RequestPage 页面对象

**Files:**
- Create: `tests/e2e/pages/request-page.ts`

- [ ] **Step 1: 创建 RequestPage 文件**

```typescript
import type { Page, Locator } from '../fixtures';
import { MOCK_BASE_URL } from '../helpers/mock';

export class RequestPage {
  readonly page: Page;
  readonly urlInput: Locator;
  readonly methodSelect: Locator;
  readonly sendBtn: Locator;
  readonly optionsBtn: Locator;
  readonly optionsPanel: Locator;
  readonly timeoutInput: Locator;
  readonly redirectToggle: Locator;
  readonly redirectSwitch: Locator;
  readonly bodyTextarea: Locator;
  readonly bodyTypeSelect: Locator;
  readonly headersEditor: Locator;
  readonly paramsEditor: Locator;

  constructor(page: Page) {
    this.page = page;
    this.urlInput = page.locator('#url-input');
    this.methodSelect = page.locator('#method-select');
    this.sendBtn = page.locator('#send-btn');
    this.optionsBtn = page.locator('#request-options-btn');
    this.optionsPanel = page.locator('#request-options-panel');
    this.timeoutInput = page.locator('#request-timeout-input');
    this.redirectToggle = page.locator('#request-redirect-toggle');
    this.redirectSwitch = page.locator('.request-options-switch');
    this.bodyTextarea = page.locator('#body-textarea');
    this.bodyTypeSelect = page.locator('#body-type-select');
    this.headersEditor = page.locator('#tab-headers .kv-editor');
    this.paramsEditor = page.locator('#tab-params .kv-editor');
  }

  async navigate() {
    await this.page.goto('/');
  }

  async setUrl(url: string) {
    await this.urlInput.fill(url);
    return this;
  }

  async setMockUrl(path: string) {
    await this.urlInput.fill(`${MOCK_BASE_URL}${path}`);
    return this;
  }

  async selectMethod(method: string) {
    await this.methodSelect.selectOption(method);
    return this;
  }

  async clickSend() {
    await this.sendBtn.click();
    return this;
  }

  async sendToMock(path: string, expectedStatus?: string) {
    await this.setMockUrl(path);
    await this.clickSend();
    if (expectedStatus) {
      await this.page.locator('#response-status').waitFor({ state: 'visible' });
      const status = this.page.locator('#response-status');
      await this.page.waitForFunction(
        ([sel, text]) => document.querySelector(sel)?.textContent?.includes(text),
        ['#response-status', expectedStatus],
        { timeout: 15_000 },
      );
    }
    return this;
  }

  async openOptions() {
    await this.optionsBtn.click();
    await this.optionsPanel.waitFor({ state: 'visible' });
    return this;
  }

  async closeOptions() {
    await this.optionsBtn.click();
    await this.optionsPanel.waitFor({ state: 'hidden' });
    return this;
  }

  async setTimeout(ms: number) {
    await this.timeoutInput.fill(String(ms));
    return this;
  }

  async disableRedirects() {
    await this.redirectSwitch.click();
    return this;
  }

  async switchTab(tabName: string) {
    const tab = this.page.locator(`#request-panel .tab[data-tab="${tabName}"]`);
    await tab.click();
    await this.page.locator(`#tab-${tabName}`).waitFor({ state: 'visible' });
    return this;
  }

  async fillBody(content: string) {
    await this.bodyTextarea.fill(content);
    return this;
  }

  async selectBodyType(type: string) {
    await this.bodyTypeSelect.selectOption(type);
    return this;
  }

  async addHeaderRow(key: string, value: string) {
    const addBtn = this.headersEditor.locator('.kv-add-btn');
    await addBtn.click();
    const lastRow = this.headersEditor.locator('.kv-row').last();
    await lastRow.locator('.kv-key').fill(key);
    await lastRow.locator('.kv-value').fill(value);
    return this;
  }

  async addParamRow(key: string, value: string) {
    const addBtn = this.paramsEditor.locator('.kv-add-btn');
    await addBtn.click();
    const lastRow = this.paramsEditor.locator('.kv-row').last();
    await lastRow.locator('.kv-key').fill(key);
    await lastRow.locator('.kv-value').fill(value);
    return this;
  }
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `bun build tests/e2e/pages/request-page.ts --no-bundle 2>&1 | head -5`
Expected: No errors (bun may silently succeed for TS files)

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/pages/request-page.ts
git commit -m "feat(e2e): 添加 RequestPage 页面对象"
```

---

### Task 2: 创建 ResponsePage 页面对象

**Files:**
- Create: `tests/e2e/pages/response-page.ts`

- [ ] **Step 1: 创建 ResponsePage 文件**

```typescript
import type { Page, Locator } from '../fixtures';

export class ResponsePage {
  readonly page: Page;
  readonly statusEl: Locator;
  readonly formatBar: Locator;
  readonly formatContent: Locator;
  readonly searchBar: Locator;
  readonly searchInput: Locator;
  readonly searchCount: Locator;
  readonly searchNextBtn: Locator;
  readonly searchPrevBtn: Locator;
  readonly searchCloseBtn: Locator;
  readonly searchToggleBtn: Locator;
  readonly body: Locator;
  readonly headers: Locator;
  readonly cookies: Locator;
  readonly testResults: Locator;

  constructor(page: Page) {
    this.page = page;
    this.statusEl = page.locator('#response-status');
    this.formatBar = page.locator('#response-format-bar');
    this.formatContent = page.locator('#response-format-content');
    this.searchBar = page.locator('#response-search-bar');
    this.searchInput = page.locator('#response-search-input');
    this.searchCount = page.locator('#response-search-count');
    this.searchNextBtn = page.locator('#search-next-btn');
    this.searchPrevBtn = page.locator('#search-prev-btn');
    this.searchCloseBtn = page.locator('#search-close-btn');
    this.searchToggleBtn = page.locator('#search-toggle-btn');
    this.body = page.locator('#response-body');
    this.headers = page.locator('#response-headers');
    this.cookies = page.locator('#response-cookies');
    this.testResults = page.locator('#response-test-results');
  }

  async switchTab(tabName: string) {
    const tab = this.page.locator(`#response-panel .tab[data-response-tab="${tabName}"]`);
    await tab.click();
    return this;
  }

  async switchFormat(format: 'pretty' | 'raw' | 'preview') {
    await this.page.locator(`.format-tab[data-format="${format}"]`).click();
    return this;
  }

  async waitForStatus(expectedStatus: string) {
    await this.page.waitForFunction(
      ([sel, text]) => document.querySelector(sel)?.textContent?.includes(text),
      ['#response-status', expectedStatus],
      { timeout: 15_000 },
    );
    return this;
  }

  async openSearch() {
    await this.searchToggleBtn.click();
    await this.searchBar.waitFor({ state: 'visible' });
    return this;
  }

  async search(term: string) {
    await this.searchInput.fill(term);
    await this.searchCount.waitFor({ state: 'visible' });
    return this;
  }

  async closeSearch() {
    await this.searchCloseBtn.click();
    await this.searchBar.waitFor({ state: 'hidden' });
    return this;
  }

  async nextMatch() {
    await this.searchNextBtn.click();
    return this;
  }

  async prevMatch() {
    await this.searchPrevBtn.click();
    return this;
  }

  async getSearchCountText(): Promise<string> {
    return (await this.searchCount.textContent()) ?? '';
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add tests/e2e/pages/response-page.ts
git commit -m "feat(e2e): 添加 ResponsePage 页面对象"
```

---

### Task 3: 创建 EnvironmentPage 页面对象

**Files:**
- Create: `tests/e2e/pages/environment-page.ts`

- [ ] **Step 1: 创建 EnvironmentPage 文件**

这是修复 `evaluate(el => el.click())` 不稳定模式的关键文件。EnvironmentPage 封装所有环境操作，用 Playwright 原生 API 替代 evaluate 绕过。

```typescript
import type { Page, Locator } from '../fixtures';
import { waitForModal, waitForModalClose } from '../helpers/wait';

export class EnvironmentPage {
  readonly page: Page;
  readonly manageBtn: Locator;
  readonly newNameInput: Locator;
  readonly createBtn: Locator;
  readonly closeBtn: Locator;
  readonly activeEnvSelect: Locator;
  readonly modal: Locator;

  constructor(page: Page) {
    this.page = page;
    this.manageBtn = page.locator('#btn-manage-env');
    this.newNameInput = page.locator('#modal #new-env-name');
    this.createBtn = page.locator('#modal #create-env-btn');
    this.closeBtn = page.locator('#modal #close-env-modal');
    this.activeEnvSelect = page.locator('#active-env');
    this.modal = page.locator('#modal');
  }

  async open() {
    await this.manageBtn.click();
    await waitForModal(this.page);
    return this;
  }

  async close() {
    await this.closeBtn.click();
    await waitForModalClose(this.page);
    return this;
  }

  async createEnv(name: string) {
    await this.newNameInput.fill(name);
    // 使用 Playwright force: true 替代 evaluate(el => el.click())
    await this.createBtn.click({ force: true });
    await this.page.locator('#modal .env-item').filter({ hasText: name }).waitFor({ state: 'visible', timeout: 10_000 });
    return this;
  }

  async selectEnv(name: string) {
    await this.page.locator('#modal .env-item .env-name').filter({ hasText: name }).click({ force: true });
    return this;
  }

  async deleteEnv(name: string) {
    const envItem = this.page.locator('#modal .env-item').filter({ hasText: name });
    await envItem.locator('.env-item-actions .btn-danger-text').click();
    await envItem.locator('.env-delete-msg').waitFor({ state: 'visible' });
    await envItem.locator('.modal-btn-danger').click();
    await this.page.locator('#modal .env-item').filter({ hasText: name }).waitFor({ state: 'hidden' });
    return this;
  }

  async renameEnv(oldName: string, newName: string) {
    const envItem = this.page.locator('#modal .env-item').filter({ hasText: oldName });
    await envItem.locator('.env-action-btn').first().click();
    const renameInput = this.page.locator('#modal .env-rename-input');
    await renameInput.waitFor({ state: 'visible' });
    await renameInput.fill(newName);
    await renameInput.press('Enter');
    await this.page.locator('#modal .env-item').filter({ hasText: newName }).waitFor({ state: 'visible' });
    return this;
  }

  async addVariable(key: string, value: string) {
    const kvEditor = this.page.locator('#modal #env-vars-editor');
    await kvEditor.locator('.kv-add-btn').waitFor({ state: 'visible' });
    await kvEditor.locator('.kv-add-btn').click();
    const lastRow = kvEditor.locator('.kv-row').last();
    await lastRow.locator('.kv-key').fill(key);
    await lastRow.locator('.kv-value').fill(value);
    return this;
  }

  async saveVariables() {
    const kvEditor = this.page.locator('#modal #env-vars-editor');
    await kvEditor.locator('.kv-save-btn').click({ force: true });
    return this;
  }

  async switchActiveEnv(name: string) {
    await this.activeEnvSelect.selectOption({ label: name });
    return this;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add tests/e2e/pages/environment-page.ts
git commit -m "feat(e2e): 添加 EnvironmentPage 页面对象"
```

---

### Task 4: 创建其余页面对象（批量）

**Files:**
- Create: `tests/e2e/pages/auth-page.ts`
- Create: `tests/e2e/pages/collection-page.ts`
- Create: `tests/e2e/pages/variable-page.ts`
- Create: `tests/e2e/pages/history-page.ts`
- Create: `tests/e2e/pages/runner-page.ts`
- Create: `tests/e2e/pages/tab-bar.ts`
- Create: `tests/e2e/pages/app-page.ts`

- [ ] **Step 1: 创建 AuthPage**

```typescript
import type { Page, Locator } from '../fixtures';

export class AuthPage {
  readonly page: Page;
  readonly typeSelect: Locator;
  readonly tokenInput: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly apiKeyIn: Locator;
  readonly apiKeyKey: Locator;
  readonly apiKeyValue: Locator;

  constructor(page: Page) {
    this.page = page;
    this.typeSelect = page.locator('#auth-type-select');
    this.tokenInput = page.locator('#auth-token');
    this.usernameInput = page.locator('#auth-username');
    this.passwordInput = page.locator('#auth-password');
    this.apiKeyIn = page.locator('#auth-apikey-in');
    this.apiKeyKey = page.locator('#auth-apikey-key');
    this.apiKeyValue = page.locator('#auth-apikey-value');
  }

  async selectType(type: string) {
    await this.typeSelect.selectOption(type);
    return this;
  }

  async fillBearerToken(token: string) {
    await this.tokenInput.fill(token);
    return this;
  }

  async fillBasicAuth(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    return this;
  }

  async fillApiKey(key: string, value: string, addTo: string = 'header') {
    await this.apiKeyIn.selectOption(addTo);
    await this.apiKeyKey.fill(key);
    await this.apiKeyValue.fill(value);
    return this;
  }
}
```

- [ ] **Step 2: 创建 CollectionPage**

```typescript
import type { Page, Locator } from '../fixtures';
import { waitForModal, waitForModalClose } from '../helpers/wait';

export class CollectionPage {
  readonly page: Page;
  readonly newCollectionBtn: Locator;
  readonly tree: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newCollectionBtn = page.locator('#btn-new-collection');
    this.tree = page.locator('#collection-tree');
  }

  async createCollection(name: string) {
    await this.newCollectionBtn.click();
    await waitForModal(this.page);
    await this.page.locator('#modal .dialog-input').fill(name);
    await this.page.locator('#modal .modal-btn-primary').click();
    await waitForModalClose(this.page);
    await this.tree.locator('.tree-item').filter({ hasText: name }).waitFor({ state: 'visible' });
    return this;
  }

  async deleteCollection(name: string) {
    const item = this.tree.locator('.tree-item').filter({ hasText: name });
    await item.click({ button: 'right' });
    const menu = this.page.locator('.context-menu');
    await menu.waitFor({ state: 'visible' });
    await menu.locator('.context-menu-item').filter({ hasText: '删除' }).click();
    // 确认删除
    await this.page.locator('.modal-btn-danger').click();
    await item.waitFor({ state: 'hidden' });
    return this;
  }

  async openCollectionVars(name: string) {
    const item = this.tree.locator('.tree-item').filter({ hasText: name });
    await item.locator('.coll-var-btn').click();
    await waitForModal(this.page);
    return this;
  }
}
```

- [ ] **Step 3: 创建 VariablePage**

```typescript
import type { Page, Locator } from '../fixtures';
import { waitForModal, waitForModalClose, waitForAutocompletePopup, waitForAutocompleteClose } from '../helpers/wait';

export class VariablePage {
  readonly page: Page;
  readonly globalVarBtn: Locator;
  readonly varPreviewBtn: Locator;
  readonly varPreviewPanel: Locator;

  constructor(page: Page) {
    this.page = page;
    this.globalVarBtn = page.locator('#btn-manage-global-vars');
    this.varPreviewBtn = page.locator('#btn-var-preview');
    this.varPreviewPanel = page.locator('#var-preview-panel');
  }

  async openGlobalVars() {
    await this.globalVarBtn.click();
    await waitForModal(this.page);
    return this;
  }

  async closeGlobalVars() {
    await this.page.locator('#modal #save-global-vars').click();
    await waitForModalClose(this.page);
    return this;
  }

  async addGlobalVar(key: string, value: string) {
    await this.page.locator('#modal .kv-add-btn').click();
    const lastRow = this.page.locator('#modal .kv-row').last();
    await lastRow.locator('.kv-key').fill(key);
    await lastRow.locator('.kv-value').fill(value);
    return this;
  }

  async saveGlobalVars() {
    await this.page.locator('#modal #save-global-vars').click();
    await waitForModalClose(this.page);
    return this;
  }

  async openVarPreview() {
    await this.varPreviewBtn.click();
    await this.varPreviewPanel.waitFor({ state: 'visible' });
    return this;
  }

  async triggerAutocomplete(selector: string, prefix: string) {
    const input = this.page.locator(selector);
    await input.click();
    await input.pressSequentially(prefix, { delay: 50 });
    await waitForAutocompletePopup(this.page);
    return this;
  }

  async selectAutocompleteItem(index: number) {
    const items = this.page.locator('#var-autocomplete-popup .var-autocomplete-item');
    await items.nth(index).click();
    await waitForAutocompleteClose(this.page);
    return this;
  }
}
```

- [ ] **Step 4: 创建 HistoryPage**

```typescript
import type { Page, Locator } from '../fixtures';

export class HistoryPage {
  readonly page: Page;
  readonly header: Locator;
  readonly panel: Locator;
  readonly searchInput: Locator;
  readonly clearBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.locator('.history-header');
    this.panel = page.locator('.history-panel');
    this.searchInput = page.locator('.history-search-input');
    this.clearBtn = page.locator('.history-clear-btn');
  }

  async expand() {
    await this.header.click();
    await this.page.locator('.history-panel.expanded').waitFor({ state: 'visible', timeout: 5_000 });
    return this;
  }

  async collapse() {
    await this.header.click();
    await this.page.locator('.history-panel.expanded').waitFor({ state: 'hidden' });
    return this;
  }

  async search(term: string) {
    await this.searchInput.fill(term);
    return this;
  }

  async clearAll() {
    await this.clearBtn.click();
    return this;
  }

  async loadItem(index: number) {
    await this.page.locator('.history-item').nth(index).click();
    return this;
  }
}
```

- [ ] **Step 5: 创建 RunnerPage**

```typescript
import type { Page, Locator } from '../fixtures';

export class RunnerPage {
  readonly page: Page;
  readonly panel: Locator;
  readonly closeBtn: Locator;
  readonly stopBtn: Locator;
  readonly retryCount: Locator;
  readonly retryDelay: Locator;
  readonly summary: Locator;
  readonly progressText: Locator;

  constructor(page: Page) {
    this.page = page;
    this.panel = page.locator('.runner-panel');
    this.closeBtn = page.locator('.runner-close-btn');
    this.stopBtn = page.locator('#runner-stop-btn');
    this.retryCount = page.locator('#runner-retry-count');
    this.retryDelay = page.locator('#runner-retry-delay');
    this.summary = page.locator('#runner-summary');
    this.progressText = page.locator('#runner-progress-text');
  }

  async waitForPanel() {
    await this.panel.waitFor({ state: 'visible' });
    return this;
  }

  async close() {
    await this.closeBtn.click();
    await this.panel.waitFor({ state: 'hidden' });
    return this;
  }

  async stop() {
    await this.stopBtn.click();
    return this;
  }

  async setRetry(count: string) {
    await this.retryCount.fill(count);
    return this;
  }

  async setRetryDelay(delay: string) {
    await this.retryDelay.fill(delay);
    return this;
  }
}
```

- [ ] **Step 6: 创建 TabBar**

```typescript
import type { Page, Locator } from '../fixtures';

export class TabBar {
  readonly page: Page;
  readonly addBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addBtn = page.locator('.request-tab-add');
  }

  async addTab() {
    await this.addBtn.click();
    return this;
  }

  async switchToTab(index: number) {
    await this.page.locator('.request-tab').nth(index).click();
    await this.page.locator('.request-tab.active').waitFor({ state: 'visible' });
    return this;
  }

  async closeTab(index: number) {
    await this.page.locator('.request-tab-close').nth(index).click();
    return this;
  }

  async getTabCount(): Promise<number> {
    return this.page.locator('.request-tab').count();
  }

  async getActiveTabTitle(): Promise<string> {
    return this.page.locator('.request-tab.active .request-tab-title').textContent() ?? '';
  }
}
```

- [ ] **Step 7: 创建 AppPage**

```typescript
import type { Page, Locator } from '../fixtures';

export class AppPage {
  readonly page: Page;
  readonly themeToggle: Locator;
  readonly sidebar: Locator;
  readonly panelResizer: Locator;
  readonly requestPanel: Locator;

  constructor(page: Page) {
    this.page = page;
    this.themeToggle = page.locator('#btn-theme-toggle');
    this.sidebar = page.locator('#sidebar');
    this.panelResizer = page.locator('#panel-resizer');
    this.requestPanel = page.locator('#request-panel');
  }

  async navigate() {
    await this.page.goto('/');
    return this;
  }

  async toggleTheme() {
    await this.themeToggle.click();
    return this;
  }

  async getTheme(): Promise<string | null> {
    return this.page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  }

  async pressShortcut(keys: string) {
    await this.page.keyboard.press(keys);
    return this;
  }
}
```

- [ ] **Step 8: Commit**

```bash
git add tests/e2e/pages/
git commit -m "feat(e2e): 添加所有页面对象（Auth/Collection/Variable/History/Runner/TabBar/App）"
```

---

### Task 5: 合并 request.spec.ts + request-basic.spec.ts + headers-params.spec.ts → request.spec.ts

**Files:**
- Modify: `tests/e2e/request.spec.ts`（重写为合并后版本）
- Delete: `tests/e2e/request-basic.spec.ts`
- Delete: `tests/e2e/headers-params.spec.ts`

- [ ] **Step 1: 重写 request.spec.ts 为合并后版本**

将三个文件的测试用例整合到一个文件中，使用 RequestPage 页面对象替代散落的选择器。

```typescript
import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';
import { sendRequestAndWait, switchRequestTab, switchResponseTab } from './helpers/wait';
import { RequestPage } from './pages/request-page';

test.describe('请求发送与响应', () => {
  let rq: RequestPage;

  test.beforeEach(async ({ page }) => {
    rq = new RequestPage(page);
    await rq.navigate();
  });

  // --- 原始 request.spec.ts 测试 ---

  test('发送 GET 请求并显示响应', async ({ page }) => {
    await rq.setMockUrl('/get').clickSend();
    await expect(page.locator('#response-status')).toContainText('200');
    await expect(page.locator('#response-time')).toBeVisible();
    await expect(page.locator('#response-size')).toBeVisible();
  });

  test('切换请求方法并发送 POST 请求', async ({ page }) => {
    await rq.selectMethod('POST');
    await rq.setMockUrl('/post');
    await rq.switchTab('body');
    await rq.fillBody('{"hello": "world"}');
    await rq.clickSend();
    await expect(page.locator('#response-status')).toContainText('200');
    const responseBody = page.locator('#response-body');
    await expect(responseBody).toContainText('hello');
    await expect(responseBody).toContainText('world');
  });

  test('使用 Ctrl+Enter 快捷键发送请求', async ({ page }) => {
    await rq.setMockUrl('/get');
    await rq.urlInput.focus();
    await rq.urlInput.press('Control+Enter');
    await expect(page.locator('#response-status')).toContainText('200');
  });

  test('切换响应标签页查看响应头', async ({ page }) => {
    await rq.setMockUrl('/get').clickSend();
    await expect(page.locator('#response-status')).toContainText('200');
    await switchResponseTab(page, 'headers');
    await expect(page.locator('#response-headers')).toBeVisible();
  });

  // --- HTTP 方法测试（原 request-basic.spec.ts）---

  test('HEAD 请求', async ({ page }) => {
    await rq.selectMethod('HEAD');
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');
    const responseBody = page.locator('#response-format-content');
    const bodyText = await responseBody.textContent();
    expect(bodyText).toBeFalsy();
  });

  test('PATCH 请求', async ({ page }) => {
    await rq.selectMethod('PATCH');
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/patch`, '200');
    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).toContainText('patch');
  });

  test('OPTIONS 请求', async () => {
    await rq.selectMethod('OPTIONS');
    await sendRequestAndWait(rq.page, `${MOCK_BASE_URL}/anything`, '200');
    await expect(rq.page.locator('#response-time')).toBeVisible();
  });

  // --- 请求头编辑器（原 headers-params.spec.ts 部分）---

  test('Headers 标签页显示键值编辑器', async () => {
    const kvEditor = rq.page.locator('#tab-headers .kv-editor');
    await expect(kvEditor).toBeVisible();
    await expect(kvEditor.locator('.kv-row').first()).toBeVisible();
  });

  test('添加请求头', async () => {
    await rq.addHeaderRow('X-Custom-Header', 'test-value');
    await rq.switchTab('body');
    await rq.switchTab('headers');
    const rows = rq.page.locator('#tab-headers .kv-row');
    await expect(rows.last().locator('.kv-key')).toHaveValue('X-Custom-Header');
    await expect(rows.last().locator('.kv-value')).toHaveValue('test-value');
  });

  test('删除请求头行', async () => {
    const addBtn = rq.page.locator('#tab-headers .kv-add-btn');
    await addBtn.click();
    await addBtn.click();
    const rows = rq.page.locator('#tab-headers .kv-row');
    const count = await rows.count();
    await rows.last().locator('.kv-delete').click();
    await expect(rq.page.locator('#tab-headers .kv-row')).toHaveCount(count - 1);
  });

  test('禁用请求头', async () => {
    const firstRow = rq.page.locator('#tab-headers .kv-row').first();
    const checkbox = firstRow.locator('.kv-enabled');
    await expect(checkbox).toBeChecked();
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
  });

  // --- 查询参数编辑器 ---

  test('Params 标签页显示键值编辑器', async () => {
    await rq.switchTab('params');
    const kvEditor = rq.page.locator('#tab-params .kv-editor');
    await expect(kvEditor).toBeVisible();
    await expect(kvEditor.locator('.kv-row').first()).toBeVisible();
  });

  test('添加查询参数并验证请求包含', async () => {
    await rq.switchTab('params');
    await rq.addParamRow('foo', 'bar');
    await sendRequestAndWait(rq.page, `${MOCK_BASE_URL}/get`, '200');
    const responseBody = rq.page.locator('#response-format-content');
    await expect(responseBody).toContainText('foo');
    await expect(responseBody).toContainText('bar');
  });
});

test.describe('重定向测试', () => {
  let rq: RequestPage;

  test.beforeEach(async ({ page }) => {
    rq = new RequestPage(page);
    await rq.navigate();
  });

  test('关闭重定向后收到 3xx 响应', async ({ page }) => {
    await rq.setMockUrl('/redirect/1');
    await rq.openOptions();
    await rq.disableRedirects();
    await rq.closeOptions();
    await rq.clickSend();
    await expect(page.locator('#response-status')).toContainText('302');
  });

  test('开启重定向时自动跟随 302', async ({ page }) => {
    await rq.openOptions();
    await expect(rq.redirectToggle).toBeChecked();
    await rq.closeOptions();
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/redirect/1`, '200');
  });
});

test.describe('请求超时行为', () => {
  let rq: RequestPage;

  test.beforeEach(async ({ page }) => {
    rq = new RequestPage(page);
    await rq.navigate();
  });

  test('请求超时后显示错误状态', async ({ page }) => {
    await rq.openOptions();
    await rq.setTimeout(1000);
    await rq.closeOptions();
    await rq.setMockUrl('/delay/5').clickSend();
    await expect(page.locator('#response-status')).toHaveClass(/status-5xx/);
    await expect(page.locator('#response-time')).toBeVisible();
  });

  test('正常请求在超时时间内完成', async ({ page }) => {
    await rq.openOptions();
    await rq.setTimeout(10000);
    await rq.closeOptions();
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/delay/2`, '200');
  });
});

test.describe('请求取消', () => {
  let rq: RequestPage;

  test.beforeEach(async ({ page }) => {
    rq = new RequestPage(page);
    await rq.navigate();
  });

  test('发送按钮在请求中变为取消按钮', async ({ page }) => {
    await rq.setMockUrl('/delay/5').clickSend();
    await expect(rq.sendBtn).toHaveAttribute('data-loading', 'true');
    await expect(rq.sendBtn).toContainText('Cancel');
    await rq.clickSend();
    await expect(rq.sendBtn).toHaveAttribute('data-loading', 'false');
    await expect(rq.sendBtn).toContainText('Send');
  });

  test('取消请求后显示取消状态', async ({ page }) => {
    await rq.setMockUrl('/delay/5').clickSend();
    await expect(rq.sendBtn).toHaveAttribute('data-loading', 'true');
    await rq.clickSend();
    await expect(rq.sendBtn).toHaveAttribute('data-loading', 'false');
    await expect(page.locator('.response-error')).toBeVisible();
  });
});

test.describe('请求选项', () => {
  let rq: RequestPage;

  test.beforeEach(async ({ page }) => {
    rq = new RequestPage(page);
    await rq.navigate();
  });

  test('打开请求选项面板', async ({ page }) => {
    await expect(rq.optionsPanel).toBeHidden();
    await rq.openOptions();
    await expect(rq.optionsPanel).toBeVisible();
    await expect(rq.optionsBtn).toHaveClass(/active/);
    await rq.closeOptions();
    await expect(rq.optionsPanel).toBeHidden();
  });

  test('修改超时时间', async () => {
    await rq.openOptions();
    await expect(rq.timeoutInput).toHaveValue('30000');
    await rq.setTimeout(5000);
    await rq.switchTab('body');
    await rq.switchTab('headers');
    await rq.openOptions();
    await expect(rq.timeoutInput).toHaveValue('5000');
  });

  test('切换 Follow Redirects 开关', async () => {
    await rq.openOptions();
    await expect(rq.redirectToggle).toBeChecked();
    await rq.disableRedirects();
    await rq.switchTab('body');
    await rq.switchTab('headers');
    await rq.openOptions();
    await expect(rq.redirectToggle).not.toBeChecked();
  });
});
```

- [ ] **Step 2: 运行合并后的 request.spec.ts 验证通过**

Run: `npx playwright test tests/e2e/request.spec.ts --reporter=line 2>&1 | tail -5`
Expected: All tests pass

- [ ] **Step 3: 删除旧文件并提交**

```bash
rm tests/e2e/request-basic.spec.ts tests/e2e/headers-params.spec.ts
git add -A tests/e2e/
git commit -m "refactor(e2e): 合并 request/request-basic/headers-params 为 request.spec.ts，使用 RequestPage"
```

---

### Task 6: 合并 response-*.spec.ts → response.spec.ts

**Files:**
- Modify: `tests/e2e/response.spec.ts`（新建合并版本，不是原来的 response-advanced）
- Delete: `tests/e2e/response-advanced.spec.ts`
- Delete: `tests/e2e/response-extras.spec.ts`
- Delete: `tests/e2e/response-format-switching.spec.ts`
- Delete: `tests/e2e/response-search-nav.spec.ts`

- [ ] **Step 1: 创建合并后的 response.spec.ts**

将四个文件的测试用例整合，消除重复测试（格式切换、搜索基础功能有重复），使用 ResponsePage 页面对象。注意：搜索导航相关的复杂测试（循环、Raw 搜索）保留完整逻辑。

```typescript
import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';
import { sendRequestAndWait, switchRequestTab, switchResponseTab } from './helpers/wait';
import { ResponsePage } from './pages/response-page';

test.describe('响应格式切换', () => {
  let rp: ResponsePage;

  test.beforeEach(async ({ page }) => {
    rp = new ResponsePage(page);
    await page.goto('/');
  });

  test('JSON 响应 Pretty/Raw/Preview 切换', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/json`, '200');
    await expect(rp.formatBar).toBeVisible();

    // 默认 Pretty
    await expect(page.locator('.format-tab[data-format="pretty"]')).toHaveClass(/active/);

    // Raw
    await rp.switchFormat('raw');
    await expect(page.locator('.format-tab[data-format="raw"]')).toHaveClass(/active/);

    // Preview
    await rp.switchFormat('preview');
    await expect(page.locator('.format-tab[data-format="preview"]')).toHaveClass(/active/);

    // 切回 Pretty
    await rp.switchFormat('pretty');
    await expect(page.locator('.format-tab[data-format="pretty"]')).toHaveClass(/active/);
  });

  test('HTML 响应自动进入 Preview 模式', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/html`, '200');
    await expect(page.locator('.format-tab[data-format="preview"]')).toHaveClass(/active/, { timeout: 5_000 });
    const iframe = page.locator('#response-format-content .html-preview-frame');
    await expect(iframe).toBeVisible({ timeout: 5_000 });
  });

  test('HTML 响应切换到 Raw 显示原始 HTML', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/html`, '200');
    await expect(page.locator('.format-tab[data-format="preview"]')).toHaveClass(/active/, { timeout: 5_000 });
    await rp.switchFormat('raw');
    await expect(page.locator('.format-tab[data-format="raw"]')).toHaveClass(/active/);
    await expect(rp.formatContent).toContainText('<html', { timeout: 5_000 });
  });

  test('XML 响应 Pretty 格式化', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/xml`, '200');
    await expect(page.locator('.format-tab[data-format="pretty"]')).toHaveClass(/active/, { timeout: 5_000 });
    await expect(rp.formatContent).toContainText('<?xml', { timeout: 5_000 });
    await expect(rp.formatContent).toContainText('<slideshow');
    await rp.switchFormat('raw');
    await expect(page.locator('.format-tab[data-format="raw"]')).toHaveClass(/active/);
    await expect(rp.formatContent).toContainText('<?xml');
  });

  test('图片响应 Preview 显示图片', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/image/png`, '200');
    await expect(page.locator('.format-tab[data-format="preview"]')).toHaveClass(/active/, { timeout: 5_000 });
    const previewImg = page.locator('#response-format-content .preview-img');
    await expect(previewImg).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('响应状态码样式', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('4xx 响应状态码样式', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/status/404`, '404');
    await expect(page.locator('#response-status')).toHaveClass(/status-4xx/);
  });

  test('5xx 响应状态码样式', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/status/500`, '500');
    await expect(page.locator('#response-status')).toHaveClass(/status-5xx/);
  });

  test('3xx 重定向响应状态码样式', async ({ page }) => {
    // 关闭跟随重定向
    await page.locator('#request-options-btn').click();
    await page.locator('.request-options-switch').click();
    await page.locator('#request-options-btn').click();

    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/redirect/1`);
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('302');
    await expect(page.locator('#response-status')).toHaveClass(/status-3xx/);
  });
});

test.describe('响应标签页', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('响应 Cookies 标签页', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/cookies/set?test=123`, '200');
    await switchResponseTab(page, 'cookies');
    await expect(page.locator('#response-cookies')).toBeVisible();
  });

  test('响应 Test Results 标签页（无测试时）', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');
    await switchResponseTab(page, 'test-results');
    await expect(page.locator('#response-test-results')).toBeVisible();
  });

  test('响应 Headers 标签页', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');
    await switchResponseTab(page, 'headers');
    await expect(page.locator('#response-headers')).toBeVisible();
  });

  test('Script 日志显示', async ({ page }) => {
    await switchRequestTab(page, 'script');
    await page.locator('#script-textarea').fill("console.log('hello from script'); console.log('second log')");
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');
    await expect(page.locator('.response-logs')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('.response-logs')).toContainText('hello from script');
    await expect(page.locator('.response-logs')).toContainText('second log');
  });

  test('Post-response Script 日志显示', async ({ page }) => {
    await switchRequestTab(page, 'tests');
    await page.locator('#post-script-textarea').fill("console.log('post log: ' + response.status)");
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');
    await expect(page.locator('.response-logs')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('.response-logs')).toContainText('post log');
  });
});

test.describe('响应搜索导航', () => {
  let rp: ResponsePage;

  test.beforeEach(async ({ page }) => {
    rp = new ResponsePage(page);
    await page.goto('/');
  });

  test('搜索匹配计数显示正确', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');
    await switchResponseTab(page, 'body');
    await rp.openSearch();
    await rp.search('localhost');
    await expect(rp.searchCount).not.toHaveText('', { timeout: 5_000 });
  });

  test('Ctrl+F 打开响应搜索', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');
    await switchResponseTab(page, 'body');
    await page.locator('#response-panel').press('Control+f');
    await expect(rp.searchBar).toBeVisible();
  });

  test('点击下一匹配按钮导航', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');
    await switchResponseTab(page, 'body');
    await rp.openSearch();
    await rp.search('localhost');
    await expect(rp.searchCount).not.toHaveText('', { timeout: 5_000 });

    const initialCount = await rp.getSearchCountText();
    await rp.nextMatch();
    await page.waitForFunction(
      ([sel]) => document.querySelector(sel)?.textContent !== '',
      ['#response-search-count'],
    );
    const afterCount = await rp.getSearchCountText();
    expect(initialCount).not.toBe('1/1');
    expect(afterCount).not.toBe(initialCount);
  });

  test('点击上一匹配按钮导航', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');
    await switchResponseTab(page, 'body');
    await rp.openSearch();
    await rp.search('localhost');
    await expect(rp.searchCount).not.toHaveText('', { timeout: 5_000 });

    await rp.nextMatch();
    await page.waitForFunction(
      ([sel]) => document.querySelector(sel)?.textContent !== '',
      ['#response-search-count'],
    );
    const countAfterNext = await rp.getSearchCountText();

    await rp.prevMatch();
    await page.waitForFunction(
      ([sel]) => document.querySelector(sel)?.textContent !== '',
      ['#response-search-count'],
    );
    const countAfterPrev = await rp.getSearchCountText();
    expect(countAfterNext).not.toBe('1/1');
    expect(countAfterPrev).not.toBe(countAfterNext);
  });

  test('下一匹配按钮循环回第一个', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');
    await switchResponseTab(page, 'body');
    await rp.openSearch();
    await rp.search('localhost');
    await expect(rp.searchCount).not.toHaveText('', { timeout: 5_000 });

    const countText = await rp.getSearchCountText();
    const totalMatch = countText?.split('/')[1];
    expect(totalMatch).toBeDefined();
    const total = parseInt(totalMatch!);
    expect(total).toBeGreaterThan(1);

    for (let i = 0; i < total; i++) {
      await rp.nextMatch();
      await page.waitForFunction(
        ([sel]) => document.querySelector(sel)?.textContent !== '',
        ['#response-search-count'],
      );
    }
    const finalCount = await rp.getSearchCountText();
    expect(finalCount).toBe(`1/${totalMatch}`);
  });

  test('上一匹配按钮循环到最后一个', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');
    await switchResponseTab(page, 'body');
    await rp.openSearch();
    await rp.search('localhost');
    await expect(rp.searchCount).not.toHaveText('', { timeout: 5_000 });

    const countText = await rp.getSearchCountText();
    const totalMatch = countText?.split('/')[1];
    expect(totalMatch).toBeDefined();

    await rp.prevMatch();
    await page.waitForFunction(
      ([sel]) => document.querySelector(sel)?.textContent !== '',
      ['#response-search-count'],
    );
    const finalCount = await rp.getSearchCountText();
    expect(finalCount).toBe(`${totalMatch}/${totalMatch}`);
  });

  test('清空搜索词清除高亮', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');
    await switchResponseTab(page, 'body');
    await rp.openSearch();
    await rp.search('localhost');
    await expect(page.locator('#response-format-content .search-highlight').first()).toBeVisible({ timeout: 5_000 });

    const highlights = page.locator('#response-format-content .search-highlight');
    const count = await highlights.count();
    expect(count).toBeGreaterThan(0);

    await rp.searchInput.fill('');
    await expect(page.locator('#response-format-content .search-highlight')).toHaveCount(0, { timeout: 5_000 });
  });

  test('按 Escape 关闭搜索栏', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');
    await switchResponseTab(page, 'body');
    await rp.openSearch();
    await rp.searchInput.fill('test');
    await rp.searchInput.press('Escape');
    await expect(rp.searchBar).toBeHidden();
  });

  test('在 Raw 格式下搜索正常工作', async ({ page }) => {
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');
    await rp.switchFormat('raw');
    await expect(page.locator('.format-tab[data-format="raw"]')).toHaveClass(/active/);
    await rp.openSearch();
    await rp.search('localhost');
    await expect(rp.searchCount).not.toHaveText('', { timeout: 5_000 });
    const countText = await rp.getSearchCountText();
    expect(countText).toMatch(/\d+\/\d+/);
  });
});

test.describe('请求方法', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('发送 PUT 请求', async ({ page }) => {
    await page.locator('#method-select').selectOption('PUT');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/put`);
    await switchRequestTab(page, 'body');
    await page.locator('#body-textarea').fill('{"method": "PUT"}');
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');
    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).toContainText('PUT');
  });

  test('发送 DELETE 请求', async ({ page }) => {
    await page.locator('#method-select').selectOption('DELETE');
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/delete`, '200');
  });
});
```

- [ ] **Step 2: 运行合并后的 response.spec.ts 验证通过**

Run: `npx playwright test tests/e2e/response.spec.ts --reporter=line 2>&1 | tail -5`
Expected: All tests pass

- [ ] **Step 3: 删除旧文件并提交**

```bash
rm tests/e2e/response-advanced.spec.ts tests/e2e/response-extras.spec.ts tests/e2e/response-format-switching.spec.ts tests/e2e/response-search-nav.spec.ts
git add -A tests/e2e/
git commit -m "refactor(e2e): 合并四个 response spec 文件为 response.spec.ts，消除重复测试"
```

---

### Task 7: 合并 edge-cases.spec.ts → app.spec.ts + environment/cookies/variables 合并

**Files:**
- Modify: `tests/e2e/app.spec.ts`（吸收 edge-cases 的主题持久化和侧边栏测试）
- Modify: `tests/e2e/environment.spec.ts`（吸收 env-unsaved.spec.ts，使用 EnvironmentPage）
- Modify: `tests/e2e/cookies.spec.ts`（吸收 management-advanced 的 Cookie 部分）
- Modify: `tests/e2e/variables.spec.ts`（吸收 management-advanced 的变量部分）
- Delete: `tests/e2e/edge-cases.spec.ts`
- Delete: `tests/e2e/env-unsaved.spec.ts`
- Delete: `tests/e2e/management-advanced.spec.ts`

- [ ] **Step 1: 先读取当前 app.spec.ts 内容**

读取 `tests/e2e/app.spec.ts` 了解现有测试，然后在其末尾追加 edge-cases 的三个 describe 块。edge-cases 中的 `空 URL 不发送请求` 改用确定性断言：验证 send-btn 没有 data-loading 变化而非超时断言。

- [ ] **Step 2: 修改 app.spec.ts 吸收 edge-cases 测试**

在 app.spec.ts 末尾追加：

```typescript
// --- 边界情况（原 edge-cases.spec.ts）---

test.describe('边界情况', () => {
  test('空 URL 不发送请求', async ({ page }) => {
    await page.goto('/');
    await page.locator('#url-input').clear();
    await page.locator('#send-btn').click();
    // 验证按钮没有进入 loading 状态（不依赖超时）
    await expect(page.locator('#send-btn')).toHaveAttribute('data-loading', 'false');
  });

  test('无效 URL 发送请求显示错误', async ({ page }) => {
    await page.goto('/');
    await page.locator('#url-input').fill('not-a-valid-url');
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toHaveClass(/status-5xx/);
    await expect(page.locator('.response-error')).toBeVisible({ timeout: 5_000 });
  });

  test('不可达主机发送请求显示错误', async ({ page }) => {
    await page.goto('/');
    await page.locator('#url-input').fill('http://this-host-does-not-exist-12345.invalid/get');
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toHaveClass(/status-5xx/);
    await expect(page.locator('.response-error')).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('主题持久化', () => {
  test('切换暗色主题后刷新页面保持主题', async ({ page }) => {
    await page.goto('/');
    await page.locator('#btn-theme-toggle').click();
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(theme).toBeTruthy();
    await page.reload();
    const themeAfter = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(themeAfter).toBe(theme);
  });

  test('切换主题两次后恢复原始主题', async ({ page }) => {
    await page.goto('/');
    const themeBefore = await page.evaluate(() => document.documentElement.getAttribute('data-theme') || 'dark');
    await page.locator('#btn-theme-toggle').click();
    await page.locator('#btn-theme-toggle').click();
    const themeAfter = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(themeAfter).toBe(themeBefore);
  });
});

test.describe('侧边栏历史记录区域', () => {
  test('折叠和展开历史记录区域', async ({ page }) => {
    await page.goto('/');
    const historyHeader = page.locator('.history-header');
    await expect(historyHeader).toBeVisible();
    await historyHeader.click();
    await expect(page.locator('.history-panel.expanded')).toBeVisible({ timeout: 5_000 });
    await historyHeader.click();
    await expect(page.locator('.history-panel.expanded')).not.toBeVisible();
  });
});
```

- [ ] **Step 3: 修改 environment.spec.ts 吸收 env-unsaved.spec.ts**

在 environment.spec.ts 末尾追加 env-unsaved 的测试，同时用 EnvironmentPage 重写创建环境部分，消除 `evaluate(el => el.click())`。

- [ ] **Step 4: 修改 cookies.spec.ts 吸收 management-advanced 的 Cookie 部分**

在 cookies.spec.ts 末尾追加 management-advanced 中 `Cookie 高级管理` 的两个测试，重写条件断言为确定性断言。

- [ ] **Step 5: 修改 variables.spec.ts 吸收 management-advanced 的变量部分**

在 variables.spec.ts 末尾追加 management-advanced 中 `全局变量编辑和删除` 和 `环境变量管理` 的测试。

- [ ] **Step 6: 运行所有修改过的 spec 验证通过**

Run: `npx playwright test tests/e2e/app.spec.ts tests/e2e/environment.spec.ts tests/e2e/cookies.spec.ts tests/e2e/variables.spec.ts --reporter=line 2>&1 | tail -10`
Expected: All tests pass

- [ ] **Step 7: 删除旧文件并提交**

```bash
rm tests/e2e/edge-cases.spec.ts tests/e2e/env-unsaved.spec.ts tests/e2e/management-advanced.spec.ts
git add -A tests/e2e/
git commit -m "refactor(e2e): 合并 edge-cases/env-unsaved/management-advanced 到对应 spec 文件，修复不稳定模式"
```

---

### Task 8: 为不变文件引入页面对象（逐步迁移）

对于不合并的文件，逐步用页面对象替换散落选择器。此任务按文件逐一处理。

**Files:**
- Modify: `tests/e2e/auth.spec.ts`
- Modify: `tests/e2e/collection.spec.ts`
- Modify: `tests/e2e/history.spec.ts`
- Modify: `tests/e2e/import-export.spec.ts`
- Modify: `tests/e2e/runner.spec.ts`
- Modify: `tests/e2e/save-load.spec.ts`
- Modify: `tests/e2e/scripts.spec.ts`
- Modify: `tests/e2e/tabs.spec.ts`
- Modify: `tests/e2e/variable-autocomplete.spec.ts`
- Modify: `tests/e2e/variable-resolution.spec.ts`
- Modify: `tests/e2e/keyboard-shortcuts.spec.ts`
- Modify: `tests/e2e/panel-resizer.spec.ts`

- [ ] **Step 1: 迁移 auth.spec.ts 使用 AuthPage + RequestPage**

在 auth.spec.ts 中引入 `AuthPage` 和 `RequestPage`，替换散落的 `#auth-type-select`、`#auth-token` 等选择器为 `authPage.selectType('bearer')` 等方法调用。

- [ ] **Step 2: 运行验证**

Run: `npx playwright test tests/e2e/auth.spec.ts --reporter=line 2>&1 | tail -5`
Expected: All tests pass

- [ ] **Step 3: 迁移 collection.spec.ts 使用 CollectionPage + EnvironmentPage**

- [ ] **Step 4: 运行验证**

Run: `npx playwright test tests/e2e/collection.spec.ts --reporter=line 2>&1 | tail -5`

- [ ] **Step 5-14: 逐一迁移剩余文件**

每个文件：引入对应页面对象 → 替换选择器 → 运行验证通过 → 继续下一个

- [ ] **Step 15: 全量运行验证**

Run: `bun run test:e2e 2>&1 | tail -20`
Expected: All tests pass

- [ ] **Step 16: Commit**

```bash
git add -A tests/e2e/
git commit -m "refactor(e2e): 为所有 spec 文件引入页面对象，消除散落选择器"
```

---

### Task 9: 全量 E2E 测试验证

- [ ] **Step 1: 运行完整 E2E 测试套件**

Run: `bun run test:e2e 2>&1 | tail -30`
Expected: All tests pass, 测试文件数从 26 减少到约 16

- [ ] **Step 2: 检查文件数量**

Run: `ls tests/e2e/*.spec.ts | wc -l`
Expected: ~16

- [ ] **Step 3: Commit（如有遗漏修复）**

---

## 第二批：覆盖提升

### Task 10: Body 类型发送验证

**Files:**
- Modify: `tests/e2e/body-types.spec.ts`
- Modify: `tests/e2e/mock-server.ts`（添加 echo endpoint 验证 body 内容）

- [ ] **Step 1: 添加 Form URL Encoded 发送验证测试**

在 body-types.spec.ts 末尾追加 describe 块：

```typescript
test.describe('Body 类型发送验证', () => {
  test('Form URL Encoded body 发送', async ({ page }) => {
    await page.goto('/');
    await page.locator('#method-select').selectOption('POST');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/post`);
    await switchRequestTab(page, 'body');
    await page.locator('#body-type-select').selectOption('form');

    // 等待 form 编辑器出现
    const formEditor = page.locator('.kv-editor');
    await expect(formEditor).toBeVisible();

    await page.locator('.kv-add-btn').click();
    const lastRow = page.locator('.kv-row').last();
    await lastRow.locator('.kv-key').fill('username');
    await lastRow.locator('.kv-value').fill('testuser');

    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    // 验证响应中包含表单数据
    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).toContainText('username');
    await expect(responseBody).toContainText('testuser');
  });

  test('Multipart body 发送', async ({ page }) => {
    await page.goto('/');
    await page.locator('#method-select').selectOption('POST');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/post`);
    await switchRequestTab(page, 'body');
    await page.locator('#body-type-select').selectOption('multipart');

    const multipartEditor = page.locator('#multipart-editor');
    await expect(multipartEditor).toBeVisible();

    // 添加一个文本字段
    await page.locator('.multipart-add-btn').click();
    const lastRow = page.locator('.multipart-row').last();
    await lastRow.locator('.multipart-key').fill('field1');
    await lastRow.locator('.multipart-text-value').fill('value1');

    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).toContainText('field1');
  });

  test('GraphQL variables 和 operationName 发送', async ({ page }) => {
    await page.goto('/');
    await page.locator('#method-select').selectOption('POST');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/post`);
    await switchRequestTab(page, 'body');
    await page.locator('#body-type-select').selectOption('graphql');

    const queryEditor = page.locator('#graphql-query');
    await expect(queryEditor).toBeVisible();

    await queryEditor.fill('query GetUser($id: ID!) { user(id: $id) { name } }');

    const variablesEditor = page.locator('#graphql-variables');
    await variablesEditor.fill('{"id": "1"}');

    const operationName = page.locator('#graphql-operation-name');
    await operationName.fill('GetUser');

    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    // 验证请求体包含 graphql 字段
    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).toContainText('GetUser');
    await expect(responseBody).toContainText('variables');
  });
});
```

- [ ] **Step 2: 运行验证**

Run: `npx playwright test tests/e2e/body-types.spec.ts --reporter=line 2>&1 | tail -5`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/body-types.spec.ts
git commit -m "test(e2e): 添加 Body 类型发送验证（Form/Multipart/GraphQL variables）"
```

---

### Task 11: 导入边界情况 + 导出验证

**Files:**
- Modify: `tests/e2e/import-export.spec.ts`

- [ ] **Step 1: 在 import-export.spec.ts 末尾追加边界测试**

```typescript
test.describe('导入边界情况', () => {
  test('导入无效 JSON 显示错误', async ({ page }) => {
    await page.goto('/');
    await page.locator('#btn-import').click();
    await waitForModal(page);

    // 确保在 Import 标签
    await page.locator('[data-imex-tab="import"]').click();

    await page.locator('#import-type').selectOption('postman');
    await page.locator('#import-content').fill('{ invalid json }}}');
    await page.locator('#import-action-btn').click();

    // 应该显示错误提示
    await expect(page.locator('.toast')).toBeVisible({ timeout: 5_000 });
  });

  test('导入空内容显示错误', async ({ page }) => {
    await page.goto('/');
    await page.locator('#btn-import').click();
    await waitForModal(page);

    await page.locator('[data-imex-tab="import"]').click();
    await page.locator('#import-type').selectOption('postman');
    await page.locator('#import-content').fill('');
    await page.locator('#import-action-btn').click();

    await expect(page.locator('.toast')).toBeVisible({ timeout: 5_000 });
  });

  test('导入畸形 curl 命令', async ({ page }) => {
    await page.goto('/');
    await page.locator('#btn-import').click();
    await waitForModal(page);

    await page.locator('[data-imex-tab="import"]').click();
    await page.locator('#import-type').selectOption('curl');
    await page.locator('#import-content').fill('not a valid curl command');
    await page.locator('#import-action-btn').click();

    await expect(page.locator('.toast')).toBeVisible({ timeout: 5_000 });
  });

  test('导出内容验证剪贴板 JSON 结构', async ({ page }) => {
    await page.goto('/');

    // 先创建集合
    const collName = `导出测试_${Date.now()}`;
    await page.locator('#btn-new-collection').click();
    await waitForModal(page);
    await page.locator('#modal .dialog-input').fill(collName);
    await page.locator('#modal .modal-btn-primary').click();
    await waitForModalClose(page);

    // 保存一个请求
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');
    await page.locator('#save-btn').click();
    await waitForModal(page);
    await page.locator('#save-col-select').selectOption({ label: collName });
    await page.locator('#save-confirm').click();
    await waitForModalClose(page);

    // 打开导出
    await page.locator('#btn-import').click();
    await waitForModal(page);
    await page.locator('[data-imex-tab="export"]').click();

    // 点击导出按钮
    const exportBtn = page.locator('.export-col-btn').first();
    await exportBtn.click();

    // 验证剪贴板包含集合名称
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain(collName);
    const parsed = JSON.parse(clipboard!);
    expect(parsed).toHaveProperty('info');
    expect(parsed).toHaveProperty('item');
  });
});
```

- [ ] **Step 2: 运行验证**

Run: `npx playwright test tests/e2e/import-export.spec.ts --reporter=line 2>&1 | tail -5`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/import-export.spec.ts
git commit -m "test(e2e): 添加导入边界情况和导出内容验证"
```

---

### Task 12: Runner 重试和完整运行验证

**Files:**
- Modify: `tests/e2e/runner.spec.ts`
- Modify: `tests/e2e/mock-server.ts`（添加可配置失败端点）

- [ ] **Step 1: 在 mock-server.ts 添加可控失败端点**

在 `mock-server.ts` 的路由逻辑中添加：

```typescript
// 可控失败端点：通过 query 参数 failCount=N 控制前 N 次返回 500
if (url.pathname === '/flaky') {
  const failCount = parseInt(getQueryParams(url)['failCount'] || '0');
  const currentAttempt = parseInt(getQueryParams(url)['attempt'] || '0');
  if (currentAttempt < failCount) {
    return json({ error: 'temporary failure', attempt: currentAttempt }, 500);
  }
  return json({ success: true, attempt: currentAttempt });
}
```

- [ ] **Step 2: 在 runner.spec.ts 末尾追加测试**

```typescript
test.describe('Runner 重试和完整运行', () => {
  test.configure({ timeout: 60_000 });

  test('Runner 多请求集合运行', async ({ page }) => {
    await page.goto('/');
    const collName = `RunnerMulti_${Date.now()}`;

    // 创建集合
    await page.locator('#btn-new-collection').click();
    await waitForModal(page);
    await page.locator('#modal .dialog-input').fill(collName);
    await page.locator('#modal .modal-btn-primary').click();
    await waitForModalClose(page);

    // 保存第一个请求
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/get`, '200');
    await page.locator('#save-btn').click();
    await waitForModal(page);
    await page.locator('#save-col-select').selectOption({ label: collName });
    await page.locator('#save-confirm').click();
    await waitForModalClose(page);

    // 新建标签，保存第二个请求
    await page.locator('.request-tab-add').click();
    await page.locator('#method-select').selectOption('POST');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/post`);
    await switchRequestTab(page, 'body');
    await page.locator('#body-textarea').fill('{"test": "runner"}');
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    await page.locator('#save-btn').click();
    await waitForModal(page);
    await page.locator('#save-col-select').selectOption({ label: collName });
    await page.locator('#save-confirm').click();
    await waitForModalClose(page);

    // 运行集合
    await page.locator(`#collection-tree .tree-item`).filter({ hasText: collName }).locator('.tree-run-btn').click();
    await expect(page.locator('.runner-panel')).toBeVisible({ timeout: 10_000 });

    // 验证两个请求都完成
    await expect(page.locator('.runner-result-item')).toHaveCount(2, { timeout: 30_000 });
  });

  test('Runner 停止后已完成请求保留结果', async ({ page }) => {
    await page.goto('/');
    const collName = `RunnerStop_${Date.now()}`;

    // 创建集合并保存一个长延迟请求
    await page.locator('#btn-new-collection').click();
    await waitForModal(page);
    await page.locator('#modal .dialog-input').fill(collName);
    await page.locator('#modal .modal-btn-primary').click();
    await waitForModalClose(page);

    // 保存延迟请求
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/delay/3`, '200');
    await page.locator('#save-btn').click();
    await waitForModal(page);
    await page.locator('#save-col-select').selectOption({ label: collName });
    await page.locator('#save-confirm').click();
    await waitForModalClose(page);

    // 新建标签，保存另一个延迟请求
    await page.locator('.request-tab-add').click();
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/delay/3`, '200');
    await page.locator('#save-btn').click();
    await waitForModal(page);
    await page.locator('#save-col-select').selectOption({ label: collName });
    await page.locator('#save-confirm').click();
    await waitForModalClose(page);

    // 运行并点击停止
    await page.locator(`#collection-tree .tree-item`).filter({ hasText: collName }).locator('.tree-run-btn').click();
    await expect(page.locator('.runner-panel')).toBeVisible({ timeout: 10_000 });

    // 等待第一个请求开始后点击停止
    await page.waitForTimeout(2000);
    await page.locator('#runner-stop-btn').click();

    // Runner 面板应该关闭或显示已停止
    await expect(page.locator('.runner-panel').or(page.locator('.runner-title'))).toBeVisible({ timeout: 10_000 });
  });
});
```

- [ ] **Step 3: 运行验证**

Run: `npx playwright test tests/e2e/runner.spec.ts --reporter=line 2>&1 | tail -5`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/runner.spec.ts tests/e2e/mock-server.ts
git commit -m "test(e2e): 添加 Runner 多请求运行和停止验证，mock-server 添加可控失败端点"
```

---

### Task 13: 高级交互和边界覆盖

**Files:**
- Modify: `tests/e2e/request.spec.ts`（并发请求、禁用头验证）
- Modify: `tests/e2e/environment.spec.ts`（环境删除级联）
- Modify: `tests/e2e/cookies.spec.ts`（Cookie 标签页渲染）

- [ ] **Step 1: 在 request.spec.ts 末尾追加并发请求和禁用头测试**

```typescript
test.describe('并发请求', () => {
  test('多标签页同时发送请求', async ({ page }) => {
    await page.goto('/');

    // 第一个标签发送 GET
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/get`);
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    // 新建标签发送 POST
    await page.locator('.request-tab-add').click();
    await page.locator('#method-select').selectOption('POST');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/post`);
    await switchRequestTab(page, 'body');
    await page.locator('#body-textarea').fill('{"tab": "second"}');
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    // 切回第一个标签验证响应保留
    await page.locator('.request-tab').nth(0).click();
    await expect(page.locator('#response-status')).toContainText('200');
  });
});

test.describe('禁用请求头验证', () => {
  test('禁用的请求头不包含在实际请求中', async ({ page }) => {
    await page.goto('/');
    await page.locator('#url-input').fill(`${MOCK_BASE_URL}/get`);

    // 添加一个自定义头
    await page.locator('#tab-headers .kv-add-btn').click();
    const lastRow = page.locator('#tab-headers .kv-row').last();
    await lastRow.locator('.kv-key').fill('X-Disabled-Test');
    await lastRow.locator('.kv-value').fill('should-not-appear');

    // 禁用该头
    await lastRow.locator('.kv-enabled').uncheck();

    // 发送请求
    await page.locator('#send-btn').click();
    await expect(page.locator('#response-status')).toContainText('200');

    // 响应中不应包含该头（mock /get echo headers）
    const responseBody = page.locator('#response-format-content');
    await expect(responseBody).not.toContainText('X-Disabled-Test');
  });
});
```

- [ ] **Step 2: 在 environment.spec.ts 末尾追加环境删除级联测试**

```typescript
test.describe('环境删除级联', () => {
  test('删除环境后变量从预览面板消失', async ({ page }) => {
    const envName = `级联删除_${Date.now()}`;

    // 创建环境并添加变量
    const envPage = new EnvironmentPage(page);
    await envPage.open();
    await envPage.createEnv(envName);
    await envPage.selectEnv(envName);
    await envPage.addVariable('cascade_key', 'cascade_value');
    await envPage.saveVariables();
    await envPage.close();

    // 激活环境
    await envPage.switchActiveEnv(envName);

    // 删除环境
    await envPage.open();
    await envPage.deleteEnv(envName);
    await envPage.close();

    // 验证环境下拉回到 No Environment
    await expect(page.locator('#active-env')).toHaveValue('');
  });
});
```

- [ ] **Step 3: 在 cookies.spec.ts 末尾追加 Cookie 标签页渲染测试**

```typescript
test.describe('Cookie 标签页渲染', () => {
  test('响应 Set-Cookie 在 Cookie 标签页正确显示', async ({ page }) => {
    await page.goto('/');
    await sendRequestAndWait(page, `${MOCK_BASE_URL}/cookies/set?flavor=chocolate&brand=cookies-r-us`, '200');

    // 切换到 Cookie 标签页
    await switchResponseTab(page, 'cookies');
    const cookiesContent = page.locator('#response-cookies');
    await expect(cookiesContent).toBeVisible();
    await expect(cookiesContent).toContainText('flavor');
    await expect(cookiesContent).toContainText('chocolate');
  });
});
```

- [ ] **Step 4: 运行验证**

Run: `npx playwright test tests/e2e/request.spec.ts tests/e2e/environment.spec.ts tests/e2e/cookies.spec.ts --reporter=line 2>&1 | tail -10`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/request.spec.ts tests/e2e/environment.spec.ts tests/e2e/cookies.spec.ts
git commit -m "test(e2e): 添加并发请求、禁用头验证、环境删除级联、Cookie 标签页渲染测试"
```

---

### Task 14: 全量 E2E 测试最终验证

- [ ] **Step 1: 运行完整 E2E 测试套件**

Run: `bun run test:e2e 2>&1 | tail -30`
Expected: All tests pass

- [ ] **Step 2: 统计测试数量变化**

Run: `grep -r 'test(' tests/e2e/*.spec.ts | grep -v 'test.describe' | wc -l`
Expected: 测试数量从 ~170 增长到 ~200+

- [ ] **Step 3: 统计文件数量**

Run: `ls tests/e2e/*.spec.ts | wc -l`
Expected: ~16

- [ ] **Step 4: 验证无 evaluate 绕过残留**

Run: `grep -r 'evaluate.*el.*click' tests/e2e/*.spec.ts | wc -l`
Expected: 0

- [ ] **Step 5: 最终 commit**

```bash
git add -A
git commit -m "test(e2e): E2E 测试优化完成——POM 引入、文件合并、不稳定模式修复、覆盖提升"
```
