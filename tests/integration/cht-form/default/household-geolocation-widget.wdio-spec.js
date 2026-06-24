/* global window */
const mockConfig = require('../mock-config');

const GEO_SUCCESS = {
  latitude: 1, longitude: 2, altitude: 3, accuracy: 4, altitudeAccuracy: 5, heading: 6, speed: 7
};
const GEO_FAILURE = { code: -2, message: 'Geolocation timeout exceeded' };

const SELECTORS = {
  ACKNOWLEDGE_CHECKBOX: '.geolocation-acknowledge-checkbox',
  CAPTURE_BTN: '.geolocation-capture-btn',
  CAPTURE_NEW_RADIO: 'input[value="capture-new"]',
  CONTEXT_OPTIONS: '.geolocation-context-options',
  EDIT_ACKNOWLEDGE_CHECKBOX: '.geolocation-edit-acknowledge-checkbox',
  EDIT_BADGE: '.geolocation-edit-badge',
  EDIT_BADGE_CONTEXT: '.geolocation-edit-badge-context',
  EDIT_BADGE_META: '.geolocation-edit-badge-meta',
  EDIT_OPTIONS: '.geolocation-edit-options',
  EDIT_WARNING: '.geolocation-edit-warning',
  HOME_RADIO: '.geolocation-context-options input[value="home"]',
  KEPT_RADIO: 'input[value="kept"]',
  OTHER_RADIO: '.geolocation-context-options input[value="other"]',
  PROGRESS_BAR: '.geolocation-progress-bar',
  RETRY_BTN: '.geolocation-retry-btn',
  SKIP_BTN: '.geolocation-skip-btn',
  SKIPPED_MSG: '.geolocation-skipped-msg',
  STATUS: '.geolocation-status',
  SUCCESS_MSG: '.geolocation-success-msg',
};

const selectHomeContext = async () => {
  await $(SELECTORS.HOME_RADIO).waitForExist();
  await $(SELECTORS.HOME_RADIO).click();
};

const mockGeoPending = async () => {
  await browser.execute(() => {
    window.CHTCore.Geolocation.currentPromise = new Promise(() => {});
  });
};

const mockGeoResolved = async (result) => {
  await browser.execute((r) => {
    window.CHTCore.Geolocation.currentPromise = Promise.resolve(r);
  }, result);
};

describe('cht-form web component - Geolocation Widget', () => {
  it('should render capture button when geolocation is available', async () => {
    await mockConfig.loadForm('default', 'test', 'household-geolocation-widget');

    const captureBtn = await $(SELECTORS.CAPTURE_BTN);
    await captureBtn.waitForExist();
    expect(await captureBtn.isExisting()).to.be.true;
  });

  it('should render home and other context options', async () => {
    await mockConfig.loadForm('default', 'test', 'household-geolocation-widget');

    await $(SELECTORS.CONTEXT_OPTIONS).waitForExist();
    expect(await $(SELECTORS.HOME_RADIO).isExisting()).to.be.true;
    expect(await $(SELECTORS.OTHER_RADIO).isExisting()).to.be.true;
  });

  it('should disable capture button until a context option is selected', async () => {
    await mockConfig.loadForm('default', 'test', 'household-geolocation-widget');

    await $(SELECTORS.CAPTURE_BTN).waitForExist();
    expect(await $(SELECTORS.CAPTURE_BTN).getAttribute('disabled')).to.not.be.null;

    await selectHomeContext();

    expect(await $(SELECTORS.CAPTURE_BTN).getAttribute('disabled')).to.be.null;
  });

  it('should show progress bar and remove capture button when capture is started', async () => {
    await mockConfig.loadForm('default', 'test', 'household-geolocation-widget');

    await mockGeoPending();

    await selectHomeContext();
    await $(SELECTORS.CAPTURE_BTN).click();

    await $(SELECTORS.PROGRESS_BAR).waitForExist();
    expect(await $(SELECTORS.CAPTURE_BTN).isExisting()).to.be.false;
  });

  it('should hide context options when capture starts', async () => {
    await mockConfig.loadForm('default', 'test', 'household-geolocation-widget');

    await mockGeoPending();

    await selectHomeContext();
    expect(await $(SELECTORS.CONTEXT_OPTIONS).isDisplayed()).to.be.true;

    await $(SELECTORS.CAPTURE_BTN).click();

    expect(await $(SELECTORS.CONTEXT_OPTIONS).isDisplayed()).to.be.false;
  });

  it('should show success message when GPS is acquired', async () => {
    await mockConfig.loadForm('default', 'test', 'household-geolocation-widget');

    await mockGeoResolved(GEO_SUCCESS);

    await selectHomeContext();
    await $(SELECTORS.CAPTURE_BTN).click();

    await $(SELECTORS.SUCCESS_MSG).waitForExist();
    expect(await $(SELECTORS.RETRY_BTN).isExisting()).to.be.false;
  });

  it('should show retry and skip buttons when GPS acquisition fails', async () => {
    await mockConfig.loadForm('default', 'test', 'household-geolocation-widget');

    await mockGeoResolved(GEO_FAILURE);

    await selectHomeContext();
    await $(SELECTORS.CAPTURE_BTN).click();

    await $(SELECTORS.RETRY_BTN).waitForExist();
    expect(await $(SELECTORS.SKIP_BTN).isExisting()).to.be.true;
    expect(await $(SELECTORS.SUCCESS_MSG).isExisting()).to.be.false;
  });

  it('should show a confirmation message and remove retry/skip buttons when skip is clicked', async () => {
    await mockConfig.loadForm('default', 'test', 'household-geolocation-widget');

    await mockGeoResolved(GEO_FAILURE);

    await selectHomeContext();
    await $(SELECTORS.CAPTURE_BTN).click();

    await $(SELECTORS.ACKNOWLEDGE_CHECKBOX).waitForExist();
    await $(SELECTORS.ACKNOWLEDGE_CHECKBOX).click();
    await $(SELECTORS.SKIP_BTN).click();

    await $(SELECTORS.SKIPPED_MSG).waitForExist();
    expect(await $(SELECTORS.RETRY_BTN).isExisting()).to.be.false;
    expect(await $(SELECTORS.SKIP_BTN).isExisting()).to.be.false;
  });
});

describe('cht-form web component - Geolocation Widget (edit mode)', () => {
  const loadEditForm = (lastCapture) => mockConfig.loadFormWithEditContext(
    'default', 'household-geolocation-widget', lastCapture ? { lastCapture } : {}
  );

  const selectCaptureNewAndAcknowledge = async () => {
    await $(SELECTORS.CAPTURE_NEW_RADIO).waitForExist();
    await $(SELECTORS.CAPTURE_NEW_RADIO).click();
    await $(SELECTORS.EDIT_ACKNOWLEDGE_CHECKBOX).waitForExist();
    await $(SELECTORS.EDIT_ACKNOWLEDGE_CHECKBOX).click();
  };

  it('should render edit badge instead of context radios and capture button', async () => {
    await loadEditForm();

    await $(SELECTORS.EDIT_BADGE).waitForExist();
    expect(await $(SELECTORS.CONTEXT_OPTIONS).isExisting()).to.be.false;
    expect(await $(SELECTORS.CAPTURE_BTN).isExisting()).to.be.false;
  });

  it('should not render badge context or meta elements when lastCapture is absent', async () => {
    await loadEditForm();

    await $(SELECTORS.EDIT_BADGE).waitForExist();
    expect(await $(SELECTORS.EDIT_BADGE_CONTEXT).isExisting()).to.be.false;
    expect(await $(SELECTORS.EDIT_BADGE_META).isExisting()).to.be.false;
  });

  it('should render badge context and meta elements when lastCapture is provided', async () => {
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
    await loadEditForm({ isHome: true, timestamp: threeDaysAgo });

    await $(SELECTORS.EDIT_BADGE_CONTEXT).waitForExist();
    expect(await $(SELECTORS.EDIT_BADGE_CONTEXT).isExisting()).to.be.true;
    expect(await $(SELECTORS.EDIT_BADGE_META).isExisting()).to.be.true;
  });

  it('should render keep and capture-new radio options', async () => {
    await loadEditForm();

    await $(SELECTORS.EDIT_OPTIONS).waitForExist();
    expect(await $(SELECTORS.KEPT_RADIO).isExisting()).to.be.true;
    expect(await $(SELECTORS.CAPTURE_NEW_RADIO).isExisting()).to.be.true;
  });

  it('should pre-select keep radio and set element value to kept', async () => {
    await loadEditForm();

    await $(SELECTORS.KEPT_RADIO).waitForExist();
    expect(await $(SELECTORS.KEPT_RADIO).isSelected()).to.be.true;

    const captureValue = await browser.execute(() => {
      return document.querySelector('.or-appearance-geolocation-capture input[name="/data/geo_capture"]').value;
    });
    expect(captureValue).to.equal('kept');
  });

  it('should show warning and acknowledge checkbox when capture-new is selected', async () => {
    await loadEditForm();

    await $(SELECTORS.CAPTURE_NEW_RADIO).waitForExist();
    await $(SELECTORS.CAPTURE_NEW_RADIO).click();

    await $(SELECTORS.EDIT_WARNING).waitForDisplayed();
    expect(await $(SELECTORS.EDIT_ACKNOWLEDGE_CHECKBOX).isExisting()).to.be.true;
  });

  it('should show GPS capture progress UI and hide edit options when acknowledge is ticked', async () => {
    await loadEditForm();

    await mockGeoPending();

    await selectCaptureNewAndAcknowledge();

    await $(SELECTORS.PROGRESS_BAR).waitForExist();
    expect(await $(SELECTORS.EDIT_OPTIONS).isDisplayed()).to.be.false;
  });

  it('should show success message when GPS is acquired in edit mode', async () => {
    await loadEditForm();

    await mockGeoResolved(GEO_SUCCESS);

    await selectCaptureNewAndAcknowledge();

    await $(SELECTORS.SUCCESS_MSG).waitForExist();
    expect(await $(SELECTORS.RETRY_BTN).isExisting()).to.be.false;
  });

  it('should revert to edit choice with keep pre-selected when GPS fails and continue is clicked', async () => {
    await loadEditForm();

    await mockGeoResolved(GEO_FAILURE);

    await selectCaptureNewAndAcknowledge();

    await $(SELECTORS.RETRY_BTN).waitForExist();
    await $(SELECTORS.ACKNOWLEDGE_CHECKBOX).click();
    await $(SELECTORS.SKIP_BTN).click();

    await $(SELECTORS.EDIT_OPTIONS).waitForDisplayed();
    expect(await $(SELECTORS.KEPT_RADIO).isSelected()).to.be.true;
    expect(await $(SELECTORS.STATUS).isExisting()).to.be.false;
  });
});
