import jQuery from 'jquery';
import sinon from 'sinon';
import { expect } from 'chai';

const HouseholdGeolocationWidget = require('../../../../../src/js/enketo/widgets/household-geolocation-widget');

const MS_PER_DAY = 86400000;

const SELECTORS = {
  ACKNOWLEDGE_CHECKBOX: '.geolocation-acknowledge-checkbox',
  ACKNOWLEDGE_LABEL: '.geolocation-acknowledge-label',
  CAPTURE_NEW_RADIO: 'input[type="radio"][value="capture-new"]',
  CONTEXT_OPTIONS: '.geolocation-context-options',
  EDIT_ACKNOWLEDGE_CHECKBOX: '.geolocation-edit-acknowledge-checkbox',
  EDIT_BADGE: '.geolocation-edit-badge',
  EDIT_BADGE_CONTEXT: '.geolocation-edit-badge-context',
  EDIT_OPTIONS: '.geolocation-edit-options',
  EDIT_WARNING_GROUP: '.geolocation-edit-warning-group',
  GEO_CAPTURE_LABEL: '.or-appearance-geolocation-capture',
  HOME_RADIO: 'input[type="radio"][value="home"]',
  KEPT_RADIO: 'input[type="radio"][value="kept"]',
  NO_LOCATION_MSG: '.geolocation-no-location-msg',
  OTHER_RADIO: 'input[type="radio"][value="other"]',
  PERMISSION_DENIED: '.geolocation-permission-denied',
  PROGRESS_BAR: '.geolocation-progress-bar',
  RETRY_BTN: '.geolocation-retry-btn',
  SKIP_BTN: '.geolocation-skip-btn',
  SKIPPED_MSG: '.geolocation-skipped-msg',
  STATUS: '.geolocation-status',
  STATUS_ACKNOWLEDGE_CHECKBOX: '.geolocation-status .geolocation-acknowledge-checkbox',
  SUCCESS_MSG: '.geolocation-success-msg',
  UNAVAILABLE: '.geolocation-unavailable',
  WEAK_SIGNAL_MSG: '.geolocation-weak-signal-msg',
};

describe('Enketo: Household Geolocation Widget', () => {
  const $ = jQuery;
  let originalMedicmobileAndroid;
  let originalCHTCore;

  before(() => {
    originalMedicmobileAndroid = window.medicmobile_android;
    originalCHTCore = window.CHTCore;
  });

  afterEach(() => {
    sinon.restore();
    window.medicmobile_android = originalMedicmobileAndroid;
    window.CHTCore = originalCHTCore;
    $('#geolocation-widget-test').remove();
  });

  it('should have the correct selector', () => {
    expect(HouseholdGeolocationWidget.selector).to.equal(SELECTORS.GEO_CAPTURE_LABEL + ' input');
  });

  describe('_init()', () => {
    beforeEach(() => {
      window.medicmobile_android = undefined;
      window.CHTCore = {
        Translate: { instant: sinon.stub().callsFake((key: string) => key) },
        Geolocation: {
          isAvailable: sinon.stub().returns(true),
          isPermissionDenied: sinon.stub().returns(false),
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
      widget.element = document.querySelector('#geolocation-widget-test ' + HouseholdGeolocationWidget.selector);
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

    it('should show permission denied message when Android location permissions are denied', () => {
      buildHtml();
      window.CHTCore.Geolocation.isPermissionDenied = sinon.stub().returns(true);
      const widget = createWidget();

      widget._init();

      const container = document.querySelector('#geolocation-widget-test ' + SELECTORS.GEO_CAPTURE_LABEL)!;
      expect(container.querySelector(SELECTORS.PERMISSION_DENIED)).to.not.be.null;
    });

    it('should set element value to "denied" when permission is denied so required validation passes', () => {
      buildHtml();
      window.CHTCore.Geolocation.isPermissionDenied = sinon.stub().returns(true);
      const widget = createWidget();

      widget._init();

      expect(widget.element.value).to.equal('denied');
    });

    it('should show unavailable message when Geolocation API is absent', () => {
      buildHtml();
      window.CHTCore.Geolocation.isAvailable = sinon.stub().returns(false);
      const widget = createWidget();

      widget._init();

      const container = document.querySelector('#geolocation-widget-test ' + SELECTORS.GEO_CAPTURE_LABEL)!;
      expect(container.querySelector(SELECTORS.UNAVAILABLE)).to.not.be.null;
    });

    it('should set element value to "unavailable" when Geolocation API is absent so required validation passes', () => {
      buildHtml();
      window.CHTCore.Geolocation.isAvailable = sinon.stub().returns(false);
      const widget = createWidget();

      widget._init();

      expect(widget.element.value).to.equal('unavailable');
    });

    it('should show context options and no error messages in normal state', () => {
      const { container } = initWidget();
      expect(container.querySelector(SELECTORS.CONTEXT_OPTIONS)).to.not.be.null;
      expect(container.querySelector(SELECTORS.PERMISSION_DENIED)).to.be.null;
      expect(container.querySelector(SELECTORS.UNAVAILABLE)).to.be.null;
    });

    it('should render home and other context options', () => {
      const { container } = initWidget();
      expect(container.querySelector(SELECTORS.CONTEXT_OPTIONS)).to.not.be.null;
      expect(container.querySelector(SELECTORS.HOME_RADIO)).to.not.be.null;
      expect(container.querySelector(SELECTORS.OTHER_RADIO)).to.not.be.null;
    });

    it('should set data-geo-context to home and start capture when home radio is selected', () => {
      window.CHTCore.Geolocation.currentPromise = new Promise(() => {});
      const { widget, container } = initWidget();
      const homeRadio = container.querySelector(SELECTORS.HOME_RADIO) as HTMLInputElement;
      homeRadio.checked = true;
      $(homeRadio).trigger('change');

      expect((widget.element as HTMLInputElement).dataset.geoContext).to.equal('home');
      expect(container.querySelector(SELECTORS.PROGRESS_BAR)).to.not.be.null;
    });

    it('should set data-geo-context to other and start capture when other radio is selected', () => {
      window.CHTCore.Geolocation.currentPromise = new Promise(() => {});
      const { widget, container } = initWidget();
      const otherRadio = container.querySelector(SELECTORS.OTHER_RADIO) as HTMLInputElement;
      otherRadio.checked = true;
      $(otherRadio).trigger('change');

      expect((widget.element as HTMLInputElement).dataset.geoContext).to.equal('other');
      expect(container.querySelector(SELECTORS.PROGRESS_BAR)).to.not.be.null;
    });

    it('should keep context options visible when a radio is selected', () => {
      window.CHTCore.Geolocation.currentPromise = new Promise(() => {});
      const { container } = initWidget();

      const contextOptions = container.querySelector(SELECTORS.CONTEXT_OPTIONS) as HTMLElement;
      expect(contextOptions.style.display).not.to.equal('none');

      const homeRadio = container.querySelector(SELECTORS.HOME_RADIO) as HTMLInputElement;
      homeRadio.checked = true;
      $(homeRadio).trigger('change');

      expect(contextOptions.style.display).not.to.equal('none');
    });

    it('should keep context options visible when capture fails', async () => {
      const promise = Promise.resolve({ code: -2, message: 'Geolocation timeout exceeded' });
      window.CHTCore.Geolocation.currentPromise = promise;
      const { container } = initWidget();
      const homeRadio = container.querySelector(SELECTORS.HOME_RADIO) as HTMLInputElement;
      homeRadio.checked = true;
      $(homeRadio).trigger('change');
      await promise;

      const contextOptions = container.querySelector(SELECTORS.CONTEXT_OPTIONS) as HTMLElement;
      expect(contextOptions.style.display).not.to.equal('none');
    });

    describe('_startCapture()', () => {
      beforeEach(() => {
        window.CHTCore.Geolocation.currentPromise = new Promise(() => {});
      });

      const selectHomeContext = () => {
        const radio = document.querySelector(
          '#geolocation-widget-test ' + SELECTORS.HOME_RADIO
        ) as HTMLInputElement;
        radio.checked = true;
        $(radio).trigger('change');
      };

      const initAndSelectHome = () => {
        buildHtml();
        const widget = createWidget();
        widget._init();
        selectHomeContext();
        const container = document.querySelector(
          '#geolocation-widget-test ' + SELECTORS.GEO_CAPTURE_LABEL
        )!;
        return { widget, container };
      };

      it('logs an error and does not throw when currentPromise is unavailable', () => {
        window.CHTCore.Geolocation.currentPromise = undefined;
        const consoleErrorStub = sinon.stub(console, 'error');

        expect(() => initAndSelectHome()).to.not.throw();
        expect(consoleErrorStub.callCount).to.equal(1);
      });

      it('should show progress bar when capture starts', () => {
        const { container } = initAndSelectHome();

        expect(container.querySelector(SELECTORS.PROGRESS_BAR)).to.not.be.null;
      });

      it('should add success class to progress bar when GPS is acquired', async () => {
        const promise = Promise.resolve({
          latitude: 1, longitude: 2, altitude: 3, accuracy: 4, altitudeAccuracy: 5, heading: 6, speed: 7
        });
        window.CHTCore.Geolocation.currentPromise = promise;
        const { container } = initAndSelectHome();
        await promise;

        const bar = container.querySelector(SELECTORS.PROGRESS_BAR)!;
        expect(bar.classList.contains('geolocation-progress-success')).to.be.true;
        expect(bar.classList.contains('geolocation-progress-failure')).to.be.false;
      });

      it('should show success message when GPS is acquired', async () => {
        const promise = Promise.resolve({
          latitude: 1, longitude: 2, altitude: 3, accuracy: 4, altitudeAccuracy: 5, heading: 6, speed: 7
        });
        window.CHTCore.Geolocation.currentPromise = promise;
        const { container } = initAndSelectHome();
        await promise;

        expect(container.querySelector(SELECTORS.SUCCESS_MSG)).to.not.be.null;
      });

      it('should set hidden input to "captured" and fire change event on success', async () => {
        const promise = Promise.resolve({
          latitude: 1, longitude: 2, altitude: 3, accuracy: 4, altitudeAccuracy: 5, heading: 6, speed: 7
        });
        window.CHTCore.Geolocation.currentPromise = promise;
        const { widget } = initAndSelectHome();
        const changeHandler = sinon.stub();
        $(widget.element).on('change', changeHandler);
        await promise;

        expect(widget.element.value).to.equal('captured');
        expect(changeHandler.callCount).to.equal(1);
      });

      it('should show retry button, acknowledgement checkbox, and skip button when GPS acquisition fails', async () => {
        const promise = Promise.resolve({ code: -2, message: 'Geolocation timeout exceeded' });
        window.CHTCore.Geolocation.currentPromise = promise;
        const { container } = initAndSelectHome();
        await promise;

        expect(container.querySelector(SELECTORS.RETRY_BTN)).to.not.be.null;
        expect(container.querySelector(SELECTORS.ACKNOWLEDGE_CHECKBOX)).to.not.be.null;
        expect(container.querySelector(SELECTORS.SKIP_BTN)).to.not.be.null;
      });

      it('should disable the "Continue without location" button immediately after GPS failure', async () => {
        const promise = Promise.resolve({ code: -2, message: 'Geolocation timeout exceeded' });
        window.CHTCore.Geolocation.currentPromise = promise;
        const { container } = initAndSelectHome();
        await promise;

        const skipBtn = container.querySelector(SELECTORS.SKIP_BTN) as HTMLButtonElement;
        expect(skipBtn).to.not.be.null;
        expect(skipBtn.disabled).to.be.true;
      });

      it('should enable the "Continue without location" button when the acknowledgement checkbox is checked',
        async () => {
          const promise = Promise.resolve({ code: -2, message: 'Geolocation timeout exceeded' });
          window.CHTCore.Geolocation.currentPromise = promise;
          const { container } = initAndSelectHome();
          await promise;

          const checkbox = container.querySelector(SELECTORS.ACKNOWLEDGE_CHECKBOX) as HTMLInputElement;
          const skipBtn = container.querySelector(SELECTORS.SKIP_BTN) as HTMLButtonElement;
          checkbox.checked = true;
          $(checkbox).trigger('change');

          expect(skipBtn.disabled).to.be.false;
        });

      it('should re-disable the "Continue without location" button when the acknowledgement checkbox is unchecked',
        async () => {
          const promise = Promise.resolve({ code: -2, message: 'Geolocation timeout exceeded' });
          window.CHTCore.Geolocation.currentPromise = promise;
          const { container } = initAndSelectHome();
          await promise;

          const checkbox = container.querySelector(SELECTORS.ACKNOWLEDGE_CHECKBOX) as HTMLInputElement;
          const skipBtn = container.querySelector(SELECTORS.SKIP_BTN) as HTMLButtonElement;

          checkbox.checked = true;
          $(checkbox).trigger('change');
          expect(skipBtn.disabled).to.be.false;

          checkbox.checked = false;
          $(checkbox).trigger('change');
          expect(skipBtn.disabled).to.be.true;
        });

      it('should not set hidden input value or fire change event on failure', async () => {
        const promise = Promise.resolve({ code: -2, message: 'Geolocation timeout exceeded' });
        window.CHTCore.Geolocation.currentPromise = promise;
        const { widget } = initAndSelectHome();
        const changeHandler = sinon.stub();
        $(widget.element).on('change', changeHandler);
        await promise;

        expect(widget.element.value).to.equal('');
        expect(changeHandler.callCount).to.equal(0);
      });

      it('should set hidden input to "skipped" and fire change event when skip button is clicked', async () => {
        const promise = Promise.resolve({ code: -2, message: 'Geolocation timeout exceeded' });
        window.CHTCore.Geolocation.currentPromise = promise;
        const { widget, container } = initAndSelectHome();
        await promise;

        const changeHandler = sinon.stub();
        $(widget.element).on('change', changeHandler);
        const checkbox = container.querySelector(SELECTORS.ACKNOWLEDGE_CHECKBOX) as HTMLInputElement;
        checkbox.checked = true;
        $(checkbox).trigger('change');
        (container.querySelector(SELECTORS.SKIP_BTN) as HTMLElement).click();

        expect(widget.element.value).to.equal('skipped');
        expect(changeHandler.callCount).to.equal(1);
      });

      it('should remove retry, acknowledge, and skip elements and show confirmation when skip is clicked', async () => {
        const promise = Promise.resolve({ code: -2, message: 'Geolocation timeout exceeded' });
        window.CHTCore.Geolocation.currentPromise = promise;
        const { container } = initAndSelectHome();
        await promise;

        const checkbox = container.querySelector(SELECTORS.ACKNOWLEDGE_CHECKBOX) as HTMLInputElement;
        checkbox.checked = true;
        $(checkbox).trigger('change');
        (container.querySelector(SELECTORS.SKIP_BTN) as HTMLElement).click();

        expect(container.querySelector(SELECTORS.RETRY_BTN)).to.be.null;
        expect(container.querySelector(SELECTORS.ACKNOWLEDGE_LABEL)).to.be.null;
        expect(container.querySelector(SELECTORS.SKIP_BTN)).to.be.null;
        expect(container.querySelector(SELECTORS.SKIPPED_MSG)).to.not.be.null;
      });

      it('should call retry() and return to loading state when retry button is clicked', async () => {
        const failurePromise = Promise.resolve({ code: -2, message: 'Geolocation timeout exceeded' });
        window.CHTCore.Geolocation.currentPromise = failurePromise;
        const { container } = initAndSelectHome();
        await failurePromise;

        const retryStub = sinon.stub().callsFake(() => {
          window.CHTCore.Geolocation.currentPromise = new Promise(() => {});
        });
        window.CHTCore.Geolocation.retry = retryStub;

        (container.querySelector(SELECTORS.RETRY_BTN) as HTMLElement).click();

        expect(retryStub.callCount).to.equal(1);
        expect(container.querySelector(SELECTORS.PROGRESS_BAR)).to.not.be.null;
        expect(container.querySelector(SELECTORS.RETRY_BTN)).to.be.null;
        expect(container.querySelector(SELECTORS.SKIP_BTN)).to.be.null;
      });

      it('should add failure class to progress bar when GPS acquisition fails', async () => {
        const promise = Promise.resolve({ code: -2, message: 'Geolocation timeout exceeded' });
        window.CHTCore.Geolocation.currentPromise = promise;
        const { container } = initAndSelectHome();
        await promise;

        const bar = container.querySelector(SELECTORS.PROGRESS_BAR)!;
        expect(bar.classList.contains('geolocation-progress-failure')).to.be.true;
        expect(bar.classList.contains('geolocation-progress-success')).to.be.false;
      });

      it('should hide weak signal message when skip is clicked after a weak signal failure', async () => {
        const promise = Promise.resolve({ code: 2, message: 'Position unavailable' });
        window.CHTCore.Geolocation.currentPromise = promise;
        const { container } = initAndSelectHome();
        await promise;

        const checkbox = container.querySelector(SELECTORS.ACKNOWLEDGE_CHECKBOX) as HTMLInputElement;
        checkbox.checked = true;
        $(checkbox).trigger('change');
        (container.querySelector(SELECTORS.SKIP_BTN) as HTMLElement).click();

        expect(container.querySelector(SELECTORS.WEAK_SIGNAL_MSG)).to.be.null;
      });

      it('should show weak signal message for POSITION_UNAVAILABLE (code 2)', async () => {
        const promise = Promise.resolve({ code: 2, message: 'Position unavailable' });
        window.CHTCore.Geolocation.currentPromise = promise;
        const { container } = initAndSelectHome();
        await promise;

        expect(container.querySelector(SELECTORS.WEAK_SIGNAL_MSG)).to.not.be.null;
      });

      it('should show weak signal message for TIMEOUT (code 3)', async () => {
        const promise = Promise.resolve({ code: 3, message: 'Timeout expired' });
        window.CHTCore.Geolocation.currentPromise = promise;
        const { container } = initAndSelectHome();
        await promise;

        expect(container.querySelector(SELECTORS.WEAK_SIGNAL_MSG)).to.not.be.null;
      });

      it('should show weak signal message for service timeout (code -2)', async () => {
        const promise = Promise.resolve({ code: -2, message: 'Geolocation timeout exceeded' });
        window.CHTCore.Geolocation.currentPromise = promise;
        const { container } = initAndSelectHome();
        await promise;

        expect(container.querySelector(SELECTORS.WEAK_SIGNAL_MSG)).to.not.be.null;
      });

      it('should not show weak signal message for PERMISSION_DENIED (code 1)', async () => {
        const promise = Promise.resolve({ code: 1, message: 'User denied Geolocation' });
        window.CHTCore.Geolocation.currentPromise = promise;
        const { container } = initAndSelectHome();
        await promise;

        expect(container.querySelector(SELECTORS.WEAK_SIGNAL_MSG)).to.be.null;
      });

      it('should not show weak signal message for other failure codes', async () => {
        const promise = Promise.resolve({ code: -3, message: 'Geolocation API unavailable' });
        window.CHTCore.Geolocation.currentPromise = promise;
        const { container } = initAndSelectHome();
        await promise;

        expect(container.querySelector(SELECTORS.WEAK_SIGNAL_MSG)).to.be.null;
      });

    });

    describe('edit mode with no prior location', () => {
      const buildHtmlForEditNoLocation = () => {
        document.body.insertAdjacentHTML('afterbegin', `
          <div id="geolocation-widget-test">
            <label class="question non-select or-appearance-geolocation-capture">
              <input type="hidden" name="/geolocation/capture" data-type-xml="string"
                data-geo-is-edit="true" />
            </label>
          </div>`);
      };

      const initEditNoLocationWidget = () => {
        buildHtmlForEditNoLocation();
        const widget = Object.create(HouseholdGeolocationWidget.prototype);
        widget.element = document.querySelector('#geolocation-widget-test ' + HouseholdGeolocationWidget.selector);
        widget.question = widget.element.closest('.question');
        widget._init();
        const container = document.querySelector('#geolocation-widget-test ' + SELECTORS.GEO_CAPTURE_LABEL)!;
        return { widget, container };
      };

      it('should show no-location message when contact has no prior location', () => {
        const { container } = initEditNoLocationWidget();
        expect(container.querySelector(SELECTORS.NO_LOCATION_MSG)).to.not.be.null;
      });

      it('should show context options alongside the no-location message', () => {
        const { container } = initEditNoLocationWidget();
        expect(container.querySelector(SELECTORS.CONTEXT_OPTIONS)).to.not.be.null;
        expect(container.querySelector(SELECTORS.HOME_RADIO)).to.not.be.null;
        expect(container.querySelector(SELECTORS.OTHER_RADIO)).to.not.be.null;
      });

      it('should not show the edit badge in edit mode with no prior location', () => {
        const { container } = initEditNoLocationWidget();
        expect(container.querySelector(SELECTORS.EDIT_BADGE)).to.be.null;
      });

      it('should not show the no-location message in create mode', () => {
        const { container } = initWidget();
        expect(container.querySelector(SELECTORS.NO_LOCATION_MSG)).to.be.null;
      });
    });

    describe('edit mode', () => {
      const buildHtmlWithExistingLocation = (lastCapture?: object) => {
        document.body.insertAdjacentHTML('afterbegin', `
          <div id="geolocation-widget-test">
            <label class="question non-select or-appearance-geolocation-capture">
              <input type="hidden" name="/geolocation/capture" data-type-xml="string"
                data-geo-has-location="true" />
            </label>
          </div>`);
        if (lastCapture) {
          const input = document.querySelector('#geolocation-widget-test input') as HTMLInputElement;
          input.dataset.geoLastCapture = JSON.stringify(lastCapture);
        }
      };

      const createWidget = () => {
        const widget = Object.create(HouseholdGeolocationWidget.prototype);
        widget.element = document.querySelector('#geolocation-widget-test ' + HouseholdGeolocationWidget.selector);
        widget.question = widget.element.closest('.question');
        return widget;
      };

      const initEditWidget = async (lastCapture?: object) => {
        buildHtmlWithExistingLocation(lastCapture);
        const widget = createWidget();
        await widget._init();
        const container = document.querySelector(
          '#geolocation-widget-test ' + SELECTORS.GEO_CAPTURE_LABEL
        )!;
        return { widget, container };
      };

      it('renders edit badge instead of context radios', async () => {
        const { container } = await initEditWidget();

        expect(container.querySelector(SELECTORS.EDIT_BADGE)).to.not.be.null;
        expect(container.querySelector(SELECTORS.CONTEXT_OPTIONS)).to.be.null;
      });

      it('renders keep and capture-new radio options', async () => {
        const { container } = await initEditWidget();

        expect(container.querySelector(SELECTORS.KEPT_RADIO)).to.not.be.null;
        expect(container.querySelector(SELECTORS.CAPTURE_NEW_RADIO)).to.not.be.null;
      });

      it('pre-selects the keep radio and sets element value to kept on init', async () => {
        const { widget, container } = await initEditWidget();

        const keptRadio = container.querySelector(SELECTORS.KEPT_RADIO) as HTMLInputElement;
        expect(keptRadio.checked).to.be.true;
        expect((widget.element as HTMLInputElement).value).to.equal('kept');
      });

      it('sets data-geo-context to home on init', async () => {
        const { widget } = await initEditWidget();

        expect((widget.element as HTMLInputElement).dataset.geoContext).to.equal('home');
      });

      it('clears element value when capture-new is selected', async () => {
        const { widget, container } = await initEditWidget();

        const captureNewRadio = container.querySelector(
          SELECTORS.CAPTURE_NEW_RADIO
        ) as HTMLInputElement;
        captureNewRadio.checked = true;
        $(captureNewRadio).trigger('change');

        expect((widget.element as HTMLInputElement).value).to.equal('');
      });

      it('shows warning and acknowledge checkbox when capture-new is selected', async () => {
        const { container } = await initEditWidget();

        const captureNewRadio = container.querySelector(
          SELECTORS.CAPTURE_NEW_RADIO
        ) as HTMLInputElement;
        captureNewRadio.checked = true;
        $(captureNewRadio).trigger('change');

        expect((container.querySelector(SELECTORS.EDIT_WARNING_GROUP) as HTMLElement).style.display)
          .to.not.equal('none');
        expect(container.querySelector(SELECTORS.EDIT_ACKNOWLEDGE_CHECKBOX)).to.not.be.null;
      });

      it('acknowledge checkbox has the ignore class', async () => {
        const { container } = await initEditWidget();

        const captureNewRadio = container.querySelector(
          SELECTORS.CAPTURE_NEW_RADIO
        ) as HTMLInputElement;
        captureNewRadio.checked = true;
        $(captureNewRadio).trigger('change');

        const checkbox = container.querySelector(SELECTORS.EDIT_ACKNOWLEDGE_CHECKBOX) as HTMLInputElement;
        expect(checkbox.classList.contains('ignore')).to.be.true;
      });

      it('re-selecting keep restores element value and hides warning', async () => {
        const { widget, container } = await initEditWidget();

        const captureNewRadio = container.querySelector(
          SELECTORS.CAPTURE_NEW_RADIO
        ) as HTMLInputElement;
        captureNewRadio.checked = true;
        $(captureNewRadio).trigger('change');

        const keptRadio = container.querySelector(SELECTORS.KEPT_RADIO) as HTMLInputElement;
        keptRadio.checked = true;
        $(keptRadio).trigger('change');

        expect((widget.element as HTMLInputElement).value).to.equal('kept');
        expect((container.querySelector(SELECTORS.EDIT_WARNING_GROUP) as HTMLElement).style.display)
          .to.equal('none');
      });

      it('ticking the acknowledge checkbox shows capture progress UI and hides edit options', async () => {
        window.CHTCore.Geolocation.currentPromise = new Promise(() => {});
        const { container } = await initEditWidget();

        const captureNewRadio = container.querySelector(
          SELECTORS.CAPTURE_NEW_RADIO
        ) as HTMLInputElement;
        captureNewRadio.checked = true;
        $(captureNewRadio).trigger('change');

        const checkbox = container.querySelector(SELECTORS.EDIT_ACKNOWLEDGE_CHECKBOX) as HTMLInputElement;
        checkbox.checked = true;
        $(checkbox).trigger('change');

        expect(container.querySelector(SELECTORS.PROGRESS_BAR)).to.not.be.null;
        expect((container.querySelector(SELECTORS.EDIT_OPTIONS) as HTMLElement).style.display)
          .to.equal('none');
      });

      it('data-geo-context remains home after capture starts', async () => {
        window.CHTCore.Geolocation.currentPromise = new Promise(() => {});
        const { widget, container } = await initEditWidget();

        const captureNewRadio = container.querySelector(
          SELECTORS.CAPTURE_NEW_RADIO
        ) as HTMLInputElement;
        captureNewRadio.checked = true;
        $(captureNewRadio).trigger('change');

        const checkbox = container.querySelector(SELECTORS.EDIT_ACKNOWLEDGE_CHECKBOX) as HTMLInputElement;
        checkbox.checked = true;
        $(checkbox).trigger('change');

        expect((widget.element as HTMLInputElement).dataset.geoContext).to.equal('home');
      });

      it('clicking skip after GPS failure reverts to edit options with kept selected', async () => {
        const promise = Promise.resolve({ code: 2, message: 'Position unavailable' });
        window.CHTCore.Geolocation.currentPromise = promise;
        window.CHTCore.Geolocation.retry = sinon.stub();
        const { widget, container } = await initEditWidget();

        const captureNewRadio = container.querySelector(
          SELECTORS.CAPTURE_NEW_RADIO
        ) as HTMLInputElement;
        captureNewRadio.checked = true;
        $(captureNewRadio).trigger('change');

        const editCheckbox = container.querySelector(
          SELECTORS.EDIT_ACKNOWLEDGE_CHECKBOX
        ) as HTMLInputElement;
        editCheckbox.checked = true;
        $(editCheckbox).trigger('change');

        await promise;

        const skipAcknowledgeCheckbox = container.querySelector(
          SELECTORS.STATUS_ACKNOWLEDGE_CHECKBOX
        ) as HTMLInputElement;
        skipAcknowledgeCheckbox.checked = true;
        $(skipAcknowledgeCheckbox).trigger('change');

        (container.querySelector(SELECTORS.SKIP_BTN) as HTMLElement).click();

        const editOptions = container.querySelector(SELECTORS.EDIT_OPTIONS) as HTMLElement;
        expect(editOptions.style.display).to.not.equal('none');
        expect(container.querySelector(SELECTORS.STATUS)).to.be.null;

        const keptRadio = container.querySelector(SELECTORS.KEPT_RADIO) as HTMLInputElement;
        expect(keptRadio.checked).to.be.true;
        expect((widget.element as HTMLInputElement).value).to.equal('kept');
      });

      it('calls retry() when re-acknowledging capture-new after a failed attempt', async () => {
        const failureResult = { code: 2, message: 'Position unavailable' };
        const retryStub = sinon.stub();
        window.CHTCore.Geolocation.currentPromise = Promise.resolve(failureResult);
        window.CHTCore.Geolocation.retry = retryStub;
        const { container } = await initEditWidget();

        const captureNewRadio = container.querySelector(
          SELECTORS.CAPTURE_NEW_RADIO
        ) as HTMLInputElement;
        captureNewRadio.checked = true;
        $(captureNewRadio).trigger('change');

        const editCheckbox = container.querySelector(
          SELECTORS.EDIT_ACKNOWLEDGE_CHECKBOX
        ) as HTMLInputElement;
        editCheckbox.checked = true;
        $(editCheckbox).trigger('change');

        await window.CHTCore.Geolocation.currentPromise;

        // Skip reverts to edit choice
        const skipAcknowledgeCheckbox = container.querySelector(
          SELECTORS.STATUS_ACKNOWLEDGE_CHECKBOX
        ) as HTMLInputElement;
        skipAcknowledgeCheckbox.checked = true;
        $(skipAcknowledgeCheckbox).trigger('change');
        (container.querySelector(SELECTORS.SKIP_BTN) as HTMLElement).click();

        // Re-select capture-new and acknowledge again
        captureNewRadio.checked = true;
        $(captureNewRadio).trigger('change');
        editCheckbox.checked = true;
        $(editCheckbox).trigger('change');

        expect(retryStub.callCount).to.equal(1);
      });

      it('does not render context element when data-geo-last-capture is absent', async () => {
        const { container } = await initEditWidget();

        expect(container.querySelector(SELECTORS.EDIT_BADGE_CONTEXT)).to.be.null;
      });

      it('renders context element when data-geo-last-capture is provided', async () => {
        const { container } = await initEditWidget({ isHome: true, timestamp: Date.now() - 30 * MS_PER_DAY });

        expect(container.querySelector(SELECTORS.EDIT_BADGE_CONTEXT)).to.not.be.null;
      });

      it('uses home context translation key when isHome is true', async () => {
        const { container } = await initEditWidget({ isHome: true, timestamp: Date.now() - 30 * MS_PER_DAY });

        const context = container.querySelector(SELECTORS.EDIT_BADGE_CONTEXT) as HTMLElement;
        expect(context.textContent).to.equal('geolocation.edit.context.home');
      });

      it('uses other context translation key when isHome is false', async () => {
        const { container } = await initEditWidget({ isHome: false, timestamp: Date.now() - 30 * MS_PER_DAY });

        const context = container.querySelector(SELECTORS.EDIT_BADGE_CONTEXT) as HTMLElement;
        expect(context.textContent).to.equal('geolocation.edit.context.other');
      });

    });
  });
});
