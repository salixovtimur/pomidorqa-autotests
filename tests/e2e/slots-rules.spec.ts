import { test, expect } from "@playwright/test";
import { ROUTES, uniqueTag, UserPool } from "../helpers/user";
import { tomorrowAt, yesterdayDate } from "../helpers/slot-time";
import { BookingPage } from "../pages/booking-page";
import { ProfilePage } from "../pages/profile-page";
import { SlotsPage } from "../pages/slots-page";

test.describe("Слоты: правила создания и удаления", () => {
  const users = new UserPool();

  test.afterEach(async () => {
    await users.cleanup();
  });

  test("форма не принимает дату в прошлом", async ({ browser }) => {
    const runId = Date.now();

    const owner = await test.step("Заводим через API участника на странице слотов", () =>
      users.add(browser, "pastslot", runId, ROUTES.slots));

    const slots = new SlotsPage(owner.page);

    await test.step("Участник заполняет форму вчерашней датой и жмёт «Добавить слот»", async () => {
      await slots.fillSlotForm(yesterdayDate(), "10:00");
      await slots.addSlotButton.click();
    });

    await test.step("Браузер считает дату невалидной и форму не отправляет", async () => {
      expect(await slots.isSlotFormValid()).toBe(false);
    });

    await test.step("Слот на вчера не создан, а на завтра — создаётся", async () => {
      await slots.reload();
      await expect(slots.slotCards).toHaveCount(0);
      const valid = tomorrowAt("10:00");
      await slots.addSlot(valid.date, valid.time);
      await expect(slots.slotCards).toHaveCount(1);
    });
  });

  test("свой свободный слот удаляется, соседний остаётся на месте", async ({ browser }) => {
    const runId = Date.now();
    const first = tomorrowAt("09:00");
    const second = tomorrowAt("10:00");

    const owner = await test.step("Заводим через API участника на странице слотов", () =>
      users.add(browser, "freeslot", runId, ROUTES.slots));

    const slots = new SlotsPage(owner.page);

    await test.step("Участник выкладывает два свободных слота", async () => {
      await slots.addSlot(first.date, first.time);
      await slots.addSlot(second.date, second.time);
    });

    await test.step("Оба слота в списке", async () => {
      await expect(slots.slotCards).toHaveCount(2);
    });

    await test.step("Участник удаляет первый слот", async () => {
      await slots.deleteSlot(first.time);
    });

    await test.step("После перезагрузки остался только второй", async () => {
      await slots.reload();
      await expect(slots.slotCards).toHaveCount(1);
      await expect(slots.slotCard(second.time)).toBeVisible();
      await expect(slots.slotCard(first.time)).toHaveCount(0);
    });
  });

  test("забронированный слот удалить нельзя", async ({ browser }) => {
    const runId = Date.now();
    const skillTag = uniqueTag("Booked", runId);
    const slot = tomorrowAt("14:00");

    const host = await test.step("Заводим через API хоста на его профиле", () =>
      users.add(browser, "bookedhost", runId, ROUTES.profile));

    const hostProfile = new ProfilePage(host.page);
    const hostSlots = new SlotsPage(host.page);

    await test.step("Хост объявляет навык и выкладывает слот", async () => {
      await hostProfile.addSkill(skillTag, "can_help");
      await hostSlots.open();
      await hostSlots.addSlot(slot.date, slot.time);
    });

    await test.step("Пока слот свободен, у него есть кнопка удаления", async () => {
      await expect(hostSlots.slotDeleteButton(slot.time)).toBeVisible();
    });

    const guest = await test.step("Заводим через API гостя в каталоге", () =>
      users.add(browser, "bookedguest", runId));

    const guestBooking = new BookingPage(guest.page);

    await test.step("Гость находит хоста и бронирует его слот", async () => {
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

    await test.step("У хоста слот остался, но удалить его больше нечем", async () => {
      await hostSlots.reload();
      await expect(hostSlots.slotCard(slot.time)).toBeVisible();
      await expect(hostSlots.slotDeleteButton(slot.time)).toHaveCount(0);
    });
  });
});
