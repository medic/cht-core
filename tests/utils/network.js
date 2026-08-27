/**
 * Reliable network throttling that reuses a single CDP session.
 *
 * WebdriverIO's built-in `throttleNetwork`/`throttle` creates a fresh, undetached CDP session on
 * every call and sends `Network.emulateNetworkConditions` to it. That condition is scoped to the
 * session, so a leaked `offline` session can keep overriding a later `online` call made on a
 * different session, leaving the renderer stuck offline. Replication then fails with
 * "Failed to fetch" (status 0) and the requests never reach the server.
 *
 * Reusing one session guarantees `online` overrides `offline` on the same network agent.
 */

// Mirrors WebdriverIO's presets (node_modules/webdriverio/build/commands/browser/throttleNetwork.js).
const KB = 1024 / 8;
const MB = 1024 * 1024 / 8;
const NETWORK_PRESETS = {
  offline: { offline: true, downloadThroughput: 0, uploadThroughput: 0, latency: 1 },
  GPRS: { offline: false, downloadThroughput: 50 * KB, uploadThroughput: 20 * KB, latency: 500 },
  Regular2G: { offline: false, downloadThroughput: 250 * KB, uploadThroughput: 50 * KB, latency: 300 },
  Good2G: { offline: false, downloadThroughput: 450 * KB, uploadThroughput: 150 * KB, latency: 150 },
  Regular3G: { offline: false, downloadThroughput: 750 * KB, uploadThroughput: 250 * KB, latency: 100 },
  Good3G: { offline: false, downloadThroughput: 1.5 * MB, uploadThroughput: 750 * KB, latency: 40 },
  Regular4G: { offline: false, downloadThroughput: 4 * MB, uploadThroughput: 3 * MB, latency: 20 },
  DSL: { offline: false, downloadThroughput: 2 * MB, uploadThroughput: 1 * MB, latency: 5 },
  WiFi: { offline: false, downloadThroughput: 30 * MB, uploadThroughput: 15 * MB, latency: 2 },
  online: { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 },
};

let cdpSession;

const getSession = async () => {
  // A session reload (browser.reloadSession / full navigation) detaches the CDP session; rebuild it.
  if (cdpSession && cdpSession.connection()) {
    return cdpSession;
  }
  const puppeteer = await browser.getPuppeteer();
  const [page] = await puppeteer.pages();
  cdpSession = await page.target().createCDPSession();
  await cdpSession.send('Network.enable');
  return cdpSession;
};

const throttleNetwork = async (params) => {
  const conditions = typeof params === 'string' ? NETWORK_PRESETS[params] : params;
  if (!conditions) {
    throw new Error(`Invalid network preset "${params}"`);
  }

  try {
    const session = await getSession();
    await session.send('Network.emulateNetworkConditions', conditions);
  } catch {
    // The cached session can become unusable after a reload; drop it and retry once with a fresh one.
    cdpSession = null;
    const session = await getSession();
    await session.send('Network.emulateNetworkConditions', conditions);
  }
};

module.exports = { throttleNetwork };
