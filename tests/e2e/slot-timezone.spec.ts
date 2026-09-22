import { test, expect } from "@playwright/test";
import { ROUTES, uniqueTag, UserPool } from "../helpers/user";
import { tomorrowAt } from "../helpers/slot-time";
import { BookingPage } from "../pages/booking-page";
import { ProfilePage } from "../pages/profile-page";
import { SlotsPage } from "../pages/slots-page";

const HOST_TIMEZONE = "Asia/Vladivostok";
const SLOT_TIME = "12:00";

test.describe("Слоты: часовой пояс владельца", () => {
  const users = new UserPool();

  test.afterEach(async () => {
    await users.cleanup();
  });

  test("гость видит время слота в поясе хоста, а не в своём", async ({ browser }) => {
    const runId = Date.now();
    const skillTag = uniqueTag("Timezone", runId);
    const slot = tomorrowAt(SLOT_TIME, HOST_TIMEZONE);

    const host = await test.step("Заводим через API хоста на его профиле", () =>
      users.add(browser, "tzhost", runId, ROUTES.profile));

    const hostProfile = new ProfilePage(host.page);
    const hostSlots = new SlotsPage(host.page);

    await test.step(`Хост переключает часовой пояс на ${HOST_TIMEZONE}`, async () => {
      await hostProfile.selectTimezone(HOST_TIMEZONE);
      await hostProfile.save();
    });

    await test.step("Пояс сохранился на сервере", async () => {
      await hostProfile.reload();
      await expect(hostProfile.timezoneSelect).toHaveValue(HOST_TIMEZONE);
    });

    await test.step("Хост объявляет навык «могу помочь»", async () => {
      await hostProfile.addSkill(skillTag, "can_help");
    });

    await test.step(`Хост выкладывает слот на ${SLOT_TIME} по своему поясу`, async () => {
      await hostSlots.open();
      await hostSlots.addSlot(slot.date, slot.time);
    });

    await test.step("В своих слотах хост видит введённое время без сдвига", async () => {
      await expect(hostSlots.slotCard(SLOT_TIME)).toBeVisible();
    });

    const guest = await test.step("Заводим через API гостя в каталоге", () =>
      users.add(browser, "tzguest", runId));

    const guestCatalog = new BookingPage(guest.page);

    await test.step("Гость находит хоста в каталоге и открывает его страницу", async () => {
      await guestCatalog.findPerson(skillTag, host.user.name);
      await guestCatalog.openPersonCard(host.user.name);
      await guestCatalog.openDayWithSlots();
    });

    await test.step("Гость видит то же время, что ввёл хост", async () => {
      await expect(guestCatalog.calendarTime(SLOT_TIME)).toBeVisible();
    });

    await test.step("Рядом с календарём указан пояс хоста", async () => {
      await expect(guestCatalog.calendarTimezoneHint).toContainText(HOST_TIMEZONE);
    });
  });
});
