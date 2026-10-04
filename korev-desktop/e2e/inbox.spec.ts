import {
  _electron as electron,
  expect,
  test,
  type Page,
} from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  FAILING_PR_TITLE,
  NEW_PR_TITLE,
  VIEWER_LOGIN,
  startFakeGithub,
} from './fake-github';

const APP_ENTRY = '.vite/build/main.cjs';
const APP_PAGE_PROTOCOL = 'file:';
const FAKE_TOKEN = 'ghp_e2e_fake_token';
const NOTIFICATION_REFRESH_TIMEOUT_MS = 90_000;

test.setTimeout(150_000);

async function appWindow(
  app: Awaited<ReturnType<typeof electron.launch>>,
): Promise<Page> {
  const isAppPage = (page: Page) => page.url().startsWith(APP_PAGE_PROTOCOL);
  const existing = app.windows().find(isAppPage);
  if (existing) return existing;
  return app.waitForEvent('window', { predicate: isAppPage });
}

test('connects with a token, shows My PRs and picks up a change from notifications', async () => {
  const github = await startFakeGithub();
  const userDataDir = await mkdtemp(join(tmpdir(), 'korev-e2e-'));
  const app = await electron.launch({
    args: [APP_ENTRY, '--use-mock-keychain', `--user-data-dir=${userDataDir}`],
    env: {
      ...process.env,
      KOREV_GITHUB_API_URL: github.url,
      KOREV_GITHUB_WEB_URL: github.url,
    },
  });

  try {
    const window = await appWindow(app);
    await window.getByText('Use a personal access token instead').click();
    await window.getByLabel('Personal access token').fill(FAKE_TOKEN);
    await window.getByRole('button', { name: 'Save', exact: true }).click();

    await expect(
      window.getByText(`Connected as @${VIEWER_LOGIN}`),
    ).toBeVisible();
    await window.getByRole('button', { name: /Open inbox/ }).click();

    await window.getByRole('button', { name: /My PRs/ }).click();
    await expect(
      window.getByText('Needs you', { exact: false }).first(),
    ).toBeVisible();
    await expect(window.getByText(FAILING_PR_TITLE)).toBeVisible();

    github.publishNewPr();
    await expect(window.getByText(NEW_PR_TITLE)).toBeVisible({
      timeout: NOTIFICATION_REFRESH_TIMEOUT_MS,
    });
    await expect(
      window.getByText('Ready to merge', { exact: false }).first(),
    ).toBeVisible();
  } finally {
    await app.close();
    await github.close();
    await rm(userDataDir, { recursive: true, force: true });
  }
});
