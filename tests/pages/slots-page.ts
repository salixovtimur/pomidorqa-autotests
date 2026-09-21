import { type Locator, type Page } from "@playwright/test";
import { ROUTES } from "../helpers/user";

export class SlotsPage {
  readonly dateInput: Locator;
  readonly timeInput: Locator;
  readonly addSlotButton: Locator;
  readonly slotCards: Locator;
  readonly formError: Locator;

  constructor(readonly page: Page) {
    this.dateInput = page.locator("#pomidorqa-slots-date");
    this.timeInput = page.locator("#pomidorqa-slots-time");
    this.addSlotButton = page.getByRole("button", { name: "Добавить слот" });
    this.slotCards = page.locator("[data-slot-id]");
    this.formError = page.getByTestId("AddSlotForm-form").getByRole("alert");
  }

  slotCard(time: string): Locator {
    return this.slotCards.filter({ hasText: time });
  }

  slotDeleteButton(time: string): Locator {
    return this.slotCard(time).getByRole("button", { name: "Удалить" });
  }

  async open() {
    await this.page.goto(ROUTES.slots);
  }

  async reload() {
    await this.page.reload();
  }

  async addSlot(date: string, time: string) {
    await this.submitSlot(date, time);
    await this.slotCard(time).first().waitFor({ state: "visible" });
  }

  async submitSlot(date: string, time: string) {
    const submitted = this.slotsSubmitted();
    await this.dateInput.fill(date);
    await this.timeInput.fill(time);
    await this.addSlotButton.click();
    await submitted;
  }

  async fillSlotForm(date: string, time: string) {
    await this.dateInput.fill(date);
    await this.timeInput.fill(time);
  }

  async isSlotFormValid(): Promise<boolean> {
    return this.dateInput.evaluate((input) =>
      (input as unknown as { checkValidity(): boolean }).checkValidity()
    );
  }

  async deleteSlot(time: string) {
    const deleted = this.slotsSubmitted();
    await this.slotDeleteButton(time).click();
    await deleted;
  }

  private slotsSubmitted() {
    return this.page.waitForResponse(
      (response) => response.url().endsWith(ROUTES.slots) && response.request().method() === "POST"
    );
  }
}
