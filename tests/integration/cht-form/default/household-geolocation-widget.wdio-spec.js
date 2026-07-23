/* global window */
const mockConfig = require('../mock-config');

const GEO_SUCCESS = {
  latitude: 1, longitude: 2, altitude: 3, accuracy: 4, altitudeAccuracy: 5, heading: 6, speed: 7
};
const GEO_FAILURE = { code: -2, message: 'Geolocation timeout exceeded' };

const SELECTORS = {
  CHANGE_LOCATION_RADIO: 'input[value="capture-home"]',
  NOT_AT_HOUSEHOLD_RADIO: 'input[value="capture-other"]',
  CONTEXT_OPTIONS: '.geolocation-context-options',
  EDIT_BADGE: '.geolocation-edit-badge',
  EDIT_CHOICES: '.geolocation-edit-choices',
  HOME_RADIO: '.geolocation-context-options input[value="home"]',
  KEPT_RADIO: 'input[value="kept"]',
  NO_LOCATION_MSG: '.geolocation-no-location-msg',
  OTHER_RADIO: '.geolocation-context-options input[value="other"]',
  PROGRESS_BAR: '.geolocation-progress-bar',
  REMOVE_RADIO: 'input[value="removed"]',
  RETRY_BTN: '.geolocation-retry-btn',
  SAVE_WITHOUT_CHECKBOX: '.geolocation-save-without-checkbox',
  STATUS: '.geolocation-status',
  SUCCESS_MSG: '.geolocation-success-msg',
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

describe('cht-form web component - HouseholdGeolocation Widget', () => {
  it('should show progress bar immediately on form load', async () => {
    await mockGeoPending();
    await mockConfig.loadForm('default', 'test', 'household-geolocation-widget');

    await $(SELECTORS.PROGRESS_BAR).waitForExist();
    expect(await $(SELECTORS.CONTEXT_OPTIONS).isExisting()).to.be.false;
  });

  it('should show context options and success message after GPS succeeds', async () => {
    await mockGeoResolved(GEO_SUCCESS);
    await mockConfig.loadForm('default', 'test', 'household-geolocation-widget');

    await $(SELECTORS.CONTEXT_OPTIONS).waitForExist();
    expect(await $(SELECTORS.HOME_RADIO).isExisting()).to.be.true;
    expect(await $(SELECTORS.OTHER_RADIO).isExisting()).to.be.true;
    expect(await $(SELECTORS.SUCCESS_MSG).isExisting()).to.be.true;
    expect(await $(SELECTORS.RETRY_BTN).isExisting()).to.be.false;
  });

  it('should show retry button and save-without-location checkbox when GPS fails', async () => {
    await mockGeoResolved(GEO_FAILURE);
    await mockConfig.loadForm('default', 'test', 'household-geolocation-widget');

    await $(SELECTORS.RETRY_BTN).waitForExist();
    expect(await $(SELECTORS.SAVE_WITHOUT_CHECKBOX).isExisting()).to.be.true;
    expect(await $(SELECTORS.SUCCESS_MSG).isExisting()).to.be.false;
    expect(await $(SELECTORS.CONTEXT_OPTIONS).isExisting()).to.be.false;
  });

  it('should set form value to skipped when save-without-location checkbox is checked', async () => {
    await mockGeoResolved(GEO_FAILURE);
    await mockConfig.loadForm('default', 'test', 'household-geolocation-widget');

    await $(SELECTORS.SAVE_WITHOUT_CHECKBOX).waitForExist();
    await $(SELECTORS.SAVE_WITHOUT_CHECKBOX).click();

    const captureValue = await browser.execute(() => {
      return document.querySelector('.or-appearance-geolocation-capture input[name="/data/geo_capture"]').value;
    });
    expect(captureValue).to.equal('skipped');
  });

  it('should not crash when currentPromise is unavailable due to geolocationService.init() not being called',
    async () => {
      // Simulate a context where geolocationService.init() was never called (e.g. a third-party
      // embed using the widget outside of standard CHT infrastructure).
      await browser.execute(() => {
        window.CHTCore.Geolocation.currentPromise = undefined;
      });
      await mockConfig.loadForm('default', 'test', 'household-geolocation-widget');

      // Progress bar is rendered before the null guard is hit, so it still appears
      await $(SELECTORS.PROGRESS_BAR).waitForExist();
      // No GPS result because the null guard returned early before attaching .then()
      expect(await $(SELECTORS.SUCCESS_MSG).isExisting()).to.be.false;
      expect(await $(SELECTORS.RETRY_BTN).isExisting()).to.be.false;

      // Drain logs before afterTest checks them — the console.error from the null guard is expected
      const logs = await browser.getLogs('browser');
      expect(logs.some(({ message }) => message.includes('currentPromise is not available'))).to.be.true;
    });
});

describe('cht-form web component - Geolocation Widget (edit mode)', () => {
  const loadEditForm = () => mockConfig.loadFormWithEditContext('default', 'household-geolocation-widget');

  it('should render edit badge and all four edit choices on load, with the two capture options disabled', async () => {
    await mockGeoPending();
    await loadEditForm();

    await $(SELECTORS.EDIT_BADGE).waitForExist();
    expect(await $(SELECTORS.EDIT_CHOICES).isExisting()).to.be.true;
    expect(await $(SELECTORS.KEPT_RADIO).isExisting()).to.be.true;
    expect(await $(SELECTORS.CHANGE_LOCATION_RADIO).isExisting()).to.be.true;
    expect(await $(SELECTORS.NOT_AT_HOUSEHOLD_RADIO).isExisting()).to.be.true;
    expect(await $(SELECTORS.REMOVE_RADIO).isExisting()).to.be.true;
    expect(await $(SELECTORS.CONTEXT_OPTIONS).isExisting()).to.be.false;
    expect(await $(SELECTORS.CHANGE_LOCATION_RADIO).isEnabled()).to.be.false;
    expect(await $(SELECTORS.NOT_AT_HOUSEHOLD_RADIO).isEnabled()).to.be.false;
  });

  it('should pre-select keep radio and set element value to kept', async () => {
    await mockGeoPending();
    await loadEditForm();

    await $(SELECTORS.KEPT_RADIO).waitForExist();
    expect(await $(SELECTORS.KEPT_RADIO).isSelected()).to.be.true;

    const captureValue = await browser.execute(() => {
      return document.querySelector('.or-appearance-geolocation-capture input[name="/data/geo_capture"]').value;
    });
    expect(captureValue).to.equal('kept');
  });

  it('should show progress bar immediately in edit mode', async () => {
    await mockGeoPending();
    await loadEditForm();

    await $(SELECTORS.PROGRESS_BAR).waitForExist();
  });

  it('should show success message when GPS resolves in edit mode', async () => {
    await mockGeoResolved(GEO_SUCCESS);
    await loadEditForm();

    await $(SELECTORS.SUCCESS_MSG).waitForExist();
    expect(await $(SELECTORS.RETRY_BTN).isExisting()).to.be.false;
  });

  it('should set field value to captured/home when "Change household location" is selected after GPS success',
    async () => {
      await mockGeoResolved(GEO_SUCCESS);
      await loadEditForm();

      await $(SELECTORS.SUCCESS_MSG).waitForExist();
      await $(SELECTORS.CHANGE_LOCATION_RADIO).click();

      expect(await $(SELECTORS.CONTEXT_OPTIONS).isExisting()).to.be.false;
      const { value, geoContext } = await browser.execute(() => {
        const input = document.querySelector('.or-appearance-geolocation-capture input[name="/data/geo_capture"]');
        return { value: input.value, geoContext: input.dataset.geoContext };
      });
      expect(value).to.equal('captured');
      expect(geoContext).to.equal('home');
    });

  it('should set field value to captured/other when "I am not at the household" is selected after GPS success',
    async () => {
      await mockGeoResolved(GEO_SUCCESS);
      await loadEditForm();

      await $(SELECTORS.SUCCESS_MSG).waitForExist();
      await $(SELECTORS.NOT_AT_HOUSEHOLD_RADIO).click();

      expect(await $(SELECTORS.CONTEXT_OPTIONS).isExisting()).to.be.false;
      const { value, geoContext } = await browser.execute(() => {
        const input = document.querySelector('.or-appearance-geolocation-capture input[name="/data/geo_capture"]');
        return { value: input.value, geoContext: input.dataset.geoContext };
      });
      expect(value).to.equal('captured');
      expect(geoContext).to.equal('other');
    });

  it('should keep the two capture options disabled and never show a save-without-location checkbox when GPS fails',
    async () => {
      await mockGeoResolved(GEO_FAILURE);
      await loadEditForm();

      await $(SELECTORS.RETRY_BTN).waitForExist();
      expect(await $(SELECTORS.CHANGE_LOCATION_RADIO).isEnabled()).to.be.false;
      expect(await $(SELECTORS.NOT_AT_HOUSEHOLD_RADIO).isEnabled()).to.be.false;
      expect(await $(SELECTORS.SAVE_WITHOUT_CHECKBOX).isExisting()).to.be.false;
    });
});
