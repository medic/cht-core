// WebdriverIO's built-in throttling leaks a CDP session per call, so a stale `offline` can override `online`.
// It also depends on Puppeteer, which fails on the minimum Chrome version. Chromedriver has neither problem.

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

const throttleNetwork = async (params) => {
  const conditions = typeof params === 'string' ? NETWORK_PRESETS[params] : params;
  if (!conditions) {
    throw new Error(`Invalid network preset "${params}"`);
  }

  await browser.setNetworkConditions({
    offline: conditions.offline,
    latency: conditions.latency,
    download_throughput: conditions.downloadThroughput,
    upload_throughput: conditions.uploadThroughput,
  });
};

module.exports = { throttleNetwork };
