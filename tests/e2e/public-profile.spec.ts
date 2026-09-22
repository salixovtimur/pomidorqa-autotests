import { test, expect } from "@playwright/test";
import { ROUTES, uniqueTag, UserPool } from "../helpers/user";
import { tomorrowAt } from "../helpers/slot-time";
import { BookingPage } from "../pages/booking-page";
import { PersonPage } from "../pages/person-page";
import { ProfilePage } from "../pages/profile-page";
import { SlotsPage } from "../pages/slots-page";

test.describe("Страница участника", () => {
  const users = new UserPool();

  test.afterEach(async () => {
    await users.cleanup();
  });

  test("другой участник видит имя, «о себе» и навыки обоих типов", async ({ browser }) => {
    const runId = Date.now();
    const canHelpTag = uniqueTag("Pomogu", runId);
    const wantToLearnTag = uniqueTag("Razberu", runId);
    const bio = `Тестовое описание ${runId}`;
    const slot = tomorrowAt("10:30");

    const host = await test.step("Заводим через API хоста на его профиле", () =>
      users.add(browser, "publichost", runId, ROUTES.profile));

    const hostProfile = new ProfilePage(host.page);
    const hostSlots = new SlotsPage(host.page);

    await test.step("Хост заполняет «о себе»", async () => {
      await hostProfile.fillBio(bio);
      await hostProfile.save();
      await hostProfile.reload();
    });

    await test.step("Хост объявляет навык каждого типа", async () => {
      await hostProfile.addSkill(canHelpTag, "can_help");
      await hostProfile.addSkill(wantToLearnTag, "want_to_learn");
    });

    await test.step("Хост выкладывает свободный слот", async () => {
      await hostSlots.open();
      await hostSlots.addSlot(slot.date, slot.time);
    });

    const guest = await test.step("Заводим через API гостя в каталоге", () =>
      users.add(browser, "publicguest", runId));

    const guestCatalog = new BookingPage(guest.page);
    const person = new PersonPage(guest.page);

    await test.step("Гость открывает страницу хоста из каталога", async () => {
      await guestCatalog.findPerson(canHelpTag, host.user.name);
      await guestCatalog.openPersonCard(host.user.name);
    });

    await test.step("На странице видно имя хоста", async () => {
      await expect(person.name).toHaveText(host.user.name);
    });

    await test.step("Видно описание «о себе»", async () => {
      await expect(person.content).toContainText(bio);
    });

    await test.step("Навыки разложены по своим блокам", async () => {
      await expect(person.canHelpSkills()).toHaveText([canHelpTag]);
      await expect(person.wantToLearnSkills()).toHaveText([wantToLearnTag]);
    });

    await test.step("Свободное время хоста доступно для брони", async () => {
      await guestCatalog.openDayWithSlots();
      await expect(guestCatalog.calendarTime(slot.time)).toBeVisible();
    });
  });
});
