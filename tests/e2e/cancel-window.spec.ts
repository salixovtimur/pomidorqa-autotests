import { test, expect } from "@playwright/test";
import { ROUTES, uniqueTag, UserPool } from "../helpers/user";
import { roundedTime, slotFormValues } from "../helpers/slot-time";
import { BookingPage } from "../pages/booking-page";
import { ProfilePage } from "../pages/profile-page";
import { SlotsPage } from "../pages/slots-page";

const ONE_HOUR_MS = 60 * 60 * 1000;

test.describe("Отмена: окно в два часа", () => {
  const users = new UserPool();

  test.afterEach(async () => {
    await users.cleanup();
  });

  test("за час до начала встречу отменить нельзя", async ({ browser }) => {
    const runId = Date.now();
    const skillTag = uniqueTag("Okno", runId);
    const raw = slotFormValues(ONE_HOUR_MS);
    const slot = { date: raw.date, time: roundedTime(raw.time) };

    const host = await test.step("Заводим через API хоста на его профиле", () =>
      users.add(browser, "windowhost", runId, ROUTES.profile));

    const hostProfile = new ProfilePage(host.page);
    const hostSlots = new SlotsPage(host.page);

    await test.step("Хост объявляет навык", async () => {
      await hostProfile.addSkill(skillTag, "can_help");
    });

    await test.step("Хост выкладывает слот через час от текущего момента", async () => {
      await hostSlots.open();
      await hostSlots.addSlot(slot.date, slot.time);
    });

    const guest = await test.step("Заводим через API гостя в каталоге", () =>
      users.add(browser, "windowguest", runId));

    const guestBooking = new BookingPage(guest.page);

    await test.step("Гость находит хоста и бронирует слот", async () => {
      await guestBooking.findPerson(skillTag, host.user.name);
      await guestBooking.openPersonCard(host.user.name);
      await guestBooking.openFirstSlot();
      await guestBooking.confirmBooking();
      await expect(guestBooking.confirmSuccess).toBeVisible({
        timeout: 15_000,
      });
    });

    await test.step("Встреча появилась в «Ближайших» у гостя", async () => {
      await guestBooking.openMyMeetings();
      await expect(guestBooking.upcomingMeeting(host.user.name)).toBeVisible({
        timeout: 15_000,
      });
    });

    await test.step("Гость пытается отменить встречу", async () => {
      await guestBooking.cancelMeeting(host.user.name);
    });

    await test.step("Сервис отказывает: до начала меньше двух часов", async () => {
      await expect(guestBooking.cancelError).toBeVisible();
    });

    await test.step("Встреча осталась в «Ближайших»", async () => {
      await expect(guestBooking.upcomingMeeting(host.user.name)).toBeVisible();
      await expect(guestBooking.pastMeeting(host.user.name)).toHaveCount(0);
    });

    const hostBooking = new BookingPage(host.page);

    await test.step("У хоста встреча тоже осталась активной", async () => {
      await hostBooking.openMyMeetings();
      await expect(hostBooking.upcomingMeeting(guest.user.name)).toBeVisible({
        timeout: 15_000,
      });
    });
  });
});
