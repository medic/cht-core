// browser-check-util.service.ts

import { BrowserDetectorService } from './browser-detector.service';

export function isBlockedChromeBrowser(): boolean {
  const parser = BrowserDetectorService.getBowserParser();
  const browserInfo = parser.getBrowser();

  console.log('Detected browser:', browserInfo.name, 'Version:', browserInfo.version);

  if (browserInfo.name === 'Chrome' && browserInfo.version) {
    const majorVersion = parseInt(browserInfo.version.split('.')[0]);
    console.log('Major version:', majorVersion);
    return majorVersion < 78;
  }
  return false;
}
