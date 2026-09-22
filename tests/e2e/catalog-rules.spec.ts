import { test, expect } from "@playwright/test";
import { ROUTES, uniqueTag, UserPool } from "../helpers/user";
import { tomorrowAt } from "../helpers/slot-time";
import { BookingPage } from "../pages/booking-page";
import { ProfilePage } from "../pages/profile-page";
import { SlotsPage } from "../pages/slots-page";

test.describe("Каталог: правила выдачи", () => {
  const users = new UserPool();

  test.afterEach(async () => {
    await users.cleanup();
  });

  test("участник попадает в каталог только со свободным слотом", async ({ browser }) => {
    const runId = Date.now();
    const skillTag = uniqueTag("Bezslota", runId);
    const slot = tomorrowAt("11:00");

    const host = await test.step("Заводим через API хоста на его профиле", () =>
      users.add(browser, "noslothost", runId, ROUTES.profile));

    const hostProfile = new ProfilePage(host.page);
    const hostSlots = new SlotsPage(host.page);

    await test.step("Хост объявляет навык, но слотов не выкладывает", async () => {
      await hostProfile.addSkill(skillTag, "can_help");
    });

    const guest = await test.step("Заводим через API гостя в каталоге", () =>
      users.add(browser, "noslotguest", runId));

    const guestCatalog = new BookingPage(guest.page);

    await test.step("Гость ищет хоста по этому навыку", async () => {
      await guestCatalog.searchBySkill(skillTag);
    });

    await test.step("Без свободного слота хоста в каталоге нет", async () => {
      await expect(guestCatalog.catalogEmptyMessage).toBeVisible();
      await expect(guestCatalog.personCard(host.user.name)).toHaveCount(0);
    });

    await test.step("Хост выкладывает свободный слот", async () => {
      await hostSlots.open();
      await hostSlots.addSlot(slot.date, slot.time);
    });

    await test.step("Теперь хост находится в каталоге", async () => {
      await guestCatalog.findPerson(skillTag, host.user.name);
      await expect(guestCatalog.personCard(host.user.name)).toBeVisible();
    });
  });

  test("участник не видит себя в собственном каталоге", async ({ browser }) => {
    const runId = Date.now();
    const skillTag = uniqueTag("Sebya", runId);
    const slot = tomorrowAt("13:00");

    const owner = await test.step("Заводим через API участника на его профиле", () =>
      users.add(browser, "selfcatalog", runId, ROUTES.profile));

    const profile = new ProfilePage(owner.page);
    const slots = new SlotsPage(owner.page);
    const catalog = new BookingPage(owner.page);

    await test.step("Участник объявляет навык и выкладывает слот", async () => {
      await profile.addSkill(skillTag, "can_help");
      await slots.open();
      await slots.addSlot(slot.date, slot.time);
    });

    const other = await test.step("Заводим через API второго участника в каталоге", () =>
      users.add(browser, "othercatalog", runId));

    const otherCatalog = new BookingPage(other.page);

    await test.step("Со стороны другого участника карточка в каталоге есть", async () => {
      await otherCatalog.findPerson(skillTag, owner.user.name);
      await expect(otherCatalog.personCard(owner.user.name)).toBeVisible();
    });

    await test.step("Участник ищет себя в каталоге по своему навыку", async () => {
      await catalog.openCatalog();
      await catalog.searchBySkill(skillTag);
    });

    await test.step("В своей выдаче карточки нет", async () => {
      await expect(catalog.catalogEmptyMessage).toBeVisible();
      await expect(catalog.personCard(owner.user.name)).toHaveCount(0);
    });
  });

  test("по неизвестному навыку выдача пустая", async ({ browser }) => {
    const runId = Date.now();

    const guest = await test.step("Заводим через API участника в каталоге", () =>
      users.add(browser, "emptysearch", runId));

    const catalog = new BookingPage(guest.page);

    await test.step("Участник ищет навык, которого ни у кого нет", async () => {
      await catalog.searchBySkill(uniqueTag("Nesushchestvuyushchiy", runId));
    });

    await test.step("Каталог отвечает, что никого не нашёл", async () => {
      await expect(catalog.catalogEmptyMessage).toBeVisible();
      await expect(catalog.personCards).toHaveCount(0);
    });
  });
});
