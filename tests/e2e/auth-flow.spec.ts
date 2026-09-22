import { test, expect } from "@playwright/test";
import { deleteUserAfterSignupForm, makeUser, ROUTES, UserPool } from "../helpers/user";
import { DEFAULT_PROFILE_TIMEZONE } from "../helpers/slot-time";
import { AuthPage } from "../pages/auth-page";
import { ProfilePage } from "../pages/profile-page";

const LOGIN_ERROR = "Неверный email или пароль";

test.describe("Регистрация и вход", () => {
  const users = new UserPool();
  let auth: AuthPage;
  let signupSubmitted = false;
  let signupRejectionExpected = false;

  test.beforeEach(({ page }) => {
    auth = new AuthPage(page);
    signupSubmitted = false;
    signupRejectionExpected = false;
  });

  test.afterEach(async ({ page }) => {
    try {
      await deleteUserAfterSignupForm(page.context(), signupSubmitted, signupRejectionExpected);
    } finally {
      await users.cleanup();
    }
  });

  test("форма регистрации заводит участника и создаёт ему профиль", async ({ page }) => {
    const user = makeUser("signup", Date.now());
    const profile = new ProfilePage(page);

    await test.step("Открываем форму регистрации", async () => {
      await auth.openRegister();
    });

    await test.step("Заполняем имя, почту и пароль и отправляем", async () => {
      signupSubmitted = true;
      await auth.register(user.name, user.email, user.password);
    });

    await test.step("Участника пустило на главную PomidorQA", async () => {
      await expect(page).toHaveURL(new RegExp(`${ROUTES.home}/?$`), {
        timeout: 10_000,
      });
    });

    await test.step("В шапке появилась кнопка «Выйти» — участник вошёл", async () => {
      await expect(auth.logoutButton).toBeVisible();
    });

    await test.step("В профиле стоит имя из формы регистрации", async () => {
      await profile.open();
      await expect(profile.nameInput).toHaveValue(user.name);
    });

    await test.step(`Часовой пояс по умолчанию — ${DEFAULT_PROFILE_TIMEZONE}`, async () => {
      await expect(profile.timezoneSelect).toHaveValue(DEFAULT_PROFILE_TIMEZONE);
    });
  });

  test("выход закрывает сессию, вход открывает её снова", async ({ browser, page }) => {
    const runId = Date.now();

    const existing = await test.step("Заводим участника через API", () =>
      users.add(browser, "session", runId));

    await test.step("Входим под этим участником через форму", async () => {
      await auth.openLogin();
      await auth.login(existing.user.email, existing.user.password);
    });

    await test.step("В шапке появилась кнопка «Выйти»", async () => {
      await expect(auth.logoutButton).toBeVisible({ timeout: 10_000 });
    });

    await test.step("Участник выходит", async () => {
      await auth.logout();
    });

    await test.step("В шапке снова ссылка «Войти»", async () => {
      await expect(auth.loginLink).toBeVisible();
      await expect(auth.logoutButton).toHaveCount(0);
    });

    await test.step("Приватная страница после выхода уводит на форму входа", async () => {
      await page.goto(ROUTES.profile);
      await expect(page).toHaveURL(new RegExp(`${ROUTES.login}$`));
    });
  });

  test("повторная регистрация с занятой почтой отклоняется", async ({ browser, page }) => {
    const runId = Date.now();

    const existing = await test.step("Заводим участника через API", () =>
      users.add(browser, "taken", runId));

    await test.step("Открываем форму регистрации в чистой сессии", async () => {
      await auth.openRegister();
    });

    await test.step("Заполняем форму той же почтой и отправляем", async () => {
      signupSubmitted = true;
      signupRejectionExpected = true;
      const duplicate = makeUser("dubl", runId);
      await auth.register(duplicate.name, existing.user.email, duplicate.password);
    });

    await test.step("Форма сказала, что почта занята", async () => {
      await expect(auth.error).toHaveText("Этот email уже зарегистрирован");
    });

    await test.step("Внутрь не пустило — остались на форме регистрации", async () => {
      await expect(page).toHaveURL(new RegExp(`${ROUTES.register}$`));
      await expect(auth.loginLink).toBeVisible();
    });
  });

  test("неверный пароль и несуществующая почта дают одну и ту же ошибку", async ({ browser }) => {
    const runId = Date.now();

    const existing = await test.step("Заводим участника через API", () =>
      users.add(browser, "loginprobe", runId));

    await test.step("Входим с верной почтой, но неверным паролем", async () => {
      await auth.openLogin();
      await auth.login(existing.user.email, "wrong-password-123");
    });

    await test.step("Неверный пароль: показана общая ошибка", async () => {
      await expect(auth.error).toHaveText(LOGIN_ERROR);
    });

    await test.step("Входим почтой, которой на стенде нет", async () => {
      await auth.openLogin();
      await auth.login(makeUser("nobody", runId).email, "any-password-123");
    });

    await test.step("Несуществующая почта: ошибка дословно та же", async () => {
      await expect(auth.error).toHaveText(LOGIN_ERROR);
    });

    await test.step("Внутрь так и не пустило — в шапке всё ещё «Войти»", async () => {
      await expect(auth.loginLink).toBeVisible();
    });
  });
});
