import { type Locator, type Page } from "@playwright/test";
import { ROUTES } from "../helpers/user";

export class BookingPage {
  readonly catalogFilterInput: Locator;
  readonly catalogFilterButton: Locator;
  readonly catalogEmptyMessage: Locator;
  readonly personCards: Locator;
  readonly personName: Locator;
  readonly calendarDays: Locator;
  readonly calendarTimes: Locator;
  readonly calendarTimezoneHint: Locator;
  readonly calendarEmptyMessage: Locator;
  readonly confirmDialog: Locator;
  readonly confirmButton: Locator;
  readonly confirmDismissButton: Locator;
  readonly confirmSuccess: Locator;
  readonly confirmError: Locator;
  readonly upcomingMeetings: Locator;
  readonly upcomingEmptyMessage: Locator;
  readonly pastMeetings: Locator;
  readonly cancelError: Locator;

  constructor(readonly page: Page) {
    this.catalogFilterInput = page.locator("#pomidorqa-catalog-skill-filter");
    this.catalogFilterButton = page.getByRole("button", { name: "Найти" });
    this.catalogEmptyMessage = page.getByText("Пока никого не нашли по этому фильтру");
    this.personCards = page.getByTestId("person-card");
    this.personName = page.getByRole("heading", { level: 1 });
    this.calendarDays = page.getByRole("group", { name: "Дни со слотами" }).getByRole("button");
    this.calendarTimes = page.getByRole("group", { name: "Время слотов" }).getByRole("button");
    this.calendarTimezoneHint = page.getByTestId("slots-timezone");
    this.calendarEmptyMessage = page.getByText("Сейчас свободных слотов нет");
    this.confirmDialog = page.getByRole("dialog");
    this.confirmButton = this.confirmDialog.getByRole("button", {
      name: "Подтвердить",
    });
    this.confirmDismissButton = this.confirmDialog.getByRole("button", {
      name: "Отмена",
    });
    this.confirmSuccess = this.confirmDialog.getByRole("status");
    this.confirmError = this.confirmDialog.getByRole("alert");
    this.upcomingMeetings = page.getByTestId("upcoming-meetings");
    this.upcomingEmptyMessage = this.upcomingMeetings.getByText("Пока пусто");
    this.pastMeetings = page.locator("section").filter({ hasText: "Прошедшие и отменённые" });
    this.cancelError = page.getByTestId("cancel-error");
  }

  personCard(name: string): Locator {
    return this.personCards.filter({ hasText: name });
  }

  personCardSlots(name: string): Locator {
    return this.personCard(name).getByText(/своб\. слотов/);
  }

  personCardSkills(name: string): Locator {
    return this.personCard(name).locator("[data-skill-tag]");
  }

  calendarTime(time: string): Locator {
    return this.calendarTimes.filter({ hasText: time });
  }

  firstMeetingName(): Locator {
    return this.upcomingMeetings.locator("[data-booking-id]").first().locator("p").first();
  }

  upcomingMeeting(participantName: string): Locator {
    return this.upcomingMeetings.locator("[data-booking-id]").filter({ hasText: participantName });
  }

  pastMeeting(participantName: string): Locator {
    return this.pastMeetings.locator("[data-booking-id]").filter({ hasText: participantName });
  }

  async openCatalog() {
    await this.page.goto(ROUTES.home);
  }

  async searchBySkill(skillTag: string) {
    await this.catalogFilterInput.fill(skillTag);
    await this.catalogFilterButton.click();
  }

  async findPerson(skillTag: string, name: string, timeout = 15_000) {
    const deadline = Date.now() + timeout;

    for (;;) {
      await this.searchBySkill(skillTag);
      if (await this.personCard(name).isVisible()) {
        return;
      }
      if (Date.now() > deadline) {
        await this.personCard(name).waitFor({
          state: "visible",
          timeout: 1_000,
        });
        return;
      }
      await this.page.reload();
    }
  }

  async openPersonCard(name: string) {
    await this.personCard(name).click();
  }

  async openFirstSlot() {
    const deadline = Date.now() + 15_000;

    for (;;) {
      try {
        await this.calendarDays.first().click({ timeout: 5_000 });
        await this.calendarTimes.first().click({ timeout: 5_000 });
        await this.confirmDialog.waitFor({ state: "visible", timeout: 3_000 });
        return;
      } catch (error) {
        if (Date.now() > deadline) {
          throw error;
        }
      }
    }
  }

  async openDayWithSlots() {
    const deadline = Date.now() + 15_000;

    for (;;) {
      try {
        await this.calendarDays.first().click({ timeout: 5_000 });
        await this.calendarTimes.first().waitFor({ state: "visible", timeout: 3_000 });
        return;
      } catch (error) {
        if (Date.now() > deadline) {
          throw error;
        }
      }
    }
  }

  async openSlotAt(time: string) {
    await this.openDayWithSlots();
    await this.calendarTime(time).click();
    await this.confirmDialog.waitFor({ state: "visible" });
  }

  async confirmBooking() {
    await this.confirmButton.click();
  }

  async dismissBooking() {
    await this.confirmDismissButton.click();
    await this.confirmDialog.waitFor({ state: "hidden" });
  }

  async openMyMeetings() {
    await this.page.goto(ROUTES.bookings);
  }

  async cancelMeeting(participantName: string) {
    const cancelled = this.bookingsSubmitted();
    await this.upcomingMeeting(participantName).getByRole("button", { name: "Отменить" }).click();
    await cancelled;
  }

  async reload() {
    await this.page.reload();
  }

  private bookingsSubmitted() {
    return this.page.waitForResponse(
      (response) =>
        response.url().endsWith(ROUTES.bookings) && response.request().method() === "POST"
    );
  }
}
