import jQuery from 'jquery';
import sinon from 'sinon';
import { expect } from 'chai';

const HouseholdGeolocationWidget = require(
  '../../../../../src/js/enketo/widgets/household-geolocation-widget'
);

const SELECTORS = {
  GEO_CAPTURE_LABEL: '.or-appearance-geolocation-capture',
  PERMISSION_DENIED: '.geolocation-permission-denied',
  UNAVAILABLE: '.geolocation-unavailable',
  PROGRESS_ROW: '.geolocation-progress-row',
  PROGRESS_BAR: '.geolocation-progress-bar',
  SUCCESS_MSG: '.geolocation-result-row .alert-success',
  FAILURE_MSG: '.geolocation-result-row .alert-error',
  SIGNAL_WEAK_MSG: '.geolocation-weak-signal-msg',
  RETRY_BTN: '.geolocation-retry-btn',
  SAVE_WITHOUT_LABEL: '.geolocation-save-without-label',
  SAVE_WITHOUT_CHECKBOX: '.geolocation-save-without-checkbox',
  AT_HOUSEHOLD_RADIO: 'input[type="radio"][value="home"]',
  SOMEWHERE_ELSE_RADIO: 'input[type="radio"][value="other"]',
  CONTEXT_OPTIONS: '.geolocation-context-options',
  NO_LOCATION_MSG: '.geolocation-no-location-msg',
  // Edit flow selectors (Phase 4)
  EDIT_BADGE: '.geolocation-edit-badge',
  EDIT_BADGE_CONTEXT: '.geolocation-edit-badge-context',
  EDIT_CHOICES: '.geolocation-edit-choices',
  KEEP_RADIO: 'input[type="radio"][value="kept"]',
  CHANGE_LOCATION_RADIO: 'input[type="radio"][value="capture-home"]',
  NOT_AT_HOUSEHOLD_RADIO: 'input[type="radio"][value="capture-other"]',
  REMOVE_RADIO: 'input[type="radio"][value="removed"]',
};

const GPS_SUCCESS = {
  latitude: 1, longitude: 2, altitude: 3, accuracy: 4, altitudeAccuracy: 5, heading: 6, speed: 7,
};
const GPS_FAILURE = { code: -2, message: 'Geolocation timeout exceeded' };
const GPS_PERMISSION_DENIED = { code: 1, message: 'User denied Geolocation' };

describe('Enketo: Household Geolocation Widget', () => {
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

  describe('_init()', () => {
    beforeEach(() => {
      (window as any).CHTCore = {
        Translate: { instant: sinon.stub().callsFake((key: string) => key) },
        Geolocation: {
          isAvailable: sinon.stub().returns(true),
          isPermissionDenied: sinon.stub().returns(false),
          currentPromise: new Promise(() => {}),
          currentHandle: { cancel: sinon.stub() },
        },
      };
    });

    const buildHtml = () => {
      document.body.insertAdjacentHTML('afterbegin', `
        <div id="geolocation-widget-test">
          <label class="question non-select or-appearance-geolocation-capture">
            <input type="hidden" name="/geolocation/capture" data-type-xml="string" />
          </label>
        </div>`);
    };

    const createWidget = () => {
      const widget = Object.create(HouseholdGeolocationWidget.prototype);
      widget.element = document.querySelector(
        '#geolocation-widget-test ' + HouseholdGeolocationWidget.selector
      );
      widget.question = widget.element.closest('.question');
      return widget;
    };

    const initWidget = () => {
      buildHtml();
      const widget = createWidget();
      widget._init();
      const container = document.querySelector(
        '#geolocation-widget-test ' + SELECTORS.GEO_CAPTURE_LABEL
      )!;
      return { widget, container };
    };

    it('should show permission denied message when location permissions are denied', () => {
      (window as any).CHTCore.Geolocation.isPermissionDenied = sinon.stub().returns(true);
      const { container } = initWidget();
      expect(container.querySelector(SELECTORS.PERMISSION_DENIED)).to.not.be.null;
    });

    it('should not pre-set element value when permission is denied', () => {
      (window as any).CHTCore.Geolocation.isPermissionDenied = sinon.stub().returns(true);
      const { widget } = initWidget();
      expect((widget.element as HTMLInputElement).value).to.equal('');
    });

    it('should show save-without checkbox when permission is denied', () => {
      (window as any).CHTCore.Geolocation.isPermissionDenied = sinon.stub().returns(true);
      const { container } = initWidget();
      expect(container.querySelector(SELECTORS.SAVE_WITHOUT_LABEL)).to.not.be.null;
    });

    it('should set value to "skipped" when save-without checkbox is checked (permission denied)', () => {
      (window as any).CHTCore.Geolocation.isPermissionDenied = sinon.stub().returns(true);
      const { widget, container } = initWidget();
      const checkbox = container.querySelector(SELECTORS.SAVE_WITHOUT_CHECKBOX) as HTMLInputElement;
      checkbox.checked = true;
      $(checkbox).trigger('change');
      expect((widget.element as HTMLInputElement).value).to.equal('skipped');
    });

    it('should fire a change event when save-without checkbox is checked (permission denied)', () => {
      (window as any).CHTCore.Geolocation.isPermissionDenied = sinon.stub().returns(true);
      const { widget, container } = initWidget();
      const changeHandler = sinon.stub();
      $((widget.element as HTMLInputElement)).on('change', changeHandler);
      const checkbox = container.querySelector(SELECTORS.SAVE_WITHOUT_CHECKBOX) as HTMLInputElement;
      checkbox.checked = true;
      $(checkbox).trigger('change');
      expect(changeHandler.callCount).to.equal(1);
    });

    it('should remove permission-denied message when geolocationPermissionGranted event fires', () => {
      (window as any).CHTCore.Geolocation.isPermissionDenied = sinon.stub().returns(true);
      const { container } = initWidget();
      document.dispatchEvent(new CustomEvent('geolocationPermissionGranted'));
      expect(container.querySelector(SELECTORS.PERMISSION_DENIED)).to.be.null;
    });

    it('should remove save-without checkbox when geolocationPermissionGranted event fires', () => {
      (window as any).CHTCore.Geolocation.isPermissionDenied = sinon.stub().returns(true);
      const { container } = initWidget();
      document.dispatchEvent(new CustomEvent('geolocationPermissionGranted'));
      expect(container.querySelector(SELECTORS.SAVE_WITHOUT_LABEL)).to.be.null;
    });

    it('should show progress bar when geolocationPermissionGranted event fires', () => {
      (window as any).CHTCore.Geolocation.isPermissionDenied = sinon.stub().returns(true);
      const { container } = initWidget();
      document.dispatchEvent(new CustomEvent('geolocationPermissionGranted'));
      expect(container.querySelector(SELECTORS.PROGRESS_BAR)).to.not.be.null;
    });

    it('should only respond to geolocationPermissionGranted once', () => {
      (window as any).CHTCore.Geolocation.isPermissionDenied = sinon.stub().returns(true);
      const { container } = initWidget();
      document.dispatchEvent(new CustomEvent('geolocationPermissionGranted'));
      document.dispatchEvent(new CustomEvent('geolocationPermissionGranted'));
      expect(container.querySelectorAll(SELECTORS.PROGRESS_BAR)).to.have.lengthOf(1);
    });

    it('should transition to edit mode when geolocationPermissionGranted fires ' +
      'on an edit form with prior location', () => {
      (window as any).CHTCore.Geolocation.isPermissionDenied = sinon.stub().returns(true);
      document.body.insertAdjacentHTML('afterbegin', `
        <div id="geolocation-widget-test">
          <label class="question non-select or-appearance-geolocation-capture">
            <input type="hidden" name="/geolocation/capture" data-type-xml="string"
              data-geo-is-edit="true" data-geo-has-location="true" />
          </label>
        </div>`);
      const widget = Object.create(HouseholdGeolocationWidget.prototype);
      widget.element = document.querySelector('#geolocation-widget-test ' + HouseholdGeolocationWidget.selector);
      widget.question = widget.element.closest('.question');
      widget._init();
      const container = document.querySelector('#geolocation-widget-test ' + SELECTORS.GEO_CAPTURE_LABEL)!;

      document.dispatchEvent(new CustomEvent('geolocationPermissionGranted'));

      expect(container.querySelector(SELECTORS.EDIT_BADGE)).to.not.be.null;
      expect(container.querySelector(SELECTORS.EDIT_CHOICES)).to.not.be.null;
      expect(container.querySelector(SELECTORS.PROGRESS_BAR)).to.not.be.null;
    });

    it('should show no-location message and progress bar when geolocationPermissionGranted fires ' +
      'on an edit form without prior location', () => {
      (window as any).CHTCore.Geolocation.isPermissionDenied = sinon.stub().returns(true);
      document.body.insertAdjacentHTML('afterbegin', `
        <div id="geolocation-widget-test">
          <label class="question non-select or-appearance-geolocation-capture">
            <input type="hidden" name="/geolocation/capture" data-type-xml="string"
              data-geo-is-edit="true" />
          </label>
        </div>`);
      const widget = Object.create(HouseholdGeolocationWidget.prototype);
      widget.element = document.querySelector('#geolocation-widget-test ' + HouseholdGeolocationWidget.selector);
      widget.question = widget.element.closest('.question');
      widget._init();
      const container = document.querySelector('#geolocation-widget-test ' + SELECTORS.GEO_CAPTURE_LABEL)!;

      document.dispatchEvent(new CustomEvent('geolocationPermissionGranted'));

      expect(container.querySelector(SELECTORS.NO_LOCATION_MSG)).to.not.be.null;
      expect(container.querySelector(SELECTORS.PROGRESS_BAR)).to.not.be.null;
      expect(container.querySelector(SELECTORS.EDIT_BADGE)).to.be.null;
    });

    it('should show unavailable message when Geolocation API is absent', () => {
      (window as any).CHTCore.Geolocation.isAvailable = sinon.stub().returns(false);
      const { container } = initWidget();
      expect(container.querySelector(SELECTORS.UNAVAILABLE)).to.not.be.null;
    });

    it('should not pre-set element value when Geolocation API is absent', () => {
      (window as any).CHTCore.Geolocation.isAvailable = sinon.stub().returns(false);
      const { widget } = initWidget();
      expect((widget.element as HTMLInputElement).value).to.equal('');
    });

    it('should show save-without checkbox when Geolocation API is absent', () => {
      (window as any).CHTCore.Geolocation.isAvailable = sinon.stub().returns(false);
      const { container } = initWidget();
      expect(container.querySelector(SELECTORS.SAVE_WITHOUT_LABEL)).to.not.be.null;
    });

    it('should set value to "skipped" when save-without checkbox is checked (unavailable)', () => {
      (window as any).CHTCore.Geolocation.isAvailable = sinon.stub().returns(false);
      const { widget, container } = initWidget();
      const checkbox = container.querySelector(SELECTORS.SAVE_WITHOUT_CHECKBOX) as HTMLInputElement;
      checkbox.checked = true;
      $(checkbox).trigger('change');
      expect((widget.element as HTMLInputElement).value).to.equal('skipped');
    });

    it('should fire a change event when save-without checkbox is checked (unavailable)', () => {
      (window as any).CHTCore.Geolocation.isAvailable = sinon.stub().returns(false);
      const { widget, container } = initWidget();
      const changeHandler = sinon.stub();
      $((widget.element as HTMLInputElement)).on('change', changeHandler);
      const checkbox = container.querySelector(SELECTORS.SAVE_WITHOUT_CHECKBOX) as HTMLInputElement;
      checkbox.checked = true;
      $(checkbox).trigger('change');
      expect(changeHandler.callCount).to.equal(1);
    });

    describe('create flow', () => {
      it('should show progress bar immediately without any user action', () => {
        const { container } = initWidget();
        expect(container.querySelector(SELECTORS.PROGRESS_BAR)).to.not.be.null;
      });

      it('should not show "save without location" checkbox before GPS resolves', () => {
        const { container } = initWidget();
        expect(container.querySelector(SELECTORS.SAVE_WITHOUT_LABEL)).to.be.null;
      });

      it('should not show context choices before GPS resolves', () => {
        const { container } = initWidget();
        expect(container.querySelector(SELECTORS.CONTEXT_OPTIONS)).to.be.null;
      });

      it('should log an error and not throw when currentPromise is unavailable', () => {
        (window as any).CHTCore.Geolocation.currentPromise = undefined;
        const consoleErrorStub = sinon.stub(console, 'error');
        expect(() => initWidget()).to.not.throw();
        expect(consoleErrorStub.callCount).to.equal(1);
      });

      describe('on GPS success', () => {
        it('should hide the progress row', async () => {
          const promise = Promise.resolve(GPS_SUCCESS);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const { container } = initWidget();
          await promise;
          const progressRow = container.querySelector(SELECTORS.PROGRESS_ROW) as HTMLElement;
          expect(progressRow.style.display).to.equal('none');
        });

        it('should show success message', async () => {
          const promise = Promise.resolve(GPS_SUCCESS);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const { container } = initWidget();
          await promise;
          expect(container.querySelector(SELECTORS.SUCCESS_MSG)).to.not.be.null;
        });

        it('should show a check icon alongside the success message', async () => {
          const promise = Promise.resolve(GPS_SUCCESS);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const { container } = initWidget();
          await promise;
          expect(container.querySelector(`${SELECTORS.SUCCESS_MSG} .fa-check`)).to.not.be.null;
        });

        it('should not show failure message on success', async () => {
          const promise = Promise.resolve(GPS_SUCCESS);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const { container } = initWidget();
          await promise;
          expect(container.querySelector(SELECTORS.FAILURE_MSG)).to.be.null;
        });

        it('should show context choices after GPS succeeds', async () => {
          const promise = Promise.resolve(GPS_SUCCESS);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const { container } = initWidget();
          await promise;
          expect(container.querySelector(SELECTORS.CONTEXT_OPTIONS)).to.not.be.null;
          expect(container.querySelector(SELECTORS.AT_HOUSEHOLD_RADIO)).to.not.be.null;
          expect(container.querySelector(SELECTORS.SOMEWHERE_ELSE_RADIO)).to.not.be.null;
        });

        it('should not show "save without location" checkbox on GPS success', async () => {
          const promise = Promise.resolve(GPS_SUCCESS);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const { container } = initWidget();
          await promise;
          expect(container.querySelector(SELECTORS.SAVE_WITHOUT_LABEL)).to.be.null;
        });

        it('should set value to "captured" and geo-context to "home" when "at household" is selected', async () => {
          const promise = Promise.resolve(GPS_SUCCESS);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const { widget, container } = initWidget();
          await promise;

          const radio = container.querySelector(SELECTORS.AT_HOUSEHOLD_RADIO) as HTMLInputElement;
          radio.checked = true;
          $(radio).trigger('change');

          expect((widget.element as HTMLInputElement).value).to.equal('captured');
          expect((widget.element as HTMLInputElement).dataset.geoContext).to.equal('home');
        });

        it('should set value to "captured" and geo-context to "other" when "somewhere else" is selected', async () => {
          const promise = Promise.resolve(GPS_SUCCESS);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const { widget, container } = initWidget();
          await promise;

          const radio = container.querySelector(SELECTORS.SOMEWHERE_ELSE_RADIO) as HTMLInputElement;
          radio.checked = true;
          $(radio).trigger('change');

          expect((widget.element as HTMLInputElement).value).to.equal('captured');
          expect((widget.element as HTMLInputElement).dataset.geoContext).to.equal('other');
        });
      });

      describe('on GPS failure', () => {
        it('should hide the progress row', async () => {
          const promise = Promise.resolve(GPS_FAILURE);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const { container } = initWidget();
          await promise;
          const progressRow = container.querySelector(SELECTORS.PROGRESS_ROW) as HTMLElement;
          expect(progressRow.style.display).to.equal('none');
        });

        it('should show failure message', async () => {
          const promise = Promise.resolve(GPS_FAILURE);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const { container } = initWidget();
          await promise;
          expect(container.querySelector(SELECTORS.FAILURE_MSG)).to.not.be.null;
        });

        it('should show a warning icon alongside the failure message', async () => {
          const promise = Promise.resolve(GPS_FAILURE);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const { container } = initWidget();
          await promise;
          expect(container.querySelector(`${SELECTORS.FAILURE_MSG} .fa-exclamation-triangle`)).to.not.be.null;
        });

        it('should show retry button', async () => {
          const promise = Promise.resolve(GPS_FAILURE);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const { container } = initWidget();
          await promise;
          expect(container.querySelector(SELECTORS.RETRY_BTN)).to.not.be.null;
        });

        it('should show retry button inside geolocation-status, so its CSS actually applies', async () => {
          const promise = Promise.resolve(GPS_FAILURE);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const { container } = initWidget();
          await promise;
          const statusEl = container.querySelector('.geolocation-status')!;
          expect(statusEl.querySelector(SELECTORS.RETRY_BTN)).to.not.be.null;
        });

        it('should show "save without location" checkbox after GPS failure', async () => {
          const promise = Promise.resolve(GPS_FAILURE);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const { container } = initWidget();
          await promise;
          expect(container.querySelector(SELECTORS.SAVE_WITHOUT_LABEL)).to.not.be.null;
        });

        it('should not show context choices', async () => {
          const promise = Promise.resolve(GPS_FAILURE);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const { container } = initWidget();
          await promise;
          expect(container.querySelector(SELECTORS.CONTEXT_OPTIONS)).to.be.null;
        });

        it('should show weak signal message for POSITION_UNAVAILABLE (code 2)', async () => {
          const promise = Promise.resolve({ code: 2, message: 'Position unavailable' });
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const { container } = initWidget();
          await promise;
          expect(container.querySelector(SELECTORS.SIGNAL_WEAK_MSG)).to.not.be.null;
        });

        it('should show weak signal message for TIMEOUT (code 3)', async () => {
          const promise = Promise.resolve({ code: 3, message: 'Timeout expired' });
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const { container } = initWidget();
          await promise;
          expect(container.querySelector(SELECTORS.SIGNAL_WEAK_MSG)).to.not.be.null;
        });

        it('should show weak signal message for service timeout (code -2)', async () => {
          const promise = Promise.resolve(GPS_FAILURE);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const { container } = initWidget();
          await promise;
          expect(container.querySelector(SELECTORS.SIGNAL_WEAK_MSG)).to.not.be.null;
        });

        it('should not show weak signal message for PERMISSION_DENIED (code 1)', async () => {
          const promise = Promise.resolve({ code: 1, message: 'User denied Geolocation' });
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const { container } = initWidget();
          await promise;
          expect(container.querySelector(SELECTORS.SIGNAL_WEAK_MSG)).to.be.null;
        });

        it('should not show weak signal message for other failure codes', async () => {
          const promise = Promise.resolve({ code: -3, message: 'Geolocation API unavailable' });
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const { container } = initWidget();
          await promise;
          expect(container.querySelector(SELECTORS.SIGNAL_WEAK_MSG)).to.be.null;
        });

        it('should call retry() and remove the retry button when retry is clicked', async () => {
          const failurePromise = Promise.resolve(GPS_FAILURE);
          (window as any).CHTCore.Geolocation.currentPromise = failurePromise;
          const { container } = initWidget();
          await failurePromise;

          const retryStub = sinon.stub().callsFake(() => {
            (window as any).CHTCore.Geolocation.currentPromise = new Promise(() => {});
          });
          (window as any).CHTCore.Geolocation.retry = retryStub;
          (container.querySelector(SELECTORS.RETRY_BTN) as HTMLElement).click();

          expect(retryStub.callCount).to.equal(1);
          expect(container.querySelector(SELECTORS.RETRY_BTN)).to.be.null;
          expect(container.querySelector(SELECTORS.PROGRESS_BAR)).to.not.be.null;
          const progressRow = container.querySelector(SELECTORS.PROGRESS_ROW) as HTMLElement;
          expect(progressRow.style.display).to.not.equal('none');
        });

        it('should remove "save without location" checkbox when retry is clicked', async () => {
          const failurePromise = Promise.resolve(GPS_FAILURE);
          (window as any).CHTCore.Geolocation.currentPromise = failurePromise;
          const { container } = initWidget();
          await failurePromise;

          (window as any).CHTCore.Geolocation.retry = sinon.stub().callsFake(() => {
            (window as any).CHTCore.Geolocation.currentPromise = new Promise(() => {});
          });
          (container.querySelector(SELECTORS.RETRY_BTN) as HTMLElement).click();

          expect(container.querySelector(SELECTORS.SAVE_WITHOUT_LABEL)).to.be.null;
        });
      });

      describe('save-without checkbox', () => {
        const initWidgetAfterFailure = async () => {
          const promise = Promise.resolve(GPS_FAILURE);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const result = initWidget();
          await promise;
          return result;
        };

        it('should set value to "skipped" when checked', async () => {
          const { widget, container } = await initWidgetAfterFailure();
          const checkbox = container.querySelector(SELECTORS.SAVE_WITHOUT_CHECKBOX) as HTMLInputElement;
          checkbox.checked = true;
          $(checkbox).trigger('change');
          expect((widget.element as HTMLInputElement).value).to.equal('skipped');
        });

        it('should fire a change event when checked', async () => {
          const { widget, container } = await initWidgetAfterFailure();
          const changeHandler = sinon.stub();
          $((widget.element as HTMLInputElement)).on('change', changeHandler);
          const checkbox = container.querySelector(SELECTORS.SAVE_WITHOUT_CHECKBOX) as HTMLInputElement;
          checkbox.checked = true;
          $(checkbox).trigger('change');
          expect(changeHandler.callCount).to.equal(1);
        });

        it('should clear value when unchecked', async () => {
          const { widget, container } = await initWidgetAfterFailure();
          const checkbox = container.querySelector(SELECTORS.SAVE_WITHOUT_CHECKBOX) as HTMLInputElement;
          checkbox.checked = true;
          $(checkbox).trigger('change');
          checkbox.checked = false;
          $(checkbox).trigger('change');
          expect((widget.element as HTMLInputElement).value).to.equal('');
        });

        it('should cancel the pending geolocation handle when checked', async () => {
          const { container } = await initWidgetAfterFailure();
          const checkbox = container.querySelector(SELECTORS.SAVE_WITHOUT_CHECKBOX) as HTMLInputElement;
          checkbox.checked = true;
          $(checkbox).trigger('change');
          expect((window as any).CHTCore.Geolocation.currentHandle.cancel.callCount).to.equal(1);
        });

        it('should not cancel the pending geolocation handle when unchecked', async () => {
          const { container } = await initWidgetAfterFailure();
          const checkbox = container.querySelector(SELECTORS.SAVE_WITHOUT_CHECKBOX) as HTMLInputElement;
          checkbox.checked = true;
          $(checkbox).trigger('change');
          (window as any).CHTCore.Geolocation.currentHandle.cancel.resetHistory();

          checkbox.checked = false;
          $(checkbox).trigger('change');

          expect((window as any).CHTCore.Geolocation.currentHandle.cancel.callCount).to.equal(0);
        });

        it('should not throw when currentHandle is unavailable', async () => {
          const { container } = await initWidgetAfterFailure();
          (window as any).CHTCore.Geolocation.currentHandle = undefined;
          const checkbox = container.querySelector(SELECTORS.SAVE_WITHOUT_CHECKBOX) as HTMLInputElement;
          checkbox.checked = true;
          expect(() => $(checkbox).trigger('change')).to.not.throw();
        });
      });

      describe('when GPS fails with a real permission-denied error code', () => {
        const initWidgetAfterPermissionDeniedFailure = async () => {
          const promise = Promise.resolve(GPS_PERMISSION_DENIED);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const result = initWidget();
          await promise;
          return result;
        };

        it('should show permission-denied message instead of generic failure message', async () => {
          const { container } = await initWidgetAfterPermissionDeniedFailure();
          expect(container.querySelector(SELECTORS.PERMISSION_DENIED)).to.not.be.null;
          expect(container.querySelector(SELECTORS.FAILURE_MSG)).to.be.null;
        });

        it('should show save-without checkbox', async () => {
          const { container } = await initWidgetAfterPermissionDeniedFailure();
          expect(container.querySelector(SELECTORS.SAVE_WITHOUT_LABEL)).to.not.be.null;
        });

        it('should not show retry button', async () => {
          const { container } = await initWidgetAfterPermissionDeniedFailure();
          expect(container.querySelector(SELECTORS.RETRY_BTN)).to.be.null;
        });

        it('should not show weak signal message', async () => {
          const { container } = await initWidgetAfterPermissionDeniedFailure();
          expect(container.querySelector(SELECTORS.SIGNAL_WEAK_MSG)).to.be.null;
        });

        it('should hide the progress row', async () => {
          const { container } = await initWidgetAfterPermissionDeniedFailure();
          const progressRow = container.querySelector(SELECTORS.PROGRESS_ROW) as HTMLElement;
          expect(progressRow.style.display).to.equal('none');
        });
      });

      describe('when isPermissionDenied() reports stale/unrelated live state', () => {
        it('should show the generic failure message, not permission-denied, for a timeout error', async () => {
          const promise = Promise.resolve(GPS_FAILURE);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const { container } = initWidget();
          // Live permission state says "denied", but this specific attempt failed with a timeout (-2),
          // not a permission error. The message must reflect the actual error, not the live state.
          (window as any).CHTCore.Geolocation.isPermissionDenied = sinon.stub().returns(true);
          await promise;

          expect(container.querySelector(SELECTORS.FAILURE_MSG)).to.not.be.null;
          expect(container.querySelector(SELECTORS.PERMISSION_DENIED)).to.be.null;
        });
      });
    });

    describe('edit flow (no prior location)', () => {
      const buildEditHtml = () => {
        document.body.insertAdjacentHTML('afterbegin', `
          <div id="geolocation-widget-test">
            <label class="question non-select or-appearance-geolocation-capture">
              <input type="hidden" name="/geolocation/capture" data-type-xml="string"
                data-geo-is-edit="true" />
            </label>
          </div>`);
      };

      const initEditWidget = () => {
        buildEditHtml();
        const widget = Object.create(HouseholdGeolocationWidget.prototype);
        widget.element = document.querySelector(
          '#geolocation-widget-test ' + HouseholdGeolocationWidget.selector
        );
        widget.question = widget.element.closest('.question');
        widget._init();
        const container = document.querySelector(
          '#geolocation-widget-test ' + SELECTORS.GEO_CAPTURE_LABEL
        )!;
        return { widget, container };
      };

      it('should show no-location message', () => {
        const { container } = initEditWidget();
        expect(container.querySelector(SELECTORS.NO_LOCATION_MSG)).to.not.be.null;
      });

      it('should not show edit badge', () => {
        const { container } = initEditWidget();
        expect(container.querySelector(SELECTORS.EDIT_BADGE)).to.be.null;
      });

      it('should show progress bar immediately', () => {
        const { container } = initEditWidget();
        expect(container.querySelector(SELECTORS.PROGRESS_BAR)).to.not.be.null;
      });

      it('should not show "save without location" checkbox before GPS resolves', () => {
        const { container } = initEditWidget();
        expect(container.querySelector(SELECTORS.SAVE_WITHOUT_LABEL)).to.be.null;
      });

      it('should not show context choices before GPS resolves', () => {
        const { container } = initEditWidget();
        expect(container.querySelector(SELECTORS.CONTEXT_OPTIONS)).to.be.null;
      });

      it('should show context choices after GPS succeeds', async () => {
        const promise = Promise.resolve(GPS_SUCCESS);
        (window as any).CHTCore.Geolocation.currentPromise = promise;
        const { container } = initEditWidget();
        await promise;
        expect(container.querySelector(SELECTORS.CONTEXT_OPTIONS)).to.not.be.null;
        expect(container.querySelector(SELECTORS.AT_HOUSEHOLD_RADIO)).to.not.be.null;
        expect(container.querySelector(SELECTORS.SOMEWHERE_ELSE_RADIO)).to.not.be.null;
      });

      it('should show failure UI and "save without location" checkbox after GPS fails', async () => {
        const promise = Promise.resolve(GPS_FAILURE);
        (window as any).CHTCore.Geolocation.currentPromise = promise;
        const { container } = initEditWidget();
        await promise;
        expect(container.querySelector(SELECTORS.FAILURE_MSG)).to.not.be.null;
        expect(container.querySelector(SELECTORS.RETRY_BTN)).to.not.be.null;
        expect(container.querySelector(SELECTORS.SAVE_WITHOUT_LABEL)).to.not.be.null;
      });

      it('should set value to "skipped" when "save without location" checkbox is checked after GPS fails', async () => {
        const promise = Promise.resolve(GPS_FAILURE);
        (window as any).CHTCore.Geolocation.currentPromise = promise;
        const { widget, container } = initEditWidget();
        await promise;
        const checkbox = container.querySelector(SELECTORS.SAVE_WITHOUT_CHECKBOX) as HTMLInputElement;
        checkbox.checked = true;
        $(checkbox).trigger('change');
        expect((widget.element as HTMLInputElement).value).to.equal('skipped');
      });
    });

    describe('edit flow (with prior location)', () => {
      const buildEditWithLocationHtml = () => {
        document.body.insertAdjacentHTML('afterbegin', `
          <div id="geolocation-widget-test">
            <label class="question non-select or-appearance-geolocation-capture">
              <input type="hidden" name="/geolocation/capture" data-type-xml="string"
                data-geo-is-edit="true" data-geo-has-location="true" />
            </label>
          </div>`);
      };

      const initEditWithLocationWidget = () => {
        buildEditWithLocationHtml();
        const widget = Object.create(HouseholdGeolocationWidget.prototype);
        widget.element = document.querySelector(
          '#geolocation-widget-test ' + HouseholdGeolocationWidget.selector
        );
        widget.question = widget.element.closest('.question');
        widget._init();
        const container = document.querySelector(
          '#geolocation-widget-test ' + SELECTORS.GEO_CAPTURE_LABEL
        )!;
        return { widget, container };
      };

      it('should show edit badge', () => {
        const { container } = initEditWithLocationWidget();
        expect(container.querySelector(SELECTORS.EDIT_BADGE)).to.not.be.null;
      });

      it('should show Keep, Change location, Not at household, and Remove choices', () => {
        const { container } = initEditWithLocationWidget();
        const choices = container.querySelector(SELECTORS.EDIT_CHOICES);
        expect(choices).to.not.be.null;
        expect(choices!.querySelector(SELECTORS.KEEP_RADIO)).to.not.be.null;
        expect(choices!.querySelector(SELECTORS.CHANGE_LOCATION_RADIO)).to.not.be.null;
        expect(choices!.querySelector(SELECTORS.NOT_AT_HOUSEHOLD_RADIO)).to.not.be.null;
        expect(choices!.querySelector(SELECTORS.REMOVE_RADIO)).to.not.be.null;
      });

      it('should show progress bar immediately', () => {
        const { container } = initEditWithLocationWidget();
        expect(container.querySelector(SELECTORS.PROGRESS_BAR)).to.not.be.null;
      });

      it('should hide the progress row on GPS success without selecting a change option', async () => {
        const promise = Promise.resolve(GPS_SUCCESS);
        (window as any).CHTCore.Geolocation.currentPromise = promise;
        const { container } = initEditWithLocationWidget();
        await promise;
        const progressRow = container.querySelector(SELECTORS.PROGRESS_ROW) as HTMLElement;
        expect(progressRow.style.display).to.equal('none');
      });

      it('should hide the progress row on GPS failure without selecting a change option', async () => {
        const promise = Promise.resolve(GPS_FAILURE);
        (window as any).CHTCore.Geolocation.currentPromise = promise;
        const { container } = initEditWithLocationWidget();
        await promise;
        const progressRow = container.querySelector(SELECTORS.PROGRESS_ROW) as HTMLElement;
        expect(progressRow.style.display).to.equal('none');
      });

      it('should show failure message on GPS failure without selecting Record New', async () => {
        const promise = Promise.resolve(GPS_FAILURE);
        (window as any).CHTCore.Geolocation.currentPromise = promise;
        const { container } = initEditWithLocationWidget();
        await promise;
        expect(container.querySelector(SELECTORS.FAILURE_MSG)).to.not.be.null;
      });

      it('should show retry button on GPS failure without selecting Record New', async () => {
        const promise = Promise.resolve(GPS_FAILURE);
        (window as any).CHTCore.Geolocation.currentPromise = promise;
        const { container } = initEditWithLocationWidget();
        await promise;
        expect(container.querySelector(SELECTORS.RETRY_BTN)).to.not.be.null;
      });

      it('should show retry button inside geolocation-status, positioned above the edit choices', async () => {
        const promise = Promise.resolve(GPS_FAILURE);
        (window as any).CHTCore.Geolocation.currentPromise = promise;
        const { container } = initEditWithLocationWidget();
        await promise;

        const statusEl = container.querySelector('.geolocation-status')!;
        expect(statusEl.querySelector(SELECTORS.RETRY_BTN)).to.not.be.null;

        const children = Array.from(container.children);
        const statusIndex = children.indexOf(statusEl);
        const choicesIndex = children.findIndex(el => el.classList.contains('geolocation-edit-choices'));
        expect(statusIndex).to.be.lessThan(choicesIndex);
      });

      it('should not show "save without location" checkbox on GPS failure without selecting Record New', async () => {
        const promise = Promise.resolve(GPS_FAILURE);
        (window as any).CHTCore.Geolocation.currentPromise = promise;
        const { container } = initEditWithLocationWidget();
        await promise;
        expect(container.querySelector(SELECTORS.SAVE_WITHOUT_LABEL)).to.be.null;
      });

      it('should have "Change household location" and "I am not at the household" radios disabled initially', () => {
        const { container } = initEditWithLocationWidget();
        const changeLocation = container.querySelector(SELECTORS.CHANGE_LOCATION_RADIO) as HTMLInputElement;
        const notAtHousehold = container.querySelector(SELECTORS.NOT_AT_HOUSEHOLD_RADIO) as HTMLInputElement;
        expect(changeLocation.disabled).to.be.true;
        expect(notAtHousehold.disabled).to.be.true;
      });

      it('should enable "Change household location" and "I am not at the household" radios on GPS success',
        async () => {
          const promise = Promise.resolve(GPS_SUCCESS);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const { container } = initEditWithLocationWidget();
          await promise;
          const changeLocation = container.querySelector(SELECTORS.CHANGE_LOCATION_RADIO) as HTMLInputElement;
          const notAtHousehold = container.querySelector(SELECTORS.NOT_AT_HOUSEHOLD_RADIO) as HTMLInputElement;
          expect(changeLocation.disabled).to.be.false;
          expect(notAtHousehold.disabled).to.be.false;
        });

      it('should keep "Change household location" and "I am not at the household" radios disabled on GPS failure',
        async () => {
          const promise = Promise.resolve(GPS_FAILURE);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const { container } = initEditWithLocationWidget();
          await promise;
          const changeLocation = container.querySelector(SELECTORS.CHANGE_LOCATION_RADIO) as HTMLInputElement;
          const notAtHousehold = container.querySelector(SELECTORS.NOT_AT_HOUSEHOLD_RADIO) as HTMLInputElement;
          expect(changeLocation.disabled).to.be.true;
          expect(notAtHousehold.disabled).to.be.true;
        });

      it('should not show "save without location" checkbox on GPS failure', async () => {
        const promise = Promise.resolve(GPS_FAILURE);
        (window as any).CHTCore.Geolocation.currentPromise = promise;
        const { container } = initEditWithLocationWidget();
        await promise;
        expect(container.querySelector(SELECTORS.SAVE_WITHOUT_LABEL)).to.be.null;
      });

      it('should not show context choices on GPS success without selecting a change option', async () => {
        const promise = Promise.resolve(GPS_SUCCESS);
        (window as any).CHTCore.Geolocation.currentPromise = promise;
        const { container } = initEditWithLocationWidget();
        await promise;
        expect(container.querySelector(SELECTORS.CONTEXT_OPTIONS)).to.be.null;
      });

      it('should not show "save without location" checkbox initially', () => {
        const { container } = initEditWithLocationWidget();
        expect(container.querySelector(SELECTORS.SAVE_WITHOUT_LABEL)).to.be.null;
      });

      it('should not show no-location message', () => {
        const { container } = initEditWithLocationWidget();
        expect(container.querySelector(SELECTORS.NO_LOCATION_MSG)).to.be.null;
      });

      it('should have "Keep saved location" selected by default', () => {
        const { container } = initEditWithLocationWidget();
        const keepRadio = container.querySelector(SELECTORS.KEEP_RADIO) as HTMLInputElement;
        expect(keepRadio.checked).to.be.true;
      });

      it('should set value to "kept" on initialization', async () => {
        const { widget } = initEditWithLocationWidget();
        await new Promise(resolve => setTimeout(resolve, 0));
        expect((widget.element as HTMLInputElement).value).to.equal('kept');
      });

      describe('when "Keep saved location" is selected', () => {
        it('should set value to "kept"', () => {
          const { widget, container } = initEditWithLocationWidget();
          const radio = container.querySelector(SELECTORS.KEEP_RADIO) as HTMLInputElement;
          radio.checked = true;
          $(radio).trigger('change');
          expect((widget.element as HTMLInputElement).value).to.equal('kept');
        });

        it('should fire a change event on the element', () => {
          const { widget, container } = initEditWithLocationWidget();
          const changeHandler = sinon.stub();
          $((widget.element as HTMLInputElement)).on('change', changeHandler);
          const radio = container.querySelector(SELECTORS.KEEP_RADIO) as HTMLInputElement;
          radio.checked = true;
          $(radio).trigger('change');
          expect(changeHandler.callCount).to.equal(1);
        });

      });

      describe('when "Remove saved location" is selected', () => {
        it('should set value to "skipped"', () => {
          const { widget, container } = initEditWithLocationWidget();
          const radio = container.querySelector(SELECTORS.REMOVE_RADIO) as HTMLInputElement;
          radio.checked = true;
          $(radio).trigger('change');
          expect((widget.element as HTMLInputElement).value).to.equal('skipped');
        });

        it('should fire a change event on the element', () => {
          const { widget, container } = initEditWithLocationWidget();
          const changeHandler = sinon.stub();
          $((widget.element as HTMLInputElement)).on('change', changeHandler);
          const radio = container.querySelector(SELECTORS.REMOVE_RADIO) as HTMLInputElement;
          radio.checked = true;
          $(radio).trigger('change');
          expect(changeHandler.callCount).to.equal(1);
        });

      });

      describe('when "Change household location" is selected', () => {
        const selectChangeLocation = ({ container }: { container: Element }) => {
          const radio = container.querySelector(SELECTORS.CHANGE_LOCATION_RADIO) as HTMLInputElement;
          radio.checked = true;
          $(radio).trigger('change');
        };

        it('should set value to "captured" and geo-context to "home"', async () => {
          const promise = Promise.resolve(GPS_SUCCESS);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const result = initEditWithLocationWidget();
          await promise;
          selectChangeLocation(result);
          expect((result.widget.element as HTMLInputElement).value).to.equal('captured');
          expect((result.widget.element as HTMLInputElement).dataset.geoContext).to.equal('home');
        });

        it('should fire a change event on the element', async () => {
          const promise = Promise.resolve(GPS_SUCCESS);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const result = initEditWithLocationWidget();
          await promise;
          const changeHandler = sinon.stub();
          $((result.widget.element as HTMLInputElement)).on('change', changeHandler);
          selectChangeLocation(result);
          expect(changeHandler.callCount).to.equal(1);
        });

        it('should keep the edit choices visible', async () => {
          const promise = Promise.resolve(GPS_SUCCESS);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const result = initEditWithLocationWidget();
          await promise;
          selectChangeLocation(result);
          expect(result.container.querySelector(SELECTORS.EDIT_CHOICES)).to.not.be.null;
        });

        it('should not show context choices', async () => {
          const promise = Promise.resolve(GPS_SUCCESS);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const result = initEditWithLocationWidget();
          await promise;
          selectChangeLocation(result);
          expect(result.container.querySelector(SELECTORS.CONTEXT_OPTIONS)).to.be.null;
        });
      });

      describe('when "I am not at the household" is selected', () => {
        const selectNotAtHousehold = ({ container }: { container: Element }) => {
          const radio = container.querySelector(SELECTORS.NOT_AT_HOUSEHOLD_RADIO) as HTMLInputElement;
          radio.checked = true;
          $(radio).trigger('change');
        };

        it('should set value to "captured" and geo-context to "other"', async () => {
          const promise = Promise.resolve(GPS_SUCCESS);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const result = initEditWithLocationWidget();
          await promise;
          selectNotAtHousehold(result);
          expect((result.widget.element as HTMLInputElement).value).to.equal('captured');
          expect((result.widget.element as HTMLInputElement).dataset.geoContext).to.equal('other');
        });

        it('should fire a change event on the element', async () => {
          const promise = Promise.resolve(GPS_SUCCESS);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const result = initEditWithLocationWidget();
          await promise;
          const changeHandler = sinon.stub();
          $((result.widget.element as HTMLInputElement)).on('change', changeHandler);
          selectNotAtHousehold(result);
          expect(changeHandler.callCount).to.equal(1);
        });

        it('should keep the edit choices visible', async () => {
          const promise = Promise.resolve(GPS_SUCCESS);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const result = initEditWithLocationWidget();
          await promise;
          selectNotAtHousehold(result);
          expect(result.container.querySelector(SELECTORS.EDIT_CHOICES)).to.not.be.null;
        });

        it('should not show context choices', async () => {
          const promise = Promise.resolve(GPS_SUCCESS);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const result = initEditWithLocationWidget();
          await promise;
          selectNotAtHousehold(result);
          expect(result.container.querySelector(SELECTORS.CONTEXT_OPTIONS)).to.be.null;
        });
      });

      it('should not add duplicate UI when toggling between Keep and Change household location', async () => {
        const promise = Promise.resolve(GPS_SUCCESS);
        (window as any).CHTCore.Geolocation.currentPromise = promise;
        const result = initEditWithLocationWidget();
        await promise;

        const changeLocationRadio = result.container.querySelector(SELECTORS.CHANGE_LOCATION_RADIO) as
          HTMLInputElement;
        changeLocationRadio.checked = true;
        $(changeLocationRadio).trigger('change');

        const keepRadio = result.container.querySelector(SELECTORS.KEEP_RADIO) as HTMLInputElement;
        keepRadio.checked = true;
        $(keepRadio).trigger('change');

        changeLocationRadio.checked = true;
        $(changeLocationRadio).trigger('change');

        expect(result.container.querySelectorAll(SELECTORS.SUCCESS_MSG)).to.have.lengthOf(1);
      });
    });

    describe('create mode', () => {
      it('should not show no-location message', () => {
        const buildHtml = () => {
          document.body.insertAdjacentHTML('afterbegin', `
            <div id="geolocation-widget-test">
              <label class="question non-select or-appearance-geolocation-capture">
                <input type="hidden" name="/geolocation/capture" data-type-xml="string" />
              </label>
            </div>`);
        };
        buildHtml();
        const widget = Object.create(HouseholdGeolocationWidget.prototype);
        widget.element = document.querySelector(
          '#geolocation-widget-test ' + HouseholdGeolocationWidget.selector
        );
        widget.question = widget.element.closest('.question');
        widget._init();
        const container = document.querySelector(
          '#geolocation-widget-test ' + SELECTORS.GEO_CAPTURE_LABEL
        )!;
        expect(container.querySelector(SELECTORS.NO_LOCATION_MSG)).to.be.null;
      });
    });
  });
});
