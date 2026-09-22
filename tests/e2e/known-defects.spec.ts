import { test, expect, type Browser } from "@playwright/test";
import { ROUTES, uniqueTag, UserPool, type ApiUser } from "../helpers/user";
import { tomorrowAt } from "../helpers/slot-time";
import { BookingPage } from "../pages/booking-page";
import { ProfilePage } from "../pages/profile-page";
import { SlotsPage } from "../pages/slots-page";

async function hostWithWantToLearnSkill(
  browser: Browser,
  users: UserPool,
  runId: number,
  skillTag: string
): Promise<ApiUser> {
  const host = await users.add(browser, "kdhost", runId, ROUTES.profile);
  const slot = tomorrowAt("19:00");

  await new ProfilePage(host.page).addSkill(skillTag, "want_to_learn");
  const slots = new SlotsPage(host.page);
  await slots.open();
  await slots.addSlot(slot.date, slot.time);

  return host;
}

test.describe("Известные дефекты", () => {
  const users = new UserPool();

  test.afterEach(async () => {
    await users.cleanup();
  });

  test("подготовка к KD-1: хост с навыком «хочу разобрать» и слотом виден в каталоге", async ({
    browser,
  }) => {
    const runId = Date.now();
    const skillTag = uniqueTag("TolkoRazberu", runId);

    const host = await test.step("Заводим хоста с навыком «хочу разобрать» и слотом", () =>
      hostWithWantToLearnSkill(browser, users, runId, skillTag));

    const guest = await test.step("Заводим через API гостя в каталоге", () =>
      users.add(browser, "kdprep", runId));

    const guestCatalog = new BookingPage(guest.page);

    await test.step("Хост есть в каталоге — подготовка рабочая", async () => {
      await guestCatalog.findPerson(skillTag, host.user.name);
      await expect(guestCatalog.personCard(host.user.name)).toBeVisible();
    });
  });

  test("KD-1: поиск в каталоге ограничен навыками «могу помочь»", async ({ browser }) => {
    test.fail();

    const runId = Date.now();
    const skillTag = uniqueTag("TolkoRazberu", runId);

    const host = await test.step("Заводим хоста с навыком «хочу разобрать» и слотом", () =>
      hostWithWantToLearnSkill(browser, users, runId, skillTag));

    const guest = await test.step("Заводим через API гостя в каталоге", () =>
      users.add(browser, "kdguest", runId));

    const guestCatalog = new BookingPage(guest.page);

    await test.step("Гость ищет по навыку из блока «хочу разобрать»", async () => {
      await guestCatalog.searchBySkill(skillTag);
    });

    await test.step("По требованию R8.3 такой хост в выдачу попадать не должен", async () => {
      await expect(guestCatalog.catalogEmptyMessage).toBeVisible();
      await expect(guestCatalog.personCard(host.user.name)).toHaveCount(0);
    });
  });
});
