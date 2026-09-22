import { test, expect } from "@playwright/test";
import { ROUTES, UserPool, uniqueTag } from "../helpers/user";
import { tomorrowAt } from "../helpers/slot-time";
import { ProfilePage } from "../pages/profile-page";
import { SlotsPage } from "../pages/slots-page";
import { BookingPage } from "../pages/booking-page";

test.describe("Бронирование: отмена встречи", () => {
  const users = new UserPool();

  test.afterEach(async () => {
    await users.cleanup();
  });

  test("отменённую гостем встречу видят обе стороны", async ({ browser }) => {
    const runId = Date.now();
    const skillTag = uniqueTag("Playwright-cancel", runId);
    const slot = tomorrowAt("12:00");

    const [host, guest] =
      await test.step("Заводим через API хоста на его профиле и гостя в каталоге", async () => [
        await users.add(browser, "cancelhost", runId, ROUTES.profile),
        await users.add(browser, "cancelguest", runId, ROUTES.home),
      ]);

    const hostProfile = new ProfilePage(host.page);
    const hostSlots = new SlotsPage(host.page);
    const hostBooking = new BookingPage(host.page);
    const guestBooking = new BookingPage(guest.page);

    await test.step("Хост добавляет навык «могу помочь»", async () => {
      await hostProfile.addSkill(skillTag, "can_help");
    });

    await test.step("Навык появился в блоке «могу помочь»", async () => {
      await expect(hostProfile.canHelpSkills).toContainText(skillTag);
    });

    await test.step("Хост выкладывает свободный слот на завтра", async () => {
      await hostSlots.open();
      await hostSlots.addSlot(slot.date, slot.time);
    });

    await test.step("Слот появился в списке хоста", async () => {
      await expect(hostSlots.slotCards).toHaveCount(1);
    });

    await test.step("Гость находит хоста по навыку и бронирует его слот", async () => {
      await guestBooking.findPerson(skillTag, host.user.name);
      await guestBooking.openPersonCard(host.user.name);
      await guestBooking.openFirstSlot();
      await guestBooking.confirmBooking();
    });

    await test.step("Бронирование подтвердилось", async () => {
      await expect(guestBooking.confirmSuccess).toBeVisible({
        timeout: 15_000,
      });
    });

    await test.step("Гость открывает «Мои встречи»", async () => {
      await guestBooking.openMyMeetings();
    });

    await test.step("Встреча с хостом видна в «Ближайших»", async () => {
      await expect(guestBooking.upcomingMeeting(host.user.name)).toBeVisible({
        timeout: 10_000,
      });
    });

    await test.step("Гость отменяет встречу", async () => {
      await guestBooking.cancelMeeting(host.user.name);
    });

    await test.step("Карточка ушла из «Ближайших» в «Прошедшие и отменённые»", async () => {
      await expect(guestBooking.pastMeeting(host.user.name)).toContainText("отменено");
      await expect(guestBooking.upcomingMeeting(host.user.name)).toHaveCount(0);
    });

    await test.step("Гость перезагружает страницу", async () => {
      await guestBooking.reload();
    });

    await test.step("После перезагрузки отмена никуда не делась", async () => {
      await expect(guestBooking.pastMeeting(host.user.name)).toContainText("отменено");
      await expect(guestBooking.upcomingMeeting(host.user.name)).toHaveCount(0);
    });

    await test.step("Хост открывает «Мои встречи»", async () => {
      await hostBooking.openMyMeetings();
    });

    await test.step("Хост видит отменённую встречу в «Прошедших»", async () => {
      await expect(hostBooking.pastMeeting(guest.user.name)).toBeVisible({
        timeout: 10_000,
      });
    });

    await test.step("Хост перезагружает страницу", async () => {
      await hostBooking.reload();
    });

    await test.step("После перезагрузки хост видит встречу отменённой, с именем гостя", async () => {
      await expect(hostBooking.pastMeeting(guest.user.name)).toContainText("отменено");
      await expect(hostBooking.upcomingMeeting(guest.user.name)).toHaveCount(0);
    });
  });

  test("хост отменяет встречу, и слот достаётся другому участнику", async ({ browser }) => {
    const runId = Date.now();
    const skillTag = uniqueTag("Hostcancel", runId);
    const slot = tomorrowAt("13:30");

    const [host, first, second] =
      await test.step("Заводим через API хоста и двух гостей", async () => [
        await users.add(browser, "hostcancel", runId, ROUTES.profile),
        await users.add(browser, "firstguest", runId, ROUTES.home),
        await users.add(browser, "secondguest", runId, ROUTES.home),
      ]);

    const hostProfile = new ProfilePage(host.page);
    const hostSlots = new SlotsPage(host.page);
    const hostBooking = new BookingPage(host.page);
    const firstBooking = new BookingPage(first.page);
    const secondBooking = new BookingPage(second.page);

    await test.step("Хост объявляет навык и выкладывает слот", async () => {
      await hostProfile.addSkill(skillTag, "can_help");
      await hostSlots.open();
      await hostSlots.addSlot(slot.date, slot.time);
    });

    await test.step("Первый гость бронирует слот", async () => {
      await firstBooking.findPerson(skillTag, host.user.name);
      await firstBooking.openPersonCard(host.user.name);
      await firstBooking.openFirstSlot();
      await firstBooking.confirmBooking();
      await expect(firstBooking.confirmSuccess).toBeVisible({
        timeout: 15_000,
      });
    });

    await test.step("Хост видит встречу в «Ближайших» и отменяет её сам", async () => {
      await hostBooking.openMyMeetings();
      await expect(hostBooking.upcomingMeeting(first.user.name)).toBeVisible({
        timeout: 15_000,
      });
      await hostBooking.cancelMeeting(first.user.name);
    });

    await test.step("Встреча отменена у хоста", async () => {
      await expect(hostBooking.pastMeeting(first.user.name)).toContainText("отменено");
      await expect(hostBooking.upcomingMeeting(first.user.name)).toHaveCount(0);
    });

    await test.step("Первый гость тоже видит отмену", async () => {
      await firstBooking.openMyMeetings();
      await expect(firstBooking.pastMeeting(host.user.name)).toContainText("отменено");
    });

    await test.step("Освободившийся слот бронирует второй гость", async () => {
      await secondBooking.findPerson(skillTag, host.user.name);
      await secondBooking.openPersonCard(host.user.name);
      await secondBooking.openFirstSlot();
      await secondBooking.confirmBooking();
      await expect(secondBooking.confirmSuccess).toBeVisible({
        timeout: 15_000,
      });
    });

    await test.step("Встреча со вторым гостем появилась у хоста", async () => {
      await hostBooking.openMyMeetings();
      await expect(hostBooking.upcomingMeeting(second.user.name)).toBeVisible({
        timeout: 15_000,
      });
    });
  });
});
