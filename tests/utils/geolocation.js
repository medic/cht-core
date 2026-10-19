/**
 * Reliable geolocation override that reuses a single CDP session.
 *
 * Stubbing GeolocationService's JS-level currentPromise/currentHandle (window.CHTCore.Geolocation)
 * only fakes the UI-feedback path. The value actually written to a saved doc comes from a fresh
 * navigator.geolocation.watchPosition() call made by GeolocationService.init(), which the app
 * re-runs on every form load - so a JS-level stub set before navigating gets overwritten by the
 * real watcher before submit. Overriding at the CDP/browser-engine level instead means every
 * subsequent watchPosition() call - real or re-subscribed - resolves with the same mock position.
 */

let cdpSession;

const getSession = async () => {
  if (cdpSession?.connection()) {
    return cdpSession;
  }
  const puppeteer = await browser.getPuppeteer();
  const [page] = await puppeteer.pages();
  cdpSession = await page.target().createCDPSession();
  return cdpSession;
};

const getFreshSession = () => {
  cdpSession = null;
  return getSession();
};

const setGeolocation = async ({ latitude, longitude, accuracy = 1 }) => {
  try {
    const session = await getSession();
    await session.send('Emulation.setGeolocationOverride', { latitude, longitude, accuracy });
  } catch {
    const session = await getFreshSession();
    await session.send('Emulation.setGeolocationOverride', { latitude, longitude, accuracy });
  }
};

module.exports = { setGeolocation };
