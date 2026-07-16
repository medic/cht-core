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

    it('should set element value to "denied" when permission is denied', () => {
      (window as any).CHTCore.Geolocation.isPermissionDenied = sinon.stub().returns(true);
      const { widget } = initWidget();
      expect((widget.element as HTMLInputElement).value).to.equal('denied');
    });

    it('should show unavailable message when Geolocation API is absent', () => {
      (window as any).CHTCore.Geolocation.isAvailable = sinon.stub().returns(false);
      const { container } = initWidget();
      expect(container.querySelector(SELECTORS.UNAVAILABLE)).to.not.be.null;
    });

    it('should set element value to "unavailable" when Geolocation API is absent', () => {
      (window as any).CHTCore.Geolocation.isAvailable = sinon.stub().returns(false);
      const { widget } = initWidget();
      expect((widget.element as HTMLInputElement).value).to.equal('unavailable');
    });

    describe('create flow', () => {
      it('should show progress bar immediately without any user action', () => {
        const { container } = initWidget();
        expect(container.querySelector(SELECTORS.PROGRESS_BAR)).to.not.be.null;
      });

      it('should show "can\'t record" button immediately without any user action', () => {
        const { container } = initWidget();
        expect(container.querySelector(SELECTORS.CANT_RECORD_BTN)).to.not.be.null;
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

        it('should keep "can\'t record" button visible', async () => {
          const promise = Promise.resolve(GPS_FAILURE);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const { container } = initWidget();
          await promise;
          expect(container.querySelector(SELECTORS.CANT_RECORD_BTN)).to.not.be.null;
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

        it('should keep "can\'t record" button visible after retry is clicked', async () => {
          const failurePromise = Promise.resolve(GPS_FAILURE);
          (window as any).CHTCore.Geolocation.currentPromise = failurePromise;
          const { container } = initWidget();
          await failurePromise;

          (window as any).CHTCore.Geolocation.retry = sinon.stub().callsFake(() => {
            (window as any).CHTCore.Geolocation.currentPromise = new Promise(() => {});
          });
          (container.querySelector(SELECTORS.RETRY_BTN) as HTMLElement).click();

          expect(container.querySelector(SELECTORS.CANT_RECORD_BTN)).to.not.be.null;
        });
      });

      describe('"can\'t record" button', () => {
        it('should set value to "skipped" when clicked', () => {
          const { widget, container } = initWidget();
          (container.querySelector(SELECTORS.CANT_RECORD_BTN) as HTMLElement).click();
          expect((widget.element as HTMLInputElement).value).to.equal('skipped');
        });

        it('should fire a change event when clicked', () => {
          const { widget, container } = initWidget();
          const changeHandler = sinon.stub();
          $((widget.element as HTMLInputElement)).on('change', changeHandler);
          (container.querySelector(SELECTORS.CANT_RECORD_BTN) as HTMLElement).click();
          expect(changeHandler.callCount).to.equal(1);
        });

        it('should ignore GPS success result if "can\'t record" was clicked first', async () => {
          const promise = Promise.resolve(GPS_SUCCESS);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const { widget, container } = initWidget();

          (container.querySelector(SELECTORS.CANT_RECORD_BTN) as HTMLElement).click();
          await promise;

          expect((widget.element as HTMLInputElement).value).to.equal('skipped');
          expect(container.querySelector(SELECTORS.CONTEXT_OPTIONS)).to.be.null;
        });

        it('should ignore GPS failure result if "can\'t record" was clicked first', async () => {
          const promise = Promise.resolve(GPS_FAILURE);
          (window as any).CHTCore.Geolocation.currentPromise = promise;
          const { widget, container } = initWidget();

          (container.querySelector(SELECTORS.CANT_RECORD_BTN) as HTMLElement).click();
          await promise;

          expect((widget.element as HTMLInputElement).value).to.equal('skipped');
          expect(container.querySelector(SELECTORS.RETRY_BTN)).to.be.null;
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

      it('should show "can\'t record" button immediately', () => {
        const { container } = initEditWidget();
        expect(container.querySelector(SELECTORS.CANT_RECORD_BTN)).to.not.be.null;
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

      it('should show failure UI and keep "can\'t record" after GPS fails', async () => {
        const promise = Promise.resolve(GPS_FAILURE);
        (window as any).CHTCore.Geolocation.currentPromise = promise;
        const { container } = initEditWidget();
        await promise;
        expect(container.querySelector(SELECTORS.FAILURE_MSG)).to.not.be.null;
        expect(container.querySelector(SELECTORS.RETRY_BTN)).to.not.be.null;
        expect(container.querySelector(SELECTORS.CANT_RECORD_BTN)).to.not.be.null;
      });

      it('should set value to "skipped" when "can\'t record" is clicked', () => {
        const { widget, container } = initEditWidget();
        (container.querySelector(SELECTORS.CANT_RECORD_BTN) as HTMLElement).click();
        expect((widget.element as HTMLInputElement).value).to.equal('skipped');
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
