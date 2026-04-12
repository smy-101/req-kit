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
