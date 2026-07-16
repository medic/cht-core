import jQuery from 'jquery';
import sinon from 'sinon';
import { expect } from 'chai';

const HouseholdGeolocationWidget = require(
  '../../../../../src/js/enketo/widgets/household-geolocation-widget-v2'
);

const SELECTORS = {
  GEO_CAPTURE_LABEL: '.or-appearance-geolocation-capture',
  PERMISSION_DENIED: '.geolocation-permission-denied',
  UNAVAILABLE: '.geolocation-unavailable',
  PROGRESS_BAR: '.geolocation-progress-bar',
  SUCCESS_MSG: '.geolocation-success-msg',
  FAILURE_MSG: '.geolocation-failure-msg',
  SIGNAL_WEAK_MSG: '.geolocation-weak-signal-msg',
  RETRY_BTN: '.geolocation-retry-btn',
  CANT_RECORD_BTN: '.geolocation-cant-record-btn',
  AT_HOUSEHOLD_RADIO: 'input[type="radio"][value="home"]',
  SOMEWHERE_ELSE_RADIO: 'input[type="radio"][value="other"]',
  CONTEXT_OPTIONS: '.geolocation-context-options',
  NO_LOCATION_MSG: '.geolocation-no-location-msg',
  // Edit flow
  EDIT_BADGE: '.geolocation-edit-badge',
  EDIT_BADGE_CONTEXT: '.geolocation-edit-badge-context',
  EDIT_CHOICES: '.geolocation-edit-choices',
  KEEP_RADIO: 'input[type="radio"][value="kept"]',
  RECORD_NEW_RADIO: 'input[type="radio"][value="capture-new"]',
  REMOVE_RADIO: 'input[type="radio"][value="removed"]',
};

describe('Enketo: Household Geolocation Widget v2', () => {
  const $ = jQuery;
  let originalMedicmobileAndroid: any;
  let originalCHTCore: any;

  before(() => {
    originalMedicmobileAndroid = (window as any).medicmobile_android;
    originalCHTCore = (window as any).CHTCore;
  });

  afterEach(() => {
    sinon.restore();
    (window as any).medicmobile_android = originalMedicmobileAndroid;
    (window as any).CHTCore = originalCHTCore;
    $('#geolocation-widget-test').remove();
  });

  it('should have the correct selector', () => {
    expect(HouseholdGeolocationWidget.selector).to.equal(SELECTORS.GEO_CAPTURE_LABEL + ' input');
  });
});
