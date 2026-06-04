/* global window */
const mockConfig = require('../mock-config');

const GEO_SUCCESS = {
  latitude: 1, longitude: 2, altitude: 3, accuracy: 4, altitudeAccuracy: 5, heading: 6, speed: 7
};
const GEO_FAILURE = { code: -2, message: 'Geolocation timeout exceeded' };

describe('cht-form web component - Geolocation Widget', () => {
  it('should render capture button when geolocation is available', async () => {
    await mockConfig.loadForm('default', 'test', 'geolocation-widget');

    const captureBtn = await $('.geolocation-capture-btn');
    await captureBtn.waitForExist();
    expect(await captureBtn.isExisting()).to.be.true;
  });

  it('should show progress bar and remove capture button when capture is started', async () => {
    await mockConfig.loadForm('default', 'test', 'geolocation-widget');

    await browser.execute(() => {
      window.CHTCore.Geolocation = { currentPromise: new Promise(() => {}), retry: () => {} };
    });

    await $('.geolocation-capture-btn').waitForExist();
    await $('.geolocation-capture-btn').click();

    await $('.geolocation-progress-bar').waitForExist();
    expect(await $('.geolocation-capture-btn').isExisting()).to.be.false;
  });

  it('should show success message when GPS is acquired', async () => {
    await mockConfig.loadForm('default', 'test', 'geolocation-widget');

    await browser.execute((geoSuccess) => {
      window.CHTCore.Geolocation = { currentPromise: Promise.resolve(geoSuccess), retry: () => {} };
    }, GEO_SUCCESS);

    await $('.geolocation-capture-btn').waitForExist();
    await $('.geolocation-capture-btn').click();

    await $('.geolocation-success-msg').waitForExist();
    expect(await $('.geolocation-retry-btn').isExisting()).to.be.false;
  });

  it('should show retry and skip buttons when GPS acquisition fails', async () => {
    await mockConfig.loadForm('default', 'test', 'geolocation-widget');

    await browser.execute((geoFailure) => {
      window.CHTCore.Geolocation = { currentPromise: Promise.resolve(geoFailure), retry: () => {} };
    }, GEO_FAILURE);

    await $('.geolocation-capture-btn').waitForExist();
    await $('.geolocation-capture-btn').click();

    await $('.geolocation-retry-btn').waitForExist();
    expect(await $('.geolocation-skip-btn').isExisting()).to.be.true;
    expect(await $('.geolocation-success-msg').isExisting()).to.be.false;
  });
});
