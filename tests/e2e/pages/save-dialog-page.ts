import type { Page, Locator } from '../fixtures';
import { waitForModal, waitForModalClose } from '../helpers/wait';

export class SaveDialogPage {
  readonly page: Page;
  readonly saveBtn: Locator;
  readonly modal: Locator;
  readonly nameInput: Locator;
  readonly colSelect: Locator;
  readonly confirmBtn: Locator;
  readonly cancelBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.saveBtn = page.locator('#save-btn');
    this.modal = page.locator('#modal');
    this.nameInput = page.locator('#modal #save-req-name');
    this.colSelect = page.locator('#modal #save-col-select');
    this.confirmBtn = page.locator('#modal #save-confirm');
    this.cancelBtn = page.locator('#modal #save-cancel');
  }

  async open() {
    await this.saveBtn.click();
    await this.modal.waitFor({ state: 'visible' });
    return this;
  }

  async save(collectionName: string, requestName?: string) {
    await this.open();
    if (requestName !== undefined) {
      await this.nameInput.clear();
      await this.nameInput.fill(requestName);
    }
    await this.colSelect.selectOption({ label: collectionName });
    await this.confirmBtn.click();
    await waitForModalClose(this.page);
    return this;
  }

  async cancel() {
    await this.open();
    await this.cancelBtn.click();
    await waitForModalClose(this.page);
    return this;
  }
}
