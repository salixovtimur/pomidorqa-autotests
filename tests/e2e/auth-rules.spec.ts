import { test, expect } from "@playwright/test";
import { makeUser, ROUTES, uniqueTag, UserPool } from "../helpers/user";
import { AuthPage } from "../pages/auth-page";
import { ProfilePage } from "../pages/profile-page";

test.describe("Регистрация: обязательные поля и длина пароля", () => {
  const users = new UserPool();

  test.afterEach(async () => {
    await users.cleanup();
  });

  test("форма регистрации не отправляется без любого из трёх полей", async ({ browser }) => {
    const runId = Date.now();
    const user = makeUser("required", runId);

    const guest = await test.step("Открываем форму регистрации в сессии без аккаунта", () =>
      users.addGuest(browser, ROUTES.register));

    const auth = new AuthPage(guest.page);
    users.expectAccountFrom(guest.context);

    await test.step("Без имени форма невалидна", async () => {
      await auth.register("", user.email, user.password);
      expect(await auth.isFieldValid(auth.nameInput)).toBe(false);
      await expect(guest.page).toHaveURL(new RegExp(`${ROUTES.register}$`));
    });

    await test.step("Без почты форма невалидна", async () => {
      await auth.register(user.name, "", user.password);
      expect(await auth.isFieldValid(auth.emailInput)).toBe(false);
      await expect(guest.page).toHaveURL(new RegExp(`${ROUTES.register}$`));
    });

    await test.step("Без пароля форма невалидна", async () => {
      await auth.register(user.name, user.email, "");
      expect(await auth.isFieldValid(auth.passwordInput)).toBe(false);
      await expect(guest.page).toHaveURL(new RegExp(`${ROUTES.register}$`));
    });

    await test.step("Участник так и не создан — сессии нет", async () => {
      await expect(auth.loginLink).toBeVisible();
    });
  });

  test("пароль короче восьми символов форма не принимает, ровно восемь — принимает", async ({
    browser,
  }) => {
    const runId = Date.now();
    const user = makeUser("password", runId);

    const guest = await test.step("Открываем форму регистрации в сессии без аккаунта", () =>
      users.addGuest(browser, ROUTES.register));

    const auth = new AuthPage(guest.page);
    users.expectAccountFrom(guest.context);

    await test.step("Пароль из семи символов форма отклоняет", async () => {
      await auth.register(user.name, user.email, "1234567");
      expect(await auth.isFieldValid(auth.passwordInput)).toBe(false);
      await expect(guest.page).toHaveURL(new RegExp(`${ROUTES.register}$`));
    });

    await test.step("Пароль ровно из восьми символов форма принимает и пускает внутрь", async () => {
      await auth.register(user.name, user.email, "12345678");
      await expect(guest.page).toHaveURL(new RegExp(`${ROUTES.home}/?$`), { timeout: 10_000 });
      await expect(auth.logoutButton).toBeVisible();
    });
  });

  test("профиль не сохраняется с пустым именем", async ({ browser }) => {
    const runId = Date.now();

    const owner = await test.step("Заводим через API участника на его профиле", () =>
      users.add(browser, "emptyname", runId, ROUTES.profile));

    const profile = new ProfilePage(owner.page);
    const newBio = uniqueTag("bio", runId);

    await test.step("Участник стирает имя и меняет «о себе»", async () => {
      await profile.fillBio(newBio);
      await profile.nameInput.fill("");
    });

    await test.step("Форма считает пустое имя невалидным", async () => {
      expect(await profile.isNameValid()).toBe(false);
    });

    await test.step("Кнопка «Сохранить» ничего не отправляет", async () => {
      await profile.saveButton.click();
      await profile.reload();
    });

    await test.step("Имя осталось прежним, изменение «о себе» тоже не сохранилось", async () => {
      await expect(profile.nameInput).toHaveValue(owner.user.name);
      await expect(profile.bioInput).not.toHaveValue(newBio);
    });
  });
});
