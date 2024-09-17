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

  const filename = `./documentation/${scenario}_${step}_${device}.png`;

  const fullScreenshotBuffer = Buffer.from(await browser.takeScreenshot(), 'base64');
  let extractWidth;
  let extractHeight;
  let screenshotSharp = sharp(fullScreenshotBuffer);

  const metadata = await screenshotSharp.metadata();

  if (await isMobile()) {
    extractWidth = Math.min(MOBILE_VIEWPORT_WIDTH, metadata.width);
    extractHeight = Math.min(MOBILE_VIEWPORT_HEIGHT, metadata.height);
    screenshotSharp = screenshotSharp.extract({
      width: extractWidth,
      height: extractHeight,
      left: 0,
      top: 0
    });
  } else {
    extractWidth = Math.min(DESKTOP_WINDOW_WIDTH, metadata.width);
    extractHeight = Math.min(DESKTOP_WINDOW_HEIGHT, metadata.height);
  }

  screenshotSharp = screenshotSharp
    .resize(extractWidth * HIGH_DENSITY_DISPLAY_2X,
      extractHeight * HIGH_DENSITY_DISPLAY_2X);

  await screenshotSharp.toFile(filename);
};

module.exports = {
  resizeWindowForScreenshots,
  generateScreenshot,
};
