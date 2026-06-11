// FILE: tests/e2e/cadence-local.spec.ts
import { expect, test, type Page } from "@playwright/test";

async function enterLocalMode(page: Page) {
  await page.goto("/setup");
  await expect(page.getByRole("heading", { name: /choose how/i })).toBeVisible();
  await page.getByRole("button", { name: /continue locally/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: /quick practice/i })).toBeVisible();
}

test.describe("Cadence local UI smoke", () => {
  test("language switcher changes UI chrome to Chinese and persists", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await page.getByRole("button", { name: "中文" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
    await expect(page.getByRole("link", { name: "登录" })).toBeVisible();
    await expect(page.getByRole("link", { name: "注册" })).toBeVisible();
    await expect(page.getByRole("link", { name: "下载" })).toBeVisible();

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
    await expect(page.getByRole("link", { name: "登录" })).toBeVisible();

    await page.goto("/setup");
    await expect(page.getByRole("heading", { name: /选择这个 Cadence 副本/ })).toBeVisible();
    await page.getByRole("button", { name: /继续使用本地模式/ }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: "快速练习" })).toBeVisible();
    await expect(page.getByLabel("语言")).toBeVisible();
  });

  test("local setup opens the dashboard and Quick Practice", async ({ page }) => {
    await enterLocalMode(page);

    await expect(page.getByLabel(/choose a target word/i)).toBeVisible();
    await expect(page.getByText(/aliyun assessment/i)).toBeVisible();
    await expect(page.getByText("public/sdk/engine.js", { exact: true })).toBeVisible();
  });

  test("main dashboard routes render in local mode", async ({ page }) => {
    await enterLocalMode(page);

    const routes = [
      { path: "/learn", text: /modules|module/i },
      { path: "/conversation", text: /conversation|module/i },
      { path: "/coach", text: /coach/i },
      { path: "/just-speak", text: /just speak|speak/i },
      { path: "/dictionary", text: /dictionary/i },
      { path: "/bookmarks", text: /bookmarks/i },
      { path: "/sound-library", text: /sound library|sound/i },
      { path: "/profile", text: /profile|local learner/i },
    ];

    for (const route of routes) {
      await page.goto(route.path);
      await expect(page.locator("body")).toContainText(route.text);
    }
  });

  test("cloud auth pages still show missing Supabase guidance in local browser", async ({ page }) => {
    await enterLocalMode(page);

    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: /start your pronunciation profile/i })).toBeVisible();
    await page.getByLabel(/email/i).fill(`local-mode-${Date.now()}@example.com`);
    await page.getByLabel(/password/i).fill("password123");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.getByText(/add your supabase url/i)).toBeVisible();

    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /sign in to cadence/i })).toBeVisible();
  });

  test("auth forms explain missing Supabase configuration outside local mode", async ({ page, context }) => {
    await context.clearCookies();

    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: /start your pronunciation profile/i })).toBeVisible();
    await page.getByLabel(/email/i).fill(`playwright-${Date.now()}@example.com`);
    await page.getByLabel(/password/i).fill("password123");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.getByText(/add your supabase url/i)).toBeVisible();

    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /sign in to cadence/i })).toBeVisible();
    await page.getByLabel(/email/i).fill("playwright@example.com");
    await page.getByLabel(/password/i).fill("password123");
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await expect(page.getByText(/add your supabase url/i)).toBeVisible();
  });

  test("learning and conversation detail pages open without the speech engine", async ({ page }) => {
    await enterLocalMode(page);

    await page.goto("/learn");
    const firstLearnLink = page.locator('a[href^="/learn/"]').first();
    await expect(firstLearnLink).toBeVisible();
    await firstLearnLink.click();
    await expect(page.locator("body")).toContainText(/lesson|practice|module/i);

    await page.goto("/conversation");
    const firstConversationLink = page.locator('a[href^="/conversation/"]').first();
    await expect(firstConversationLink).toBeVisible();
    await firstConversationLink.click();
    await expect(page.locator("body")).toContainText(/conversation|coach|reply/i);
  });
});
