import { test, expect } from "@playwright/test";
import { ROUTES, uniqueTag, UserPool } from "../helpers/user";
import { tomorrowAt } from "../helpers/slot-time";
import { BookingPage } from "../pages/booking-page";
import { ProfilePage } from "../pages/profile-page";
import { SlotsPage } from "../pages/slots-page";

test.describe("Бронирование: состояния слота и встречи", () => {
  const users = new UserPool();

  test.afterEach(async () => {
    await users.cleanup();
  });

  test("закрытие окна подтверждения не создаёт бронь", async ({ browser }) => {
    const runId = Date.now();
    const skillTag = uniqueTag("Peredumal", runId);
    const slot = tomorrowAt("15:00");

    const host = await test.step("Заводим через API хоста на его профиле", () =>
      users.add(browser, "dismisshost", runId, ROUTES.profile));

    const hostProfile = new ProfilePage(host.page);
    const hostSlots = new SlotsPage(host.page);

    await test.step("Хост объявляет навык и выкладывает слот", async () => {
      await hostProfile.addSkill(skillTag, "can_help");
      await hostSlots.open();
      await hostSlots.addSlot(slot.date, slot.time);
    });

    const guest = await test.step("Заводим через API гостя в каталоге", () =>
      users.add(browser, "dismissguest", runId));

    const guestBooking = new BookingPage(guest.page);

    await test.step("Гость открывает окно брони и закрывает его кнопкой «Отмена»", async () => {
      await guestBooking.findPerson(skillTag, host.user.name);
      await guestBooking.openPersonCard(host.user.name);
      await guestBooking.openFirstSlot();
      await guestBooking.dismissBooking();
    });

    await test.step("В «Ближайших» у гостя пусто", async () => {
      await guestBooking.openMyMeetings();
      await expect(guestBooking.upcomingEmptyMessage).toBeVisible();
      await expect(guestBooking.upcomingMeeting(host.user.name)).toHaveCount(0);
    });

    await test.step("Слот у хоста остался свободным", async () => {
      await hostSlots.reload();
      await expect(hostSlots.slotDeleteButton(slot.time)).toBeVisible();
    });
  });

  test("забронированный слот пропадает со страницы участника", async ({ browser }) => {
    const runId = Date.now();
    const skillTag = uniqueTag("Skrytyy", runId);
    const slot = tomorrowAt("16:00");

    const host = await test.step("Заводим через API хоста на его профиле", () =>
      users.add(browser, "hiddenhost", runId, ROUTES.profile));

    const hostProfile = new ProfilePage(host.page);
    const hostSlots = new SlotsPage(host.page);

    await test.step("Хост объявляет навык и выкладывает единственный слот", async () => {
      await hostProfile.addSkill(skillTag, "can_help");
      await hostSlots.open();
      await hostSlots.addSlot(slot.date, slot.time);
    });

    const guest = await test.step("Заводим через API гостя в каталоге", () =>
      users.add(browser, "hiddenguest", runId));

    const guestBooking = new BookingPage(guest.page);

    await test.step("Гость открывает страницу хоста и видит свободное время", async () => {
      await guestBooking.findPerson(skillTag, host.user.name);
      await guestBooking.openPersonCard(host.user.name);
      await guestBooking.openDayWithSlots();
      await expect(guestBooking.calendarTime(slot.time)).toBeVisible();
    });

    await test.step("Гость бронирует слот", async () => {
      await guestBooking.openSlotAt(slot.time);
      await guestBooking.confirmBooking();
      await expect(guestBooking.confirmSuccess).toBeVisible({
        timeout: 15_000,
      });
    });

    await test.step("После брони на странице хоста свободных слотов нет", async () => {
      await guestBooking.reload();
      await expect(guestBooking.calendarEmptyMessage).toBeVisible();
    });
  });

  test("отменённую встречу нельзя отменить повторно", async ({ browser }) => {
    const runId = Date.now();
    const skillTag = uniqueTag("Povtor", runId);
    const slot = tomorrowAt("18:00");

    const host = await test.step("Заводим через API хоста на его профиле", () =>
      users.add(browser, "repeathost", runId, ROUTES.profile));

    const hostProfile = new ProfilePage(host.page);
    const hostSlots = new SlotsPage(host.page);

    await test.step("Хост объявляет навык и выкладывает слот", async () => {
      await hostProfile.addSkill(skillTag, "can_help");
      await hostSlots.open();
      await hostSlots.addSlot(slot.date, slot.time);
    });

    const guest = await test.step("Заводим через API гостя в каталоге", () =>
      users.add(browser, "repeatguest", runId));

    const guestBooking = new BookingPage(guest.page);

    await test.step("Гость бронирует слот хоста", async () => {
      await guestBooking.findPerson(skillTag, host.user.name);
      await guestBooking.openPersonCard(host.user.name);
      await guestBooking.openFirstSlot();
      await guestBooking.confirmBooking();
      await expect(guestBooking.confirmSuccess).toBeVisible({
        timeout: 15_000,
      });
    });

    await test.step("Гость открывает «Мои встречи» и отменяет встречу", async () => {
      await guestBooking.openMyMeetings();
      await expect(guestBooking.upcomingMeeting(host.user.name)).toBeVisible({
        timeout: 15_000,
      });
      await guestBooking.cancelMeeting(host.user.name);
    });

    await test.step("Карточка уехала в «Прошедшие и отменённые»", async () => {
      await expect(guestBooking.pastMeeting(host.user.name)).toContainText("отменено");
      await expect(guestBooking.upcomingMeeting(host.user.name)).toHaveCount(0);
    });

    await test.step("В прошедших у встречи нет кнопки отмены", async () => {
      await expect(
        guestBooking.pastMeeting(host.user.name).getByRole("button", { name: "Отменить" })
      ).toHaveCount(0);
    });
  });
});
