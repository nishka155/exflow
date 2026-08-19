/**
 * Shared stealth-Chromium factory for carrier scrapers that are behind
 * Cloudflare or Akamai bot detection (Hapag-Lloyd, MSC).
 *
 * Set BROWSER_PROXY to route headless traffic through a proxy —
 * required on datacenter hosts where carrier bot-detection blocks by IP.
 */
import type { BrowserContextOptions } from "playwright";

let stealthApplied = false;

export async function getChromium() {
  if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
    process.env.PLAYWRIGHT_BROWSERS_PATH = "0";
  }
  const { chromium } = (await import("playwright-extra")) as unknown as {
    chromium: {
      use: (plugin: unknown) => void;
      launch: import("playwright").BrowserType["launch"];
    };
  };
  if (!stealthApplied) {
    const stealth = (
      (await import("puppeteer-extra-plugin-stealth")) as unknown as {
        default: () => unknown;
      }
    ).default;
    chromium.use(stealth());
    stealthApplied = true;
  }
  return chromium;
}

export function proxyOptions(): BrowserContextOptions["proxy"] {
  const raw = process.env.BROWSER_PROXY?.trim();
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    const server = `${u.protocol}//${u.hostname}:${u.port}`;
    const username = u.username ? decodeURIComponent(u.username) : undefined;
    const password = u.password ? decodeURIComponent(u.password) : undefined;
    return { server, username, password };
  } catch {
    console.warn("[browser] BROWSER_PROXY is not a valid URL — proxy disabled");
    return undefined;
  }
}
