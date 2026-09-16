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
    this.registerButton = page.getByRole("button", { name: "Зарегистрироваться" });
    this.loginButton = page.getByRole("button", { name: "Войти" });
    // Кнопка «Выйти» есть только у вошедшего, ссылка «Войти» — только у гостя.
    // По ним и отличаем состояние, не гадая по URL.
    this.logoutButton = page.getByRole("button", { name: "Выйти" });
    this.loginLink = page.getByTestId("PomidorqaHeader-login-link");
    // Скоуп на форму обязателен: замерил на стенде — до отправки на странице
    // один элемент с ролью alert, после отправки два, и второй пустой и лежит
    // вне формы. Без скоупа локатор упрётся в strict mode или возьмёт чужой.
    this.error = page.locator("form").getByRole("alert");
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
}
