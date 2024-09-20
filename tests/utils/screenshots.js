/**
 * This file uses the `sharp` library for image manipulation to overcome limitations
 * in WebdriverIO's native screenshot and window resizing capabilities.
 *
 * WebdriverIO's `setWindowSize` function has a minimum width of 500px,
 * which is insufficient for capturing mobile screenshots.
 * And the `takeScreenshot` captures the entire window size, not just the viewport.
 *
 * To address this, we capture the screenshot using WebdriverIO and then use
 * `sharp` to resize the image to match the desired viewport size. This ensures
 * that our screenshots accurately represent the mobile view of the application.
 */
const sharp = require('sharp');

const MOBILE_WINDOW_WIDTH = 768;
const MOBILE_VIEWPORT_WIDTH = 320;
const MOBILE_VIEWPORT_HEIGHT = 570;
const DESKTOP_WINDOW_WIDTH = 1000;
const DESKTOP_WINDOW_HEIGHT = 820;
const HIGH_DENSITY_DISPLAY_2X = 2;

const isMobile = async () => {
  const { width } = await browser.getWindowSize();
  return width < MOBILE_WINDOW_WIDTH;
};

const resizeWindowForScreenshots = async () => {
  if (await isMobile()) {
    await browser.emulateDevice({
      viewport: {
        width: MOBILE_VIEWPORT_WIDTH,
        height: MOBILE_VIEWPORT_HEIGHT,
        isMobile: true,
        hasTouch: true,
      },
      userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 4) ' +
      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/92.0.4515.159 Mobile Safari/537.36'
    });
  } else {
    await browser.setWindowSize(DESKTOP_WINDOW_WIDTH, DESKTOP_WINDOW_HEIGHT);
  }
};

const generateScreenshot = async (scenario, step) => {
  const device = await isMobile() ? 'mobile' : 'desktop';

  const filename = `./tests/e2e/visual/images/${scenario}-${step}-${device}.png`;

  const newScreenshot = await browser.takeScreenshot();
  let screenshotSharp = sharp(Buffer.from(newScreenshot, 'base64'));
  const metadata = await screenshotSharp.metadata();

  const isMobileDevice = await isMobile();
  const extractWidth = Math.min(isMobileDevice ? MOBILE_VIEWPORT_WIDTH : DESKTOP_WINDOW_WIDTH, metadata.width);
  const extractHeight = Math.min(isMobileDevice ? MOBILE_VIEWPORT_HEIGHT : DESKTOP_WINDOW_HEIGHT, metadata.height);
  screenshotSharp = screenshotSharp.extract({
    width: extractWidth,
    height: extractHeight,
    left: 0,
    top: 0,
  });

  screenshotSharp = screenshotSharp.resize(
      extractWidth * HIGH_DENSITY_DISPLAY_2X,
      extractHeight * HIGH_DENSITY_DISPLAY_2X
  );

  await screenshotSharp.toFile(filename);
};

module.exports = {
  resizeWindowForScreenshots,
  generateScreenshot,
};
