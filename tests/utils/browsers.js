const os = require('node:os');
const path = require('node:path');
const { Browser, BrowserPlatform, Cache, detectBrowserPlatform, install } = require('@puppeteer/browsers');

// Single source of truth for the browsers the e2e tests run against.
// LATEST is a Chrome for Testing version: https://googlechromelabs.github.io/chrome-for-testing/
// MINIMUM predates Chrome for Testing (113), so it's a Chromium snapshot build: https://chromiumdash.appspot.com/
const LATEST_CHROME_VERSION = '157.0.8103.78';
const MINIMUM_CHROME = {
  major: '107',
  chromiumBuild: '1047731',
};

const SNAPSHOTS_URL = 'https://storage.googleapis.com/chromium-browser-snapshots/Linux_x64';
const CACHE_DIR = process.env.WEBDRIVER_CACHE_DIR || path.join(os.homedir(), '.cache', 'cht-wdio-browsers');
const CHROMIUM_EXECUTABLE = path.join('chrome-linux', 'chrome');
const CHROMEDRIVER_EXECUTABLE = path.join('chromedriver_linux64', 'chromedriver');

const isMinimumChromeVersion = process.env.CHROME_VERSION === MINIMUM_CHROME.major;

const snapshotChromedriverProvider = {
  getName: () => 'ChromiumSnapshotChromedriver',
  supports: ({ browser, platform }) => browser === Browser.CHROMEDRIVER && platform === BrowserPlatform.LINUX,
  getDownloadUrl: ({ buildId }) => new URL(`${SNAPSHOTS_URL}/${buildId}/chromedriver_linux64.zip`),
  getExecutablePath: () => CHROMEDRIVER_EXECUTABLE,
};

const minimumExecutablePath = (browser, executable) => {
  const installDir = new Cache(CACHE_DIR).installationDir(browser, BrowserPlatform.LINUX, MINIMUM_CHROME.chromiumBuild);
  return path.join(installDir, executable);
};

const installMinimumBrowser = async () => {
  if (detectBrowserPlatform() !== BrowserPlatform.LINUX) {
    throw new Error(`Chrome ${MINIMUM_CHROME.major} tests are only supported on Linux x64`);
  }
  const options = { cacheDir: CACHE_DIR, platform: BrowserPlatform.LINUX, buildId: MINIMUM_CHROME.chromiumBuild };
  await install({ ...options, browser: Browser.CHROMIUM });
  await install({ ...options, browser: Browser.CHROMEDRIVER, providers: [snapshotChromedriverProvider] });
};

const capabilities = () => {
  if (isMinimumChromeVersion) {
    return {
      browserName: 'chrome',
      binary: minimumExecutablePath(Browser.CHROMIUM, CHROMIUM_EXECUTABLE),
      chromedriverOptions: { binary: minimumExecutablePath(Browser.CHROMEDRIVER, CHROMEDRIVER_EXECUTABLE) },
    };
  }
  return {
    browserName: 'chrome',
    browserVersion: LATEST_CHROME_VERSION,
    chromedriverOptions: { cacheDir: CACHE_DIR },
  };
};

module.exports = {
  LATEST_CHROME_VERSION,
  MINIMUM_CHROME,
  CACHE_DIR,
  isMinimumChromeVersion,
  installMinimumBrowser,
  capabilities,
};
