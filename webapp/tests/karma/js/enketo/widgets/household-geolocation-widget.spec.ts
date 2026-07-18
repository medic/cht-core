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
  PROGRESS_BAR: '.geolocation-progress-bar',
  SUCCESS_MSG: '.geolocation-success-msg',
  FAILURE_MSG: '.geolocation-failure-msg',
  SIGNAL_WEAK_MSG: '.geolocation-weak-signal-msg',
  RETRY_BTN: '.geolocation-retry-btn',
  CONTINUE_WITHOUT_BTN: '.geolocation-continue-without-btn',
  AT_HOUSEHOLD_RADIO: 'input[type="radio"][value="home"]',
  SOMEWHERE_ELSE_RADIO: 'input[type="radio"][value="other"]',
  CONTEXT_OPTIONS: '.geolocation-context-options',
  NO_LOCATION_MSG: '.geolocation-no-location-msg',
  // Edit flow selectors (Phase 4)
  EDIT_BADGE: '.geolocation-edit-badge',
  EDIT_BADGE_CONTEXT: '.geolocation-edit-badge-context',
  EDIT_CHOICES: '.geolocation-edit-choices',
  KEEP_RADIO: 'input[type="radio"][value="kept"]',
  RECORD_NEW_RADIO: 'input[type="radio"][value="capture-new"]',
  REMOVE_RADIO: 'input[type="radio"][value="removed"]',
};

const GPS_SUCCESS = {
  latitude: 1, longitude: 2, altitude: 3, accuracy: 4, altitudeAccuracy: 5, heading: 6, speed: 7,
};
const GPS_FAILURE = { code: -2, message: 'Geolocation timeout exceeded' };

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

    it('should show continue-without button when permission is denied', () => {
      (window as any).CHTCore.Geolocation.isPermissionDenied = sinon.stub().returns(true);
      const { container } = initWidget();
      expect(container.querySelector(SELECTORS.CONTINUE_WITHOUT_BTN)).to.not.be.null;
    });

    it('should set value to "skipped" when continue-without button is clicked (permission denied)', () => {
      (window as any).CHTCore.Geolocation.isPermissionDenied = sinon.stub().returns(true);
      const { widget, container } = initWidget();
      (container.querySelector(SELECTORS.CONTINUE_WITHOUT_BTN) as HTMLElement).click();
      expect((widget.element as HTMLInputElement).value).to.equal('skipped');
    });

    it('should fire a change event when continue-without button is clicked (permission denied)', () => {
      (window as any).CHTCore.Geolocation.isPermissionDenied = sinon.stub().returns(true);
      const { widget, container } = initWidget();
      const changeHandler = sinon.stub();
      $((widget.element as HTMLInputElement)).on('change', changeHandler);
      (container.querySelector(SELECTORS.CONTINUE_WITHOUT_BTN) as HTMLElement).click();
      expect(changeHandler.callCount).to.equal(1);
    });

    it('should remove permission-denied message when geolocationPermissionGranted event fires', () => {
      (window as any).CHTCore.Geolocation.isPermissionDenied = sinon.stub().returns(true);
      const { container } = initWidget();
      document.dispatchEvent(new CustomEvent('geolocationPermissionGranted'));
      expect(container.querySelector(SELECTORS.PERMISSION_DENIED)).to.be.null;
    });

    it('should remove continue-without button when geolocationPermissionGranted event fires', () => {
      (window as any).CHTCore.Geolocation.isPermissionDenied = sinon.stub().returns(true);
      const { container } = initWidget();
      document.dispatchEvent(new CustomEvent('geolocationPermissionGranted'));
      expect(container.querySelector(SELECTORS.CONTINUE_WITHOUT_BTN)).to.be.null;
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

    it('should show continue-without button when Geolocation API is absent', () => {
      (window as any).CHTCore.Geolocation.isAvailable = sinon.stub().returns(false);
      const { container } = initWidget();
      expect(container.querySelector(SELECTORS.CONTINUE_WITHOUT_BTN)).to.not.be.null;
    });

    it('should set value to "skipped" when continue-without button is clicked (unavailable)', () => {
      (window as any).CHTCore.Geolocation.isAvailable = sinon.stub().returns(false);
      const { widget, container } = initWidget();
      (container.querySelector(SELECTORS.CONTINUE_WITHOUT_BTN) as HTMLElement).click();
      expect((widget.element as HTMLInputElement).value).to.equal('skipped');
    });

    it('should fire a change event when continue-without button is clicked (unavailable)', () => {
      (window as any).CHTCore.Geolocation.isAvailable = sinon.stub().returns(false);
      const { widget, container } = initWidget();
      const changeHandler = sinon.stub();
      $((widget.element as HTMLInputElement)).on('change', changeHandler);
      (container.querySelector(SELECTORS.CONTINUE_WITHOUT_BTN) as HTMLElement).click();
      expect(changeHandler.callCount).to.equal(1);
    });

    describe('create flow', () => {
      it('should show progress bar immediately without any user action', () => {
        const { container } = initWidget();
        expect(container.querySelector(SELECTORS.PROGRESS_BAR)).to.not.be.null;
      });

      it('should not show "continue without location" button before GPS resolves', () => {
        const { container } = initWidget();
        expect(container.querySelector(SELECTORS.CONTINUE_WITHOUT_BTN)).to.be.null;
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
        it('should add success class to progress bar', async () => {
          const promise = Promise.resolve(GPS_SUCCESS);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const { container } = initWidget();
          await promise;
          expect(
            container.querySelector(SELECTORS.PROGRESS_BAR)!.classList.contains('geolocation-progress-success')
          ).to.be.true;
        });

        it('should not add failure class to progress bar on success', async () => {
          const promise = Promise.resolve(GPS_SUCCESS);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const { container } = initWidget();
          await promise;
          expect(
            container.querySelector(SELECTORS.PROGRESS_BAR)!.classList.contains('geolocation-progress-failure')
          ).to.be.false;
        });

        it('should show success message', async () => {
          const promise = Promise.resolve(GPS_SUCCESS);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const { container } = initWidget();
          await promise;
          expect(container.querySelector(SELECTORS.SUCCESS_MSG)).to.not.be.null;
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

        it('should not show "continue without location" button on GPS success', async () => {
          const promise = Promise.resolve(GPS_SUCCESS);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const { container } = initWidget();
          await promise;
          expect(container.querySelector(SELECTORS.CONTINUE_WITHOUT_BTN)).to.be.null;
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
        it('should add failure class to progress bar', async () => {
          const promise = Promise.resolve(GPS_FAILURE);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const { container } = initWidget();
          await promise;
          expect(
            container.querySelector(SELECTORS.PROGRESS_BAR)!.classList.contains('geolocation-progress-failure')
          ).to.be.true;
        });

        it('should not add success class to progress bar on failure', async () => {
          const promise = Promise.resolve(GPS_FAILURE);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const { container } = initWidget();
          await promise;
          expect(
            container.querySelector(SELECTORS.PROGRESS_BAR)!.classList.contains('geolocation-progress-success')
          ).to.be.false;
        });

        it('should show failure message', async () => {
          const promise = Promise.resolve(GPS_FAILURE);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const { container } = initWidget();
          await promise;
          expect(container.querySelector(SELECTORS.FAILURE_MSG)).to.not.be.null;
        });

        it('should show retry button', async () => {
          const promise = Promise.resolve(GPS_FAILURE);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const { container } = initWidget();
          await promise;
          expect(container.querySelector(SELECTORS.RETRY_BTN)).to.not.be.null;
        });

        it('should show "continue without location" button after GPS failure', async () => {
          const promise = Promise.resolve(GPS_FAILURE);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const { container } = initWidget();
          await promise;
          expect(container.querySelector(SELECTORS.CONTINUE_WITHOUT_BTN)).to.not.be.null;
        });

        it('should style "continue without location" button the same as retry button', async () => {
          const promise = Promise.resolve(GPS_FAILURE);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const { container } = initWidget();
          await promise;
          const cantRecordBtn = container.querySelector(SELECTORS.CONTINUE_WITHOUT_BTN)!;
          expect(cantRecordBtn.classList.contains('btn-default')).to.be.true;
          expect(cantRecordBtn.classList.contains('btn-link')).to.be.false;
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
        });

        it('should remove "continue without location" button when retry is clicked', async () => {
          const failurePromise = Promise.resolve(GPS_FAILURE);
          (window as any).CHTCore.Geolocation.currentPromise = failurePromise;
          const { container } = initWidget();
          await failurePromise;

          (window as any).CHTCore.Geolocation.retry = sinon.stub().callsFake(() => {
            (window as any).CHTCore.Geolocation.currentPromise = new Promise(() => {});
          });
          (container.querySelector(SELECTORS.RETRY_BTN) as HTMLElement).click();

          expect(container.querySelector(SELECTORS.CONTINUE_WITHOUT_BTN)).to.be.null;
        });
      });

      describe('continue-without button', () => {
        const initWidgetAfterFailure = async () => {
          const promise = Promise.resolve(GPS_FAILURE);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const result = initWidget();
          await promise;
          return result;
        };

        it('should set value to "skipped" when clicked', async () => {
          const { widget, container } = await initWidgetAfterFailure();
          (container.querySelector(SELECTORS.CONTINUE_WITHOUT_BTN) as HTMLElement).click();
          expect((widget.element as HTMLInputElement).value).to.equal('skipped');
        });

        it('should fire a change event when clicked', async () => {
          const { widget, container } = await initWidgetAfterFailure();
          const changeHandler = sinon.stub();
          $((widget.element as HTMLInputElement)).on('change', changeHandler);
          (container.querySelector(SELECTORS.CONTINUE_WITHOUT_BTN) as HTMLElement).click();
          expect(changeHandler.callCount).to.equal(1);
        });
      });

      describe('when permission is denied at GPS failure time', () => {
        const initWidgetAfterPermissionDeniedFailure = async () => {
          const promise = Promise.resolve(GPS_FAILURE);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const result = initWidget();
          (window as any).CHTCore.Geolocation.isPermissionDenied = sinon.stub().returns(true);
          await promise;
          return result;
        };

        it('should show permission-denied message instead of generic failure message', async () => {
          const { container } = await initWidgetAfterPermissionDeniedFailure();
          expect(container.querySelector(SELECTORS.PERMISSION_DENIED)).to.not.be.null;
          expect(container.querySelector(SELECTORS.FAILURE_MSG)).to.be.null;
        });

        it('should show continue-without button', async () => {
          const { container } = await initWidgetAfterPermissionDeniedFailure();
          expect(container.querySelector(SELECTORS.CONTINUE_WITHOUT_BTN)).to.not.be.null;
        });

        it('should not show retry button', async () => {
          const { container } = await initWidgetAfterPermissionDeniedFailure();
          expect(container.querySelector(SELECTORS.RETRY_BTN)).to.be.null;
        });

        it('should not show weak signal message', async () => {
          const { container } = await initWidgetAfterPermissionDeniedFailure();
          expect(container.querySelector(SELECTORS.SIGNAL_WEAK_MSG)).to.be.null;
        });

        it('should mark the progress bar as failed', async () => {
          const { container } = await initWidgetAfterPermissionDeniedFailure();
          expect(container.querySelector('.geolocation-progress-bar.geolocation-progress-failure'))
            .to.not.be.null;
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

      it('should not show "continue without location" button before GPS resolves', () => {
        const { container } = initEditWidget();
        expect(container.querySelector(SELECTORS.CONTINUE_WITHOUT_BTN)).to.be.null;
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

      it('should show failure UI and keep "continue without location" after GPS fails', async () => {
        const promise = Promise.resolve(GPS_FAILURE);
        (window as any).CHTCore.Geolocation.currentPromise = promise;
        const { container } = initEditWidget();
        await promise;
        expect(container.querySelector(SELECTORS.FAILURE_MSG)).to.not.be.null;
        expect(container.querySelector(SELECTORS.RETRY_BTN)).to.not.be.null;
        expect(container.querySelector(SELECTORS.CONTINUE_WITHOUT_BTN)).to.not.be.null;
      });

      it('should set value to "skipped" when "continue without location" is clicked after GPS fails', async () => {
        const promise = Promise.resolve(GPS_FAILURE);
        (window as any).CHTCore.Geolocation.currentPromise = promise;
        const { widget, container } = initEditWidget();
        await promise;
        (container.querySelector(SELECTORS.CONTINUE_WITHOUT_BTN) as HTMLElement).click();
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

      it('should show Keep, Record New, and Remove choices', () => {
        const { container } = initEditWithLocationWidget();
        const choices = container.querySelector(SELECTORS.EDIT_CHOICES);
        expect(choices).to.not.be.null;
        expect(choices!.querySelector(SELECTORS.KEEP_RADIO)).to.not.be.null;
        expect(choices!.querySelector(SELECTORS.RECORD_NEW_RADIO)).to.not.be.null;
        expect(choices!.querySelector(SELECTORS.REMOVE_RADIO)).to.not.be.null;
      });

      it('should show progress bar immediately', () => {
        const { container } = initEditWithLocationWidget();
        expect(container.querySelector(SELECTORS.PROGRESS_BAR)).to.not.be.null;
      });

      it('should add success class to progress bar on GPS success without selecting Record New', async () => {
        const promise = Promise.resolve(GPS_SUCCESS);
        (window as any).CHTCore.Geolocation.currentPromise = promise;
        const { container } = initEditWithLocationWidget();
        await promise;
        expect(
          container.querySelector(SELECTORS.PROGRESS_BAR)!.classList.contains('geolocation-progress-success')
        ).to.be.true;
      });

      it('should add failure class to progress bar on GPS failure without selecting Record New', async () => {
        const promise = Promise.resolve(GPS_FAILURE);
        (window as any).CHTCore.Geolocation.currentPromise = promise;
        const { container } = initEditWithLocationWidget();
        await promise;
        expect(
          container.querySelector(SELECTORS.PROGRESS_BAR)!.classList.contains('geolocation-progress-failure')
        ).to.be.true;
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

      it('should show retry button above the edit choices', async () => {
        const promise = Promise.resolve(GPS_FAILURE);
        (window as any).CHTCore.Geolocation.currentPromise = promise;
        const { container } = initEditWithLocationWidget();
        await promise;
        const children = Array.from(container.children);
        const retryIndex = children.findIndex(el => el.classList.contains('geolocation-retry-btn'));
        const choicesIndex = children.findIndex(el => el.classList.contains('geolocation-edit-choices'));
        expect(retryIndex).to.be.lessThan(choicesIndex);
      });

      it('should not show "continue without location" button on GPS failure without selecting Record New', async () => {
        const promise = Promise.resolve(GPS_FAILURE);
        (window as any).CHTCore.Geolocation.currentPromise = promise;
        const { container } = initEditWithLocationWidget();
        await promise;
        expect(container.querySelector(SELECTORS.CONTINUE_WITHOUT_BTN)).to.be.null;
      });

      it('should not show context choices on GPS success without selecting Record New', async () => {
        const promise = Promise.resolve(GPS_SUCCESS);
        (window as any).CHTCore.Geolocation.currentPromise = promise;
        const { container } = initEditWithLocationWidget();
        await promise;
        expect(container.querySelector(SELECTORS.CONTEXT_OPTIONS)).to.be.null;
      });

      it('should not show "continue without location" button initially', () => {
        const { container } = initEditWithLocationWidget();
        expect(container.querySelector(SELECTORS.CONTINUE_WITHOUT_BTN)).to.be.null;
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

        it('should remove context options when switching from Record New after GPS success', async () => {
          const promise = Promise.resolve(GPS_SUCCESS);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const result = initEditWithLocationWidget();
          const recordNewRadio = result.container.querySelector(SELECTORS.RECORD_NEW_RADIO) as HTMLInputElement;
          recordNewRadio.checked = true;
          $(recordNewRadio).trigger('change');
          await promise;
          expect(result.container.querySelector(SELECTORS.CONTEXT_OPTIONS)).to.not.be.null;
          const keepRadio = result.container.querySelector(SELECTORS.KEEP_RADIO) as HTMLInputElement;
          keepRadio.checked = true;
          $(keepRadio).trigger('change');
          expect(result.container.querySelector(SELECTORS.CONTEXT_OPTIONS)).to.be.null;
        });

        it('should remove the cant-record button when switching from Record New after GPS failure', async () => {
          const promise = Promise.resolve(GPS_FAILURE);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const result = initEditWithLocationWidget();
          const recordNewRadio = result.container.querySelector(SELECTORS.RECORD_NEW_RADIO) as HTMLInputElement;
          recordNewRadio.checked = true;
          $(recordNewRadio).trigger('change');
          await promise;
          expect(result.container.querySelector(SELECTORS.CONTINUE_WITHOUT_BTN)).to.not.be.null;
          const keepRadio = result.container.querySelector(SELECTORS.KEEP_RADIO) as HTMLInputElement;
          keepRadio.checked = true;
          $(keepRadio).trigger('change');
          expect(result.container.querySelector(SELECTORS.CONTINUE_WITHOUT_BTN)).to.be.null;
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

        it('should remove context options when switching from Record New after GPS success', async () => {
          const promise = Promise.resolve(GPS_SUCCESS);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const result = initEditWithLocationWidget();
          const recordNewRadio = result.container.querySelector(SELECTORS.RECORD_NEW_RADIO) as HTMLInputElement;
          recordNewRadio.checked = true;
          $(recordNewRadio).trigger('change');
          await promise;
          expect(result.container.querySelector(SELECTORS.CONTEXT_OPTIONS)).to.not.be.null;
          const removeRadio = result.container.querySelector(SELECTORS.REMOVE_RADIO) as HTMLInputElement;
          removeRadio.checked = true;
          $(removeRadio).trigger('change');
          expect(result.container.querySelector(SELECTORS.CONTEXT_OPTIONS)).to.be.null;
        });

        it('should remove the cant-record button when switching from Record New after GPS failure', async () => {
          const promise = Promise.resolve(GPS_FAILURE);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const result = initEditWithLocationWidget();
          const recordNewRadio = result.container.querySelector(SELECTORS.RECORD_NEW_RADIO) as HTMLInputElement;
          recordNewRadio.checked = true;
          $(recordNewRadio).trigger('change');
          await promise;
          expect(result.container.querySelector(SELECTORS.CONTINUE_WITHOUT_BTN)).to.not.be.null;
          const removeRadio = result.container.querySelector(SELECTORS.REMOVE_RADIO) as HTMLInputElement;
          removeRadio.checked = true;
          $(removeRadio).trigger('change');
          expect(result.container.querySelector(SELECTORS.CONTINUE_WITHOUT_BTN)).to.be.null;
        });
      });

      describe('when "Record new location" is selected', () => {
        const selectRecordNew = ({ container }: { container: Element }) => {
          const radio = container.querySelector(SELECTORS.RECORD_NEW_RADIO) as HTMLInputElement;
          radio.checked = true;
          $(radio).trigger('change');
        };

        it('should set element value to empty string', () => {
          const { widget, container } = initEditWithLocationWidget();
          const radio = container.querySelector(SELECTORS.RECORD_NEW_RADIO) as HTMLInputElement;
          radio.checked = true;
          $(radio).trigger('change');
          expect((widget.element as HTMLInputElement).value).to.equal('');
        });

        it('should fire a change event on the element', () => {
          const { widget, container } = initEditWithLocationWidget();
          const changeHandler = sinon.stub();
          $((widget.element as HTMLInputElement)).on('change', changeHandler);
          const radio = container.querySelector(SELECTORS.RECORD_NEW_RADIO) as HTMLInputElement;
          radio.checked = true;
          $(radio).trigger('change');
          expect(changeHandler.callCount).to.equal(1);
        });

        it('should remove invalid-required class so required error is not shown immediately', async () => {
          const { widget, container } = initEditWithLocationWidget();
          // Simulate Enketo adding invalid-required synchronously on change with empty value.
          // The widget removes it via setTimeout(0) (a macrotask), so we must await one tick.
          $((widget.element as HTMLInputElement)).on('change', () => {
            if ((widget.element as HTMLInputElement).value === '') {
              container.classList.add('invalid-required');
            }
          });
          const radio = container.querySelector(SELECTORS.RECORD_NEW_RADIO) as HTMLInputElement;
          radio.checked = true;
          $(radio).trigger('change');
          await new Promise(resolve => setTimeout(resolve, 0));
          expect(container.classList.contains('invalid-required')).to.be.false;
        });

        it('should keep the edit choices visible', () => {
          const result = initEditWithLocationWidget();
          selectRecordNew(result);
          expect(result.container.querySelector(SELECTORS.EDIT_CHOICES)).to.not.be.null;
        });

        it('should show progress bar', () => {
          const result = initEditWithLocationWidget();
          selectRecordNew(result);
          expect(result.container.querySelector(SELECTORS.PROGRESS_BAR)).to.not.be.null;
        });

        it('should show success UI after GPS succeeds', async () => {
          const promise = Promise.resolve(GPS_SUCCESS);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const result = initEditWithLocationWidget();
          selectRecordNew(result);
          await promise;
          expect(result.container.querySelector(SELECTORS.SUCCESS_MSG)).to.not.be.null;
          expect(result.container.querySelector(SELECTORS.CONTEXT_OPTIONS)).to.not.be.null;
        });

        it('should show failure UI after GPS fails', async () => {
          const promise = Promise.resolve(GPS_FAILURE);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const result = initEditWithLocationWidget();
          selectRecordNew(result);
          await promise;
          expect(result.container.querySelector(SELECTORS.FAILURE_MSG)).to.not.be.null;
          expect(result.container.querySelector(SELECTORS.RETRY_BTN)).to.not.be.null;
          expect(result.container.querySelector(SELECTORS.CONTINUE_WITHOUT_BTN)).to.not.be.null;
          expect(result.container.querySelector(SELECTORS.EDIT_CHOICES)).to.not.be.null;
        });

        it('should not add duplicate UI when toggling between Keep and Record New', async () => {
          const promise = Promise.resolve(GPS_FAILURE);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          (window as any).CHTCore.Geolocation.retry = sinon.stub();
          const result = initEditWithLocationWidget();

          selectRecordNew(result);
          await promise;

          const keepRadio = result.container.querySelector(SELECTORS.KEEP_RADIO) as HTMLInputElement;
          keepRadio.checked = true;
          $(keepRadio).trigger('change');

          selectRecordNew(result);
          await promise; // flush microtask queue so any re-triggered callbacks fire

          expect(result.container.querySelectorAll(SELECTORS.FAILURE_MSG)).to.have.lengthOf(1);
          expect(result.container.querySelectorAll(SELECTORS.RETRY_BTN)).to.have.lengthOf(1);
          expect(result.container.querySelectorAll(SELECTORS.CONTINUE_WITHOUT_BTN)).to.have.lengthOf(1);
        });
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
