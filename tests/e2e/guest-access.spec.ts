import { test, expect } from "@playwright/test";
import { ROUTES, uniqueTag, UserPool } from "../helpers/user";
import { tomorrowAt } from "../helpers/slot-time";
import { BookingPage } from "../pages/booking-page";
import { PersonPage } from "../pages/person-page";
import { ProfilePage } from "../pages/profile-page";
import { SlotsPage } from "../pages/slots-page";

const GUEST_BOOKING_ERROR = "Нужно войти в аккаунт PomidorQA";

test.describe("Гостевой доступ", () => {
  const users = new UserPool();

  test.afterEach(async () => {
    await users.cleanup();
  });

  test("гость видит каталог и страницу участника, но забронировать не может", async ({
    browser,
  }) => {
    const runId = Date.now();
    const skillTag = uniqueTag("Guest", runId);
    const slot = tomorrowAt("17:00");

    const host = await test.step("Заводим через API хоста на его профиле", () =>
      users.add(browser, "guesthost", runId, ROUTES.profile));

    const hostProfile = new ProfilePage(host.page);
    const hostSlots = new SlotsPage(host.page);

    await test.step("Хост объявляет навык «могу помочь»", async () => {
      await hostProfile.addSkill(skillTag, "can_help");
    });

    await test.step("Хост выкладывает свободный слот на завтра", async () => {
      await hostSlots.open();
      await hostSlots.addSlot(slot.date, slot.time);
    });

    const guest = await test.step("Открываем каталог в сессии без регистрации", () =>
      users.addGuest(browser));

    const guestCatalog = new BookingPage(guest.page);
    const person = new PersonPage(guest.page);

    await test.step("Гость находит хоста в каталоге по навыку", async () => {
      await guestCatalog.findPerson(skillTag, host.user.name);
    });

    await test.step("Карточка хоста показана гостю", async () => {
      await expect(guestCatalog.personCard(host.user.name)).toBeVisible();
    });

    await test.step("Гость открывает страницу хоста", async () => {
      await guestCatalog.openPersonCard(host.user.name);
    });

    await test.step("На странице видны имя, навык и свободное время", async () => {
      await expect(person.name).toHaveText(host.user.name);
      await expect(person.canHelpSection).toContainText(skillTag);
      await guestCatalog.openDayWithSlots();
      await expect(guestCatalog.calendarTime(slot.time)).toBeVisible();
    });

    await test.step("Гость выбирает слот и жмёт «Подтвердить»", async () => {
      await guestCatalog.openSlotAt(slot.time);
      await guestCatalog.confirmBooking();
    });

    await test.step("Вместо брони сервис требует войти в аккаунт", async () => {
      await expect(guestCatalog.confirmError).toContainText(GUEST_BOOKING_ERROR);
      await expect(guestCatalog.confirmSuccess).toHaveCount(0);
    });

    await test.step("Слот остался свободным — хост видит его у себя", async () => {
      await hostSlots.reload();
      await expect(hostSlots.slotDeleteButton(slot.time)).toBeVisible();
    });
  });

  test("приватные страницы уводят гостя на форму входа", async ({ browser }) => {
    const guest = await test.step("Открываем сессию без регистрации", () =>
      users.addGuest(browser));

    for (const path of [ROUTES.profile, ROUTES.slots, ROUTES.bookings]) {
      await test.step(`Гость открывает ${path}`, async () => {
        await guest.page.goto(path);
      });

      await test.step(`${path} отдаёт страницу входа`, async () => {
        await expect(guest.page).toHaveURL(new RegExp(`${ROUTES.login}$`));
      });
    }
  });
});
