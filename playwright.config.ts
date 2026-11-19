import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run two real browsers that connect peer to peer through PeerJS's public broker,
// so they need an internet connection. Set PW_CHANNEL=chrome or msedge to use an installed browser.
const channel = process.env.PW_CHANNEL;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5199/',
    ...devices['Pixel 7'],
    locale: 'en-US',
    ...(channel ? { channel } : {}),
    // Headless browsers hide local IPs behind mDNS names that they then cannot resolve,
    // which stops two local peers from finding each other.
    launchOptions: { args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] },
  },
  webServer: {
    command: 'npx vite --port 5199 --strictPort',
    url: 'http://localhost:5199/',
    reuseExistingServer: !process.env.CI,
  },
});
