import { type Locator, type Page } from "@playwright/test";
import { ROUTES } from "../helpers/user";

export class AuthPage {
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly registerButton: Locator;
  readonly loginButton: Locator;
  readonly logoutButton: Locator;
  readonly loginLink: Locator;
  readonly error: Locator;

  constructor(readonly page: Page) {
    this.nameInput = page.getByLabel("Имя");
    this.emailInput = page.getByLabel("Email");
    this.passwordInput = page.getByLabel("Пароль");
    this.registerButton = page.getByRole("button", {
      name: "Зарегистрироваться",
    });
    this.loginButton = page.getByRole("button", { name: "Войти" });
    this.logoutButton = page.getByRole("button", { name: "Выйти" });
    this.loginLink = page.getByTestId("PomidorqaHeader-login-link");
    this.error = page.locator("form").getByRole("alert");
  }

  async isFieldValid(field: Locator): Promise<boolean> {
    return field.evaluate((input) =>
      (input as unknown as { checkValidity(): boolean }).checkValidity()
    );
  }

  async openRegister() {
    await this.page.goto(ROUTES.register);
  }

  async openLogin() {
    await this.page.goto(ROUTES.login);
  }

  async register(name: string, email: string, password: string) {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.registerButton.click();
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async logout() {
    const pageUrl = this.page.url();
    const loggedOut = this.page.waitForResponse(
      (response) => response.url() === pageUrl && response.request().method() === "POST"
    );
    await this.logoutButton.click();
    await loggedOut;
    await this.page.waitForURL(new RegExp(`${ROUTES.home}/?$`));
  }
}
