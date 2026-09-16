import { test, expect } from "@playwright/test";
import { deleteUserAfterSignupForm, makeUser, ROUTES, UserPool } from "../helpers/user";
import { AuthPage } from "../pages/auth-page";

// Единственный файл, где вход и регистрация — предмет проверки, а не
// подготовка. Во всех остальных сценариях участник заводится через API,
// поэтому саму форму, кроме этих тестов, не проверяет никто.

const LOGIN_ERROR = "Неверный email или пароль";

test.describe("Регистрация и вход", () => {
  const users = new UserPool();
  let auth: AuthPage;
  // Заполнена ли форма регистрации и ждём ли мы отказа — от этого зависит,
  // считать ли отсутствие сессии после теста нормой или потерянным участником.
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

  test("форма регистрации пускает нового участника внутрь", async ({ page }) => {
    const user = makeUser("signup", Date.now());

    await test.step("Открываем форму регистрации", async () => {
      await auth.openRegister();
    });

    await test.step("Заполняем имя, почту и пароль и отправляем", async () => {
      // Отмечаем намерение до клика: если аккаунт создастся, а тест упадёт
      // следующей строкой, уборка должна знать, что за ним идти.
      signupSubmitted = true;
      await auth.register(user.name, user.email, user.password);
    });

    await test.step("Участника пустило на главную PomidorQA", async () => {
      // Редирект серверный, приходит мгновенно, но стенд общий и дважды за
      // марафон отвечал дольше пяти секунд — держим небольшой запас.
      await expect(page).toHaveURL(new RegExp(`${ROUTES.home}/?$`), { timeout: 10_000 });
    });

    await test.step("В шапке появилась кнопка «Выйти» — участник вошёл", async () => {
      await expect(auth.logoutButton).toBeVisible();
    });
  });

  test("повторная регистрация с занятой почтой отклоняется", async ({ browser, page }) => {
    const runId = Date.now();

    // Занятую почту готовим через API и в своём контексте: форма в этом тесте
    // должна встретить уже существующего участника, а не создать его.
    const existing = await test.step("Заводим участника через API", () =>
      users.add(browser, "taken", runId),
    );

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

  test("неверный пароль и несуществующая почта дают одну и ту же ошибку", async ({
    browser,
  }) => {
    const runId = Date.now();

    // По тексту ошибки нельзя понять, существует ли такая
    // почта — иначе форма входа превращается в способ перебирать чужие адреса.
    // Поэтому текст пришпилен дословно в обоих случаях: сравнения двух строк
    // между собой мало, оно проходит и на сломанном входе, который всем
    // отвечает одинаковым «что-то пошло не так».
    const existing = await test.step("Заводим участника через API", () =>
      users.add(browser, "loginprobe", runId),
    );

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
