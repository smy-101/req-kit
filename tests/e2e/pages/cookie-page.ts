import { type Page, type Locator, expect } from '../fixtures';
import { waitForModal, waitForModalClose } from '../helpers/wait';

export class CookiePage {
  readonly page: Page;
  readonly manageBtn: Locator;
  readonly modalTitle: Locator;
  readonly closeBtn: Locator;
  readonly emptyMsg: Locator;
  readonly countBadge: Locator;
  readonly domainGroups: Locator;
  readonly domainHeaders: Locator;
  readonly domainClearBtns: Locator;
  readonly cookieItems: Locator;
  readonly cookieDeleteBtns: Locator;
  readonly clearAllBtn: Locator;
  readonly totalBadge: Locator;

  constructor(page: Page) {
    this.page = page;
    this.manageBtn = page.locator('#btn-manage-cookies');
    this.modalTitle = page.locator('#modal h3');
    this.closeBtn = page.locator('#close-cookie-modal');
    this.emptyMsg = page.locator('.cookie-empty-msg');
    this.countBadge = page.locator('#cookie-count');
    this.domainGroups = page.locator('.cookie-domain-group');
    this.domainHeaders = page.locator('.cookie-domain-header');
    this.domainClearBtns = page.locator('.cookie-domain-clear');
    this.cookieItems = page.locator('.cookie-item');
    this.cookieDeleteBtns = page.locator('.cookie-item-delete');
    this.clearAllBtn = page.locator('#clear-all-cookies');
    this.totalBadge = page.locator('.cookie-modal-total');
  }

  async open() {
    await this.manageBtn.click();
    await waitForModal(this.page);
    return this;
  }

  async close() {
    await this.closeBtn.click();
    return this;
  }

  async expandDomain(index = 0) {
    const header = this.domainHeaders.nth(index);
    await header.click();
    await expect(this.domainGroups.nth(index)).not.toHaveClass(/collapsed/);
    return this;
  }

  async collapseDomain(index = 0) {
    const header = this.domainHeaders.nth(index);
    await header.click();
    await expect(this.domainGroups.nth(index)).toHaveClass(/collapsed/);
    return this;
  }

  async clearDomainCookies(index = 0) {
    await this.domainClearBtns.nth(index).click();
    return this;
  }

  async deleteCookie(index = 0) {
    await this.cookieDeleteBtns.nth(index).click();
    return this;
  }

  async clearAllCookies() {
    await this.clearAllBtn.click();
    return this;
  }
}
