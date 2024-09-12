const sharp = require('sharp');

const MOBILE_WIDTH = 320;
const MOBILE_HEIGHT = 570;
const DESKTOP_WIDTH = 1000;
const DESKTOP_HEIGHT = 820;

const isMobile = async () => {
  const { width } = await browser.getWindowSize();
  return width < 768;
};

const resizeWindowForScreenshots = async () => {
  if (await isMobile()) {
    await browser.emulateDevice({
      viewport: {
        width: MOBILE_WIDTH,
        height: MOBILE_HEIGHT,
        isMobile: true,
        hasTouch: true,
      },
      userAgent: 'my custom user agent'
    });
  } else {
    await browser.setWindowSize(DESKTOP_WIDTH, DESKTOP_HEIGHT);
  }
};

const generateScreenshot = async (scenario, step) => {
  const isCI = process.env.CI === 'true';
  if (!isCI) {
    const device = await isMobile() ? 'mobile' : 'desktop';

    const filename = `./${scenario}_${step}_${device}.png`;

    const fullScreenshotBuffer = Buffer.from(await browser.takeScreenshot(), 'base64');
    let extractWidth;
    let extractHeight;
    let screenshotSharp = sharp(fullScreenshotBuffer);

    const metadata = await screenshotSharp.metadata();

    if (await isMobile()) {
      extractWidth = Math.min(MOBILE_WIDTH, metadata.width);
      extractHeight = Math.min(MOBILE_HEIGHT, metadata.height);
      screenshotSharp = screenshotSharp.extract({
        width: extractWidth,
        height: extractHeight,
        left: 0,
        top: 0
      });
    } else {
      extractWidth = Math.min(DESKTOP_WIDTH, metadata.width);
      extractHeight = Math.min(DESKTOP_HEIGHT, metadata.height);
    }

    // Resize the image to 2x for high-density displays
    screenshotSharp = screenshotSharp.resize(extractWidth * 2, extractHeight * 2);

    await screenshotSharp.toFile(filename);
  }
};

module.exports = {
  resizeWindowForScreenshots,
  generateScreenshot,
};
