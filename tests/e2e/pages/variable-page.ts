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

  async deleteGlobalVar(index: number) {
    await this.page.locator('#modal .kv-row').nth(index).locator('.kv-delete').click();
    return this;
  }

  async closeVarPreview() {
    await this.varPreviewBtn.click();
    await this.varPreviewPanel.waitFor({ state: 'hidden' });
    return this;
  }

  async searchVariables(term: string) {
    const searchInput = this.page.locator('#var-search');
    await searchInput.fill(term);
    return this;
  }
}
