/* global window */
const mockConfig = require('../mock-config');

const GEO_SUCCESS = {
  latitude: 1, longitude: 2, altitude: 3, accuracy: 4, altitudeAccuracy: 5, heading: 6, speed: 7
};
const GEO_FAILURE = { code: -2, message: 'Geolocation timeout exceeded' };

const selectHomeContext = async () => {
  await $('.geolocation-context-options input[value="home"]').waitForExist();
  await $('.geolocation-context-options input[value="home"]').click();
};

describe('cht-form web component - Geolocation Widget', () => {
  it('should render capture button when geolocation is available', async () => {
    await mockConfig.loadForm('default', 'test', 'geolocation-widget');

    const captureBtn = await $('.geolocation-capture-btn');
    await captureBtn.waitForExist();
    expect(await captureBtn.isExisting()).to.be.true;
  });

  it('should render home and other context options', async () => {
    await mockConfig.loadForm('default', 'test', 'geolocation-widget');

    await $('.geolocation-context-options').waitForExist();
    expect(await $('.geolocation-context-options input[value="home"]').isExisting()).to.be.true;
    expect(await $('.geolocation-context-options input[value="other"]').isExisting()).to.be.true;
  });

  it('should disable capture button until a context option is selected', async () => {
    await mockConfig.loadForm('default', 'test', 'geolocation-widget');

    await $('.geolocation-capture-btn').waitForExist();
    expect(await $('.geolocation-capture-btn').getAttribute('disabled')).to.not.be.null;

    await selectHomeContext();

    expect(await $('.geolocation-capture-btn').getAttribute('disabled')).to.be.null;
  });

  it('should show progress bar and remove capture button when capture is started', async () => {
    await mockConfig.loadForm('default', 'test', 'geolocation-widget');

    await browser.execute(() => {
      window.CHTCore.Geolocation = { currentPromise: new Promise(() => {}), retry: () => {} };
    });

    await selectHomeContext();
    await $('.geolocation-capture-btn').click();

    await $('.geolocation-progress-bar').waitForExist();
    expect(await $('.geolocation-capture-btn').isExisting()).to.be.false;
  });

  it('should hide context options when capture starts', async () => {
    await mockConfig.loadForm('default', 'test', 'geolocation-widget');

    await browser.execute(() => {
      window.CHTCore.Geolocation = { currentPromise: new Promise(() => {}), retry: () => {} };
    });

    await selectHomeContext();
    expect(await $('.geolocation-context-options').isDisplayed()).to.be.true;

    await $('.geolocation-capture-btn').click();

    expect(await $('.geolocation-context-options').isDisplayed()).to.be.false;
  });

  it('should show success message when GPS is acquired', async () => {
    await mockConfig.loadForm('default', 'test', 'geolocation-widget');

    await browser.execute((geoSuccess) => {
      window.CHTCore.Geolocation = { currentPromise: Promise.resolve(geoSuccess), retry: () => {} };
    }, GEO_SUCCESS);

    await selectHomeContext();
    await $('.geolocation-capture-btn').click();

    await $('.geolocation-success-msg').waitForExist();
    expect(await $('.geolocation-retry-btn').isExisting()).to.be.false;
  });

  it('should show retry and skip buttons when GPS acquisition fails', async () => {
    await mockConfig.loadForm('default', 'test', 'geolocation-widget');

    await browser.execute((geoFailure) => {
      window.CHTCore.Geolocation = { currentPromise: Promise.resolve(geoFailure), retry: () => {} };
    }, GEO_FAILURE);

    await selectHomeContext();
    await $('.geolocation-capture-btn').click();

    await $('.geolocation-retry-btn').waitForExist();
    expect(await $('.geolocation-skip-btn').isExisting()).to.be.true;
    expect(await $('.geolocation-success-msg').isExisting()).to.be.false;
  });

  it('should hide context options when GPS acquisition fails', async () => {
    await mockConfig.loadForm('default', 'test', 'geolocation-widget');

    await browser.execute((geoFailure) => {
      window.CHTCore.Geolocation = { currentPromise: Promise.resolve(geoFailure), retry: () => {} };
    }, GEO_FAILURE);

    await selectHomeContext();
    await $('.geolocation-capture-btn').click();

    await $('.geolocation-retry-btn').waitForExist();
    expect(await $('.geolocation-context-options').isDisplayed()).to.be.false;
  });
});
