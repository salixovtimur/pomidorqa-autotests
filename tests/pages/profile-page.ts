import { type Locator, type Page } from "@playwright/test";
import { ROUTES } from "../helpers/user";

export type SkillType = "can_help" | "want_to_learn";

export class ProfilePage {
  readonly nameInput: Locator;
  readonly telegramInput: Locator;
  readonly timezoneSelect: Locator;
  readonly bioInput: Locator;
  readonly saveButton: Locator;
  readonly skillInput: Locator;
  readonly skillTypeSelect: Locator;
  readonly addSkillButton: Locator;
  readonly canHelpSkills: Locator;
  readonly skillChips: Locator;

  constructor(readonly page: Page) {
    this.nameInput = page.getByLabel("Имя");
    this.telegramInput = page.getByLabel("Telegram");
    this.timezoneSelect = page.getByLabel("Часовой пояс");
    this.bioInput = page.getByLabel("О себе");
    this.saveButton = page.getByRole("button", { name: "Сохранить" });
    this.skillInput = page.locator("#pomidorqa-profile-skill-input");
    this.skillTypeSelect = page.locator("#pomidorqa-profile-skill-type");
    this.addSkillButton = page.getByRole("button", { name: "Добавить" });
    this.canHelpSkills = page.getByTestId("can-help-skills");
    this.skillChips = page.locator("[data-skill-tag]");
  }

  skillChip(tag: string): Locator {
    return this.page.locator(`[data-skill-tag="${tag}"]`);
  }

  skillsSection(type: SkillType): Locator {
    return this.page.locator(`[data-skills="${type}"]`);
  }

  skillChipIn(type: SkillType, tag: string): Locator {
    return this.skillsSection(type).locator(`[data-skill-tag="${tag}"]`);
  }

  skillRemoveButton(tag: string): Locator {
    return this.page.getByRole("button", { name: `Убрать ${tag}` });
  }

  async open() {
    await this.page.goto(ROUTES.profile);
  }

  async reload() {
    await this.page.reload();
  }

  async isNameValid(): Promise<boolean> {
    return this.nameInput.evaluate((input) =>
      (input as unknown as { checkValidity(): boolean }).checkValidity()
    );
  }

  async fillBio(bio: string) {
    await this.bioInput.fill(bio);
  }

  async selectTimezone(timezone: string) {
    await this.timezoneSelect.selectOption(timezone);
  }

  async save() {
    const saved = this.profileSubmitted();
    await this.saveButton.click();
    await saved;
  }

  async addSkill(tag: string, type: SkillType) {
    await this.submitSkill(tag, type);
    await this.skillChip(tag).first().waitFor({ state: "visible" });
  }

  async submitSkill(tag: string, type: SkillType) {
    const submitted = this.profileSubmitted();
    await this.skillInput.fill(tag);
    await this.skillTypeSelect.selectOption(type);
    await this.addSkillButton.click();
    await submitted;
  }

  async removeSkill(tag: string) {
    const removed = this.profileSubmitted();
    await this.skillRemoveButton(tag).first().click();
    await removed;
  }

  private profileSubmitted() {
    return this.page.waitForResponse(
      (response) =>
        response.url().endsWith(ROUTES.profile) && response.request().method() === "POST"
    );
  }
}
