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
  readonly kvEditor: Locator;

  constructor(page: Page) {
    this.page = page;
    this.manageBtn = page.locator('#btn-manage-env');
    this.newNameInput = page.locator('#modal #new-env-name');
    this.createBtn = page.locator('#modal #create-env-btn');
    this.closeBtn = page.locator('#modal #close-env-modal');
    this.activeEnvSelect = page.locator('#active-env');
    this.modal = page.locator('#modal');
    this.kvEditor = page.locator('#modal #env-vars-editor');
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
    await this.createBtn.click();
    await this.page.locator('#modal .env-item').filter({ hasText: name }).waitFor({ state: 'visible', timeout: 10_000 });
    return this;
  }

  async selectEnv(name: string) {
    const envItem = this.page.locator('#modal .env-item').filter({ hasText: name });
    await envItem.waitFor({ state: 'visible' });
    // 点击 .env-name 而非 .env-item，因为 item 中心可能落在右侧的 Rename/Delete 按钮上
    await envItem.locator('.env-name').click();
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
    await this.kvEditor.locator('.kv-add-btn').waitFor({ state: 'visible' });
    await this.kvEditor.locator('.kv-add-btn').click();
    const lastRow = this.kvEditor.locator('.kv-row').last();
    await lastRow.locator('.kv-key').fill(key);
    await lastRow.locator('.kv-value').fill(value);
    return this;
  }

  async deleteVariable(index: number) {
    await this.kvEditor.locator('.kv-row').nth(index).locator('.kv-delete').click();
    return this;
  }

  async saveVariables() {
    await this.kvEditor.locator('.kv-save-btn').click();
    return this;
  }

  async switchActiveEnv(name: string) {
    await this.activeEnvSelect.selectOption({ label: name });
    return this;
  }
}
