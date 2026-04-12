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
