import type { Page, Locator } from '../fixtures';
import { waitForModal, waitForModalClose } from '../helpers/wait';

export class ImportExportPage {
  readonly page: Page;
  readonly importBtn: Locator;
  readonly modalTitle: Locator;
  readonly importTab: Locator;
  readonly exportTab: Locator;
  readonly importType: Locator;
  readonly importContent: Locator;
  readonly importActionBtn: Locator;
  readonly closeBtn: Locator;
  readonly exportListItem: Locator;
  readonly exportHint: Locator;

  constructor(page: Page) {
    this.page = page;
    this.importBtn = page.locator('#btn-import');
    this.modalTitle = page.locator('#modal h3');
    this.importTab = page.locator('#imex-import');
    this.exportTab = page.locator('#imex-export');
    this.importType = page.locator('#import-type');
    this.importContent = page.locator('#import-content');
    this.importActionBtn = page.locator('#import-action-btn');
    this.closeBtn = page.locator('#close-imex-modal');
    this.exportListItem = page.locator('.export-list-item');
    this.exportHint = page.locator('.export-hint');
  }

  async open() {
    await this.importBtn.click();
    await waitForModal(this.page);
    return this;
  }

  async close() {
    await this.closeBtn.click();
    await waitForModalClose(this.page);
    return this;
  }

  async switchTab(tab: 'import' | 'export') {
    await this.page.locator(`[data-imex-tab="${tab}"]`).click();
    return this;
  }

  async importCurl(curlCommand: string) {
    await this.importType.selectOption('curl');
    await this.importContent.fill(curlCommand);
    await this.importActionBtn.click();
    await waitForModalClose(this.page);
    return this;
  }

  async importPostman(json: string) {
    await this.importType.selectOption('postman');
    await this.importContent.fill(json);
    await this.importActionBtn.click();
    await waitForModalClose(this.page);
    return this;
  }

  async exportCollection(name: string) {
    await this.switchTab('export');
    const item = this.exportListItem.filter({ hasText: name });
    await item.locator('.export-col-btn').click();
    return this;
  }
}
