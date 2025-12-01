import puppeteer, { Browser, Page } from 'puppeteer';

export interface BrowserOptions {
  headless?: boolean;
  slowMo?: number;
}

export class BrowserAutomation {
  private browser: Browser | null = null;
  private page: Page | null = null;

  constructor(private options: BrowserOptions = { headless: true }) {}

  async launch(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: this.options.headless,
      slowMo: this.options.slowMo,
    });
    this.page = await this.browser.newPage();
  }

  async navigate(url: string): Promise<void> {
    if (!this.page) throw new Error('Browser not launched');
    await this.page.goto(url, { waitUntil: 'networkidle0' });
  }

  async click(selector: string): Promise<void> {
    if (!this.page) throw new Error('Browser not launched');
    await this.page.click(selector);
  }

  async type(selector: string, text: string): Promise<void> {
    if (!this.page) throw new Error('Browser not launched');
    await this.page.type(selector, text);
  }

  async getText(selector: string): Promise<string> {
    if (!this.page) throw new Error('Browser not launched');
    return this.page.$eval(selector, (el) => el.textContent || '');
  }

  async screenshot(path?: string): Promise<Buffer> {
    if (!this.page) throw new Error('Browser not launched');
    return this.page.screenshot({ path }) as Promise<Buffer>;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}
