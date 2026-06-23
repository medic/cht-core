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

const mockGeoPending = async () => {
  await browser.execute(() => {
    window.CHTCore.Geolocation = { currentPromise: new Promise(() => {}), retry: () => {} };
  });
};

const mockGeoResolved = async (result) => {
  await browser.execute((r) => {
    window.CHTCore.Geolocation = { currentPromise: Promise.resolve(r), retry: () => {} };
  }, result);
};

describe('cht-form web component - Geolocation Widget', () => {
  it('should render capture button when geolocation is available', async () => {
    await mockConfig.loadForm('default', 'test', 'household-geolocation-widget');

    const captureBtn = await $('.geolocation-capture-btn');
    await captureBtn.waitForExist();
    expect(await captureBtn.isExisting()).to.be.true;
  });

  it('should render home and other context options', async () => {
    await mockConfig.loadForm('default', 'test', 'household-geolocation-widget');

    await $('.geolocation-context-options').waitForExist();
    expect(await $('.geolocation-context-options input[value="home"]').isExisting()).to.be.true;
    expect(await $('.geolocation-context-options input[value="other"]').isExisting()).to.be.true;
  });

  it('should disable capture button until a context option is selected', async () => {
    await mockConfig.loadForm('default', 'test', 'household-geolocation-widget');

    await $('.geolocation-capture-btn').waitForExist();
    expect(await $('.geolocation-capture-btn').getAttribute('disabled')).to.not.be.null;

    await selectHomeContext();

    expect(await $('.geolocation-capture-btn').getAttribute('disabled')).to.be.null;
  });

  it('should show progress bar and remove capture button when capture is started', async () => {
    await mockConfig.loadForm('default', 'test', 'household-geolocation-widget');

    await mockGeoPending();

    await selectHomeContext();
    await $('.geolocation-capture-btn').click();

    await $('.geolocation-progress-bar').waitForExist();
    expect(await $('.geolocation-capture-btn').isExisting()).to.be.false;
  });

  it('should hide context options when capture starts', async () => {
    await mockConfig.loadForm('default', 'test', 'household-geolocation-widget');

    await mockGeoPending();

    await selectHomeContext();
    expect(await $('.geolocation-context-options').isDisplayed()).to.be.true;

    await $('.geolocation-capture-btn').click();

    expect(await $('.geolocation-context-options').isDisplayed()).to.be.false;
  });

  it('should show success message when GPS is acquired', async () => {
    await mockConfig.loadForm('default', 'test', 'household-geolocation-widget');

    await mockGeoResolved(GEO_SUCCESS);

    await selectHomeContext();
    await $('.geolocation-capture-btn').click();

    await $('.geolocation-success-msg').waitForExist();
    expect(await $('.geolocation-retry-btn').isExisting()).to.be.false;
  });

  it('should show retry and skip buttons when GPS acquisition fails', async () => {
    await mockConfig.loadForm('default', 'test', 'household-geolocation-widget');

    await mockGeoResolved(GEO_FAILURE);

    await selectHomeContext();
    await $('.geolocation-capture-btn').click();

    await $('.geolocation-retry-btn').waitForExist();
    expect(await $('.geolocation-skip-btn').isExisting()).to.be.true;
    expect(await $('.geolocation-success-msg').isExisting()).to.be.false;
  });

  it('should show a confirmation message and remove retry/skip buttons when skip is clicked', async () => {
    await mockConfig.loadForm('default', 'test', 'household-geolocation-widget');

    await mockGeoResolved(GEO_FAILURE);

    await selectHomeContext();
    await $('.geolocation-capture-btn').click();

    await $('.geolocation-acknowledge-checkbox').waitForExist();
    await $('.geolocation-acknowledge-checkbox').click();
    await $('.geolocation-skip-btn').click();

    await $('.geolocation-skipped-msg').waitForExist();
    expect(await $('.geolocation-retry-btn').isExisting()).to.be.false;
    expect(await $('.geolocation-skip-btn').isExisting()).to.be.false;
  });
});

describe('cht-form web component - Geolocation Widget (edit mode)', () => {
  const loadEditForm = (lastCapture) => mockConfig.loadFormWithEditContext(
    'default', 'household-geolocation-widget', lastCapture ? { lastCapture } : {}
  );

  const selectCaptureNewAndAcknowledge = async () => {
    await $('input[value="capture-new"]').waitForExist();
    await $('input[value="capture-new"]').click();
    await $('.geolocation-edit-acknowledge-checkbox').waitForExist();
    await $('.geolocation-edit-acknowledge-checkbox').click();
  };

  it('should render edit badge instead of context radios and capture button', async () => {
    await loadEditForm();

    await $('.geolocation-edit-badge').waitForExist();
    expect(await $('.geolocation-context-options').isExisting()).to.be.false;
    expect(await $('.geolocation-capture-btn').isExisting()).to.be.false;
  });

  it('should not render badge context or meta elements when lastCapture is absent', async () => {
    await loadEditForm();

    await $('.geolocation-edit-badge').waitForExist();
    expect(await $('.geolocation-edit-badge-context').isExisting()).to.be.false;
    expect(await $('.geolocation-edit-badge-meta').isExisting()).to.be.false;
  });

  it('should render badge context and meta elements when lastCapture is provided', async () => {
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
    await loadEditForm({ isHome: true, timestamp: threeDaysAgo });

    await $('.geolocation-edit-badge-context').waitForExist();
    expect(await $('.geolocation-edit-badge-context').isExisting()).to.be.true;
    expect(await $('.geolocation-edit-badge-meta').isExisting()).to.be.true;
  });

  it('should render keep and capture-new radio options', async () => {
    await loadEditForm();

    await $('.geolocation-edit-options').waitForExist();
    expect(await $('input[value="kept"]').isExisting()).to.be.true;
    expect(await $('input[value="capture-new"]').isExisting()).to.be.true;
  });

  it('should pre-select keep radio and set element value to kept', async () => {
    await loadEditForm();

    await $('input[value="kept"]').waitForExist();
    expect(await $('input[value="kept"]').isSelected()).to.be.true;

    const captureValue = await browser.execute(() => {
      return document.querySelector('.or-appearance-geolocation-capture input[name="/data/geo_capture"]').value;
    });
    expect(captureValue).to.equal('kept');
  });

  it('should show warning and acknowledge checkbox when capture-new is selected', async () => {
    await loadEditForm();

    await $('input[value="capture-new"]').waitForExist();
    await $('input[value="capture-new"]').click();

    await $('.geolocation-edit-warning').waitForDisplayed();
    expect(await $('.geolocation-edit-acknowledge-checkbox').isExisting()).to.be.true;
  });

  it('should show GPS capture progress UI and hide edit options when acknowledge is ticked', async () => {
    await loadEditForm();

    await mockGeoPending();

    await selectCaptureNewAndAcknowledge();

    await $('.geolocation-progress-bar').waitForExist();
    expect(await $('.geolocation-edit-options').isDisplayed()).to.be.false;
  });

  it('should show success message when GPS is acquired in edit mode', async () => {
    await loadEditForm();

    await mockGeoResolved(GEO_SUCCESS);

    await selectCaptureNewAndAcknowledge();

    await $('.geolocation-success-msg').waitForExist();
    expect(await $('.geolocation-retry-btn').isExisting()).to.be.false;
  });

  it('should revert to edit choice with keep pre-selected when GPS fails and continue is clicked', async () => {
    await loadEditForm();

    await mockGeoResolved(GEO_FAILURE);

    await selectCaptureNewAndAcknowledge();

    await $('.geolocation-retry-btn').waitForExist();
    await $('.geolocation-acknowledge-checkbox').click();
    await $('.geolocation-skip-btn').click();

    await $('.geolocation-edit-options').waitForDisplayed();
    expect(await $('input[value="kept"]').isSelected()).to.be.true;
    expect(await $('.geolocation-status').isExisting()).to.be.false;
  });
});
