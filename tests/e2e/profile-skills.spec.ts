import { test, expect } from "@playwright/test";
import { ROUTES, uniqueTag, UserPool } from "../helpers/user";
import { ProfilePage } from "../pages/profile-page";

test.describe("Профиль: правила навыков", () => {
  const users = new UserPool();

  test.afterEach(async () => {
    await users.cleanup();
  });

  test("повторный навык того же типа не добавляется", async ({ browser }) => {
    const runId = Date.now();
    const skillTag = uniqueTag("Dubl", runId);

    const owner = await test.step("Заводим через API участника на его профиле", () =>
      users.add(browser, "dublskill", runId, ROUTES.profile));

    const profile = new ProfilePage(owner.page);

    await test.step("Участник добавляет навык «могу помочь»", async () => {
      await profile.addSkill(skillTag, "can_help");
    });

    await test.step("Участник отправляет тот же навык того же типа второй раз", async () => {
      await profile.submitSkill(skillTag, "can_help");
    });

    await test.step("В профиле по-прежнему одна запись этого навыка", async () => {
      await profile.reload();
      await expect(profile.skillChip(skillTag)).toHaveCount(1);
    });
  });

  test("тот же навык другого типа — отдельная запись", async ({ browser }) => {
    const runId = Date.now();
    const skillTag = uniqueTag("Oba", runId);

    const owner = await test.step("Заводим через API участника на его профиле", () =>
      users.add(browser, "obaskill", runId, ROUTES.profile));

    const profile = new ProfilePage(owner.page);

    await test.step("Участник добавляет навык в «могу помочь»", async () => {
      await profile.addSkill(skillTag, "can_help");
    });

    await test.step("Участник добавляет тот же навык в «хочу разобрать»", async () => {
      await profile.addSkill(skillTag, "want_to_learn");
    });

    await test.step("После перезагрузки навык лежит в обоих блоках", async () => {
      await profile.reload();
      await expect(profile.skillChipIn("can_help", skillTag)).toHaveCount(1);
      await expect(profile.skillChipIn("want_to_learn", skillTag)).toHaveCount(1);
    });
  });

  test("свой навык участник удаляет", async ({ browser }) => {
    const runId = Date.now();
    const removedTag = uniqueTag("Udalyaem", runId);
    const keptTag = uniqueTag("Ostaetsya", runId);

    const owner = await test.step("Заводим через API участника на его профиле", () =>
      users.add(browser, "delskill", runId, ROUTES.profile));

    const profile = new ProfilePage(owner.page);

    await test.step("Участник добавляет два навыка «могу помочь»", async () => {
      await profile.addSkill(removedTag, "can_help");
      await profile.addSkill(keptTag, "can_help");
    });

    await test.step("Участник убирает первый навык", async () => {
      await profile.removeSkill(removedTag);
    });

    await test.step("После перезагрузки удалённого нет, второй на месте", async () => {
      await profile.reload();
      await expect(profile.skillChip(keptTag)).toHaveCount(1);
      await expect(profile.skillChip(removedTag)).toHaveCount(0);
    });
  });
});
