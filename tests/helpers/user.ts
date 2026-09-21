import { type Browser, type BrowserContext, type Page } from "@playwright/test";

export const ROUTES = {
  home: "/pomidorqa",
  profile: "/pomidorqa/profile",
  slots: "/pomidorqa/profile/slots",
  bookings: "/pomidorqa/bookings",
  register: "/pomidorqa/auth/register",
  login: "/pomidorqa/auth/login",
  accounts: "/api/pomidorqa/test/accounts",
};

export type TestUser = {
  name: string;
  email: string;
  password: string;
};

export type ApiUser = {
  user: TestUser;
  context: BrowserContext;
  page: Page;
};

export type GuestSession = {
  context: BrowserContext;
  page: Page;
};

export function uniqueTag(prefix: string, runId: number): string {
  return `${prefix}-${runId}-${Math.random().toString(36).slice(2, 8)}`;
}

export function makeUser(role: string, runId: number): TestUser {
  const unique = uniqueTag(role, runId);
  return {
    name: `${role} Автотест ${unique}`,
    email: `${unique}@example.com`,
    password: "testpass123",
  };
}

export async function registerUserViaApi(
  context: BrowserContext,
  user: TestUser
): Promise<TestUser> {
  const response = await context.request.post(ROUTES.accounts, { data: user });
  if (response.status() !== 201) {
    throw new Error(
      `Создание ${user.email} не удалось: ${response.status()} ${await response.text()}`
    );
  }
  return user;
}

const ALREADY_GONE = [401, 404, 410];

export async function deleteCurrentTestUser(context: BrowserContext): Promise<void> {
  const response = await context.request.delete(ROUTES.accounts);
  if (response.status() === 200 || ALREADY_GONE.includes(response.status())) {
    return;
  }
  throw new Error(`Удаление аккаунта не удалось: ${response.status()} ${await response.text()}`);
}

async function hasSession(context: BrowserContext): Promise<boolean> {
  return (await context.cookies()).some((cookie) => cookie.name === "pomidorqa_session");
}

export async function deleteUserAfterSignupForm(
  context: BrowserContext,
  submitted: boolean,
  expectedRejection: boolean
): Promise<void> {
  if (await hasSession(context)) {
    await deleteCurrentTestUser(context);
    return;
  }
  if (submitted && !expectedRejection) {
    throw new Error(
      "Форма регистрации отправлена, но сессии в контексте нет: убрать участника нечем. " +
        "Если аккаунт всё-таки создался, он останется на стенде — проверь вручную."
    );
  }
}

type PooledUser = {
  context: BrowserContext;
  accountCreated: boolean;
};

export class UserPool {
  private created: PooledUser[] = [];

  async add(browser: Browser, role: string, runId: number, startUrl?: string): Promise<ApiUser> {
    const context = await browser.newContext();
    const pooled: PooledUser = { context, accountCreated: false };
    this.created.push(pooled);

    const user = await registerUserViaApi(context, makeUser(role, runId));
    pooled.accountCreated = true;

    const page = await context.newPage();
    await page.goto(startUrl ?? ROUTES.home);
    return { user, context, page };
  }

  async addGuest(browser: Browser, startUrl?: string): Promise<GuestSession> {
    const context = await browser.newContext();
    this.created.push({ context, accountCreated: false });

    const page = await context.newPage();
    await page.goto(startUrl ?? ROUTES.home);
    return { context, page };
  }

  expectAccountFrom(context: BrowserContext): void {
    const pooled = this.created.find((item) => item.context === context);
    if (!pooled) {
      throw new Error("Контекст не заводился этим пулом — уборка за ним не настроена.");
    }
    pooled.accountCreated = true;
  }

  async cleanup(): Promise<void> {
    const batch = this.created.splice(0);
    const results = await Promise.allSettled(
      batch.map(async (pooled) => {
        try {
          if (pooled.accountCreated) {
            await deleteCurrentTestUser(pooled.context);
          }
        } finally {
          await pooled.context.close();
        }
      })
    );
    const failed = results.filter((result) => result.status === "rejected");
    if (failed.length > 0) {
      throw new Error(`Не убрали за собой: ${failed.map((result) => result.reason).join("; ")}`);
    }
  }
}

export function dateInDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
