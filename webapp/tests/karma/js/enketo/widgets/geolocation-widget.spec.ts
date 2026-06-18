import jQuery from 'jquery';
import sinon from 'sinon';
import { expect } from 'chai';

const GeolocationWidget = require('../../../../../src/js/enketo/widgets/geolocation-widget');

const MS_PER_DAY = 86400000;

describe('Enketo: Geolocation Widget', () => {
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
    expect(GeolocationWidget.selector).to.equal('.or-appearance-geolocation-capture input');
  });

  describe('_init()', () => {
    beforeEach(() => {
      window.medicmobile_android = undefined;
      window.CHTCore = {
        Translate: { get: sinon.stub().callsFake(key => Promise.resolve(key)) }
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
      const widget = Object.create(GeolocationWidget.prototype);
      widget.element = document.querySelector('#geolocation-widget-test ' + GeolocationWidget.selector);
      widget.question = widget.element.closest('.question');
      return widget;
    };

    it('should show permission denied message when Android location permissions are denied', () => {
      buildHtml();
      window.medicmobile_android = { getLocationPermissions: sinon.stub().returns(false) };
      const widget = createWidget();

      widget._init();

      const container = document.querySelector('#geolocation-widget-test .or-appearance-geolocation-capture')!;
      expect(container.querySelector('.geolocation-permission-denied')).to.not.be.null;
      expect(container.querySelector('.geolocation-capture-btn')).to.be.null;
    });

    it('should show unavailable message when Geolocation API is absent', () => {
      buildHtml();
      const widget = createWidget();
      widget._isGeolocationAvailable = () => false;

      widget._init();

      const container = document.querySelector('#geolocation-widget-test .or-appearance-geolocation-capture')!;
      expect(container.querySelector('.geolocation-unavailable')).to.not.be.null;
      expect(container.querySelector('.geolocation-capture-btn')).to.be.null;
    });

    it('should show capture button in normal state', () => {
      buildHtml();
      const widget = createWidget();
      widget._isGeolocationAvailable = () => true;

      widget._init();

      const container = document.querySelector('#geolocation-widget-test .or-appearance-geolocation-capture')!;
      expect(container.querySelector('.geolocation-capture-btn')).to.not.be.null;
      expect(container.querySelector('.geolocation-permission-denied')).to.be.null;
      expect(container.querySelector('.geolocation-unavailable')).to.be.null;
    });

    it('should include a map icon in the capture button', () => {
      buildHtml();
      const widget = createWidget();
      widget._isGeolocationAvailable = () => true;
      widget._init();

      const btn = document.querySelector('#geolocation-widget-test .geolocation-capture-btn')!;
      expect(btn.querySelector('.fa.fa-map-marker')).to.not.be.null;
    });

    it('should render home and other context options', () => {
      buildHtml();
      const widget = createWidget();
      widget._isGeolocationAvailable = () => true;
      widget._init();

      const container = document.querySelector('#geolocation-widget-test .or-appearance-geolocation-capture')!;
      expect(container.querySelector('.geolocation-context-options')).to.not.be.null;
      expect(container.querySelector('input[type="radio"][value="home"]')).to.not.be.null;
      expect(container.querySelector('input[type="radio"][value="other"]')).to.not.be.null;
    });

    it('should disable the capture button until a context option is selected', () => {
      buildHtml();
      const widget = createWidget();
      widget._isGeolocationAvailable = () => true;
      widget._init();

      const btn = document.querySelector('#geolocation-widget-test .geolocation-capture-btn') as HTMLButtonElement;
      expect(btn).to.not.be.null;
      expect(btn.disabled).to.be.true;
    });

    it('should set data-geo-context and enable capture button when home is selected', () => {
      buildHtml();
      const widget = createWidget();
      widget._isGeolocationAvailable = () => true;
      widget._init();

      const btn = document.querySelector('#geolocation-widget-test .geolocation-capture-btn') as HTMLButtonElement;
      const homeRadio = document.querySelector(
        '#geolocation-widget-test input[type="radio"][value="home"]'
      ) as HTMLInputElement;
      homeRadio.checked = true;
      $(homeRadio).trigger('change');

      expect(btn.disabled).to.be.false;
      expect((widget.element as HTMLInputElement).dataset.geoContext).to.equal('home');
    });

    it('should set data-geo-context to other when other is selected', () => {
      buildHtml();
      const widget = createWidget();
      widget._isGeolocationAvailable = () => true;
      widget._init();

      const otherRadio = document.querySelector(
        '#geolocation-widget-test input[type="radio"][value="other"]'
      ) as HTMLInputElement;
      otherRadio.checked = true;
      $(otherRadio).trigger('change');

      expect((widget.element as HTMLInputElement).dataset.geoContext).to.equal('other');
    });

    it('should hide context options when capture starts', () => {
      window.CHTCore.Geolocation = { currentPromise: new Promise(() => {}) };
      buildHtml();
      const widget = createWidget();
      widget._isGeolocationAvailable = () => true;
      widget._init();

      const homeRadio = document.querySelector(
        '#geolocation-widget-test input[type="radio"][value="home"]'
      ) as HTMLInputElement;
      homeRadio.checked = true;
      $(homeRadio).trigger('change');

      const contextOptions = document.querySelector(
        '#geolocation-widget-test .geolocation-context-options'
      ) as HTMLElement;
      expect(contextOptions.style.display).not.to.equal('none');

      (document.querySelector('#geolocation-widget-test .geolocation-capture-btn') as HTMLElement).click();

      expect(contextOptions.style.display).to.equal('none');
    });

    it('should hide context options when capture fails', async () => {
      const promise = Promise.resolve({ code: -2, message: 'Geolocation timeout exceeded' });
      window.CHTCore.Geolocation = { currentPromise: promise };
      buildHtml();
      const widget = createWidget();
      widget._isGeolocationAvailable = () => true;
      widget._init();

      const homeRadio = document.querySelector(
        '#geolocation-widget-test input[type="radio"][value="home"]'
      ) as HTMLInputElement;
      homeRadio.checked = true;
      $(homeRadio).trigger('change');

      (document.querySelector('#geolocation-widget-test .geolocation-capture-btn') as HTMLElement).click();
      await promise;

      const contextOptions = document.querySelector(
        '#geolocation-widget-test .geolocation-context-options'
      ) as HTMLElement;
      expect(contextOptions.style.display).to.equal('none');
    });

    describe('_startCapture()', () => {
      beforeEach(() => {
        window.CHTCore.Geolocation = { currentPromise: new Promise(() => {}) };
      });

      const selectHomeContext = () => {
        const radio = document.querySelector(
          '#geolocation-widget-test input[type="radio"][value="home"]'
        ) as HTMLInputElement;
        radio.checked = true;
        $(radio).trigger('change');
      };

      it('should show progress bar and remove capture button on click', () => {
        buildHtml();
        const widget = createWidget();
        widget._isGeolocationAvailable = () => true;
        widget._init();
        selectHomeContext();

        const container = document.querySelector('#geolocation-widget-test .or-appearance-geolocation-capture')!;
        (container.querySelector('.geolocation-capture-btn') as HTMLElement).click();

        expect(container.querySelector('.geolocation-progress-bar')).to.not.be.null;
        expect(container.querySelector('.geolocation-capture-btn')).to.be.null;
      });

      it('should add success class to progress bar when GPS is acquired', async () => {
        const promise = Promise.resolve({
          latitude: 1, longitude: 2, altitude: 3, accuracy: 4, altitudeAccuracy: 5, heading: 6, speed: 7
        });
        window.CHTCore.Geolocation = { currentPromise: promise };
        buildHtml();
        const widget = createWidget();
        widget._isGeolocationAvailable = () => true;
        widget._init();
        selectHomeContext();

        const container = document.querySelector('#geolocation-widget-test .or-appearance-geolocation-capture')!;
        (container.querySelector('.geolocation-capture-btn') as HTMLElement).click();

        await promise;

        const bar = container.querySelector('.geolocation-progress-bar')!;
        expect(bar.classList.contains('geolocation-progress-success')).to.be.true;
        expect(bar.classList.contains('geolocation-progress-failure')).to.be.false;
      });

      it('should show success message when GPS is acquired', async () => {
        const promise = Promise.resolve({
          latitude: 1, longitude: 2, altitude: 3, accuracy: 4, altitudeAccuracy: 5, heading: 6, speed: 7
        });
        window.CHTCore.Geolocation = { currentPromise: promise };
        buildHtml();
        const widget = createWidget();
        widget._isGeolocationAvailable = () => true;
        widget._init();
        selectHomeContext();

        const container = document.querySelector('#geolocation-widget-test .or-appearance-geolocation-capture')!;
        (container.querySelector('.geolocation-capture-btn') as HTMLElement).click();

        await promise;

        expect(container.querySelector('.geolocation-success-msg')).to.not.be.null;
      });

      it('should set hidden input to "captured" and fire change event on success', async () => {
        const promise = Promise.resolve({
          latitude: 1, longitude: 2, altitude: 3, accuracy: 4, altitudeAccuracy: 5, heading: 6, speed: 7
        });
        window.CHTCore.Geolocation = { currentPromise: promise };
        buildHtml();
        const widget = createWidget();
        widget._isGeolocationAvailable = () => true;
        widget._init();
        selectHomeContext();

        const changeHandler = sinon.stub();
        $(widget.element).on('change', changeHandler);

        const container = document.querySelector('#geolocation-widget-test .or-appearance-geolocation-capture')!;
        (container.querySelector('.geolocation-capture-btn') as HTMLElement).click();

        await promise;

        expect(widget.element.value).to.equal('captured');
        expect(changeHandler.callCount).to.equal(1);
      });

      it('should show retry button, acknowledgement checkbox, and skip button when GPS acquisition fails', async () => {
        const promise = Promise.resolve({ code: -2, message: 'Geolocation timeout exceeded' });
        window.CHTCore.Geolocation = { currentPromise: promise };
        buildHtml();
        const widget = createWidget();
        widget._isGeolocationAvailable = () => true;
        widget._init();
        selectHomeContext();

        const container = document.querySelector('#geolocation-widget-test .or-appearance-geolocation-capture')!;
        (container.querySelector('.geolocation-capture-btn') as HTMLElement).click();

        await promise;

        expect(container.querySelector('.geolocation-retry-btn')).to.not.be.null;
        expect(container.querySelector('.geolocation-acknowledge-checkbox')).to.not.be.null;
        expect(container.querySelector('.geolocation-skip-btn')).to.not.be.null;
      });

      it('should disable the "Continue without location" button immediately after GPS failure', async () => {
        const promise = Promise.resolve({ code: -2, message: 'Geolocation timeout exceeded' });
        window.CHTCore.Geolocation = { currentPromise: promise };
        buildHtml();
        const widget = createWidget();
        widget._isGeolocationAvailable = () => true;
        widget._init();
        selectHomeContext();

        const container = document.querySelector('#geolocation-widget-test .or-appearance-geolocation-capture')!;
        (container.querySelector('.geolocation-capture-btn') as HTMLElement).click();

        await promise;

        const skipBtn = container.querySelector('.geolocation-skip-btn') as HTMLButtonElement;
        expect(skipBtn).to.not.be.null;
        expect(skipBtn.disabled).to.be.true;
      });

      it('should enable the "Continue without location" button when the acknowledgement checkbox is checked',
        async () => {
        const promise = Promise.resolve({ code: -2, message: 'Geolocation timeout exceeded' });
        window.CHTCore.Geolocation = { currentPromise: promise };
        buildHtml();
        const widget = createWidget();
        widget._isGeolocationAvailable = () => true;
        widget._init();
        selectHomeContext();

        const container = document.querySelector('#geolocation-widget-test .or-appearance-geolocation-capture')!;
        (container.querySelector('.geolocation-capture-btn') as HTMLElement).click();

        await promise;

        const checkbox = container.querySelector('.geolocation-acknowledge-checkbox') as HTMLInputElement;
        const skipBtn = container.querySelector('.geolocation-skip-btn') as HTMLButtonElement;

        checkbox.checked = true;
        $(checkbox).trigger('change');

        expect(skipBtn.disabled).to.be.false;
      });

      it('should re-disable the "Continue without location" button when the acknowledgement checkbox is unchecked',
        async () => {
        const promise = Promise.resolve({ code: -2, message: 'Geolocation timeout exceeded' });
        window.CHTCore.Geolocation = { currentPromise: promise };
        buildHtml();
        const widget = createWidget();
        widget._isGeolocationAvailable = () => true;
        widget._init();
        selectHomeContext();

        const container = document.querySelector('#geolocation-widget-test .or-appearance-geolocation-capture')!;
        (container.querySelector('.geolocation-capture-btn') as HTMLElement).click();

        await promise;

        const checkbox = container.querySelector('.geolocation-acknowledge-checkbox') as HTMLInputElement;
        const skipBtn = container.querySelector('.geolocation-skip-btn') as HTMLButtonElement;

        checkbox.checked = true;
        $(checkbox).trigger('change');
        expect(skipBtn.disabled).to.be.false;

        checkbox.checked = false;
        $(checkbox).trigger('change');
        expect(skipBtn.disabled).to.be.true;
      });

      it('should include a map icon in the retry button', async () => {
        const promise = Promise.resolve({ code: -2, message: 'Geolocation timeout exceeded' });
        window.CHTCore.Geolocation = { currentPromise: promise };
        buildHtml();
        const widget = createWidget();
        widget._isGeolocationAvailable = () => true;
        widget._init();
        selectHomeContext();

        (document.querySelector('#geolocation-widget-test .geolocation-capture-btn') as HTMLElement).click();
        await promise;

        const retryBtn = document.querySelector('#geolocation-widget-test .geolocation-retry-btn')!;
        expect(retryBtn.querySelector('.fa.fa-map-marker')).to.not.be.null;
      });

      it('should not set hidden input value or fire change event on failure', async () => {
        const promise = Promise.resolve({ code: -2, message: 'Geolocation timeout exceeded' });
        window.CHTCore.Geolocation = { currentPromise: promise };
        buildHtml();
        const widget = createWidget();
        widget._isGeolocationAvailable = () => true;
        widget._init();
        selectHomeContext();

        const changeHandler = sinon.stub();
        $(widget.element).on('change', changeHandler);

        const container = document.querySelector('#geolocation-widget-test .or-appearance-geolocation-capture')!;
        (container.querySelector('.geolocation-capture-btn') as HTMLElement).click();

        await promise;

        expect(widget.element.value).to.equal('');
        expect(changeHandler.callCount).to.equal(0);
      });

      it('should set hidden input to "skipped" and fire change event when skip button is clicked', async () => {
        const promise = Promise.resolve({ code: -2, message: 'Geolocation timeout exceeded' });
        window.CHTCore.Geolocation = { currentPromise: promise };
        buildHtml();
        const widget = createWidget();
        widget._isGeolocationAvailable = () => true;
        widget._init();
        selectHomeContext();

        const container = document.querySelector('#geolocation-widget-test .or-appearance-geolocation-capture')!;
        (container.querySelector('.geolocation-capture-btn') as HTMLElement).click();

        await promise;

        const changeHandler = sinon.stub();
        $(widget.element).on('change', changeHandler);

        const checkbox = container.querySelector('.geolocation-acknowledge-checkbox') as HTMLInputElement;
        checkbox.checked = true;
        $(checkbox).trigger('change');

        (container.querySelector('.geolocation-skip-btn') as HTMLElement).click();

        expect(widget.element.value).to.equal('skipped');
        expect(changeHandler.callCount).to.equal(1);
      });

      it('should remove retry, acknowledge, and skip elements and show confirmation when skip is clicked', async () => {
        const promise = Promise.resolve({ code: -2, message: 'Geolocation timeout exceeded' });
        window.CHTCore.Geolocation = { currentPromise: promise };
        buildHtml();
        const widget = createWidget();
        widget._isGeolocationAvailable = () => true;
        widget._init();
        selectHomeContext();

        const container = document.querySelector('#geolocation-widget-test .or-appearance-geolocation-capture')!;
        (container.querySelector('.geolocation-capture-btn') as HTMLElement).click();

        await promise;

        const checkbox = container.querySelector('.geolocation-acknowledge-checkbox') as HTMLInputElement;
        checkbox.checked = true;
        $(checkbox).trigger('change');

        (container.querySelector('.geolocation-skip-btn') as HTMLElement).click();

        expect(container.querySelector('.geolocation-retry-btn')).to.be.null;
        expect(container.querySelector('.geolocation-acknowledge-label')).to.be.null;
        expect(container.querySelector('.geolocation-skip-btn')).to.be.null;
        expect(container.querySelector('.geolocation-skipped-msg')).to.not.be.null;
      });

      it('should call retry() and return to loading state when retry button is clicked', async () => {
        const failurePromise = Promise.resolve({ code: -2, message: 'Geolocation timeout exceeded' });
        window.CHTCore.Geolocation = { currentPromise: failurePromise };
        buildHtml();
        const widget = createWidget();
        widget._isGeolocationAvailable = () => true;
        widget._init();
        selectHomeContext();

        const container = document.querySelector('#geolocation-widget-test .or-appearance-geolocation-capture')!;
        (container.querySelector('.geolocation-capture-btn') as HTMLElement).click();

        await failurePromise;

        const retryStub = sinon.stub().callsFake(() => {
          window.CHTCore.Geolocation.currentPromise = new Promise(() => {});
        });
        window.CHTCore.Geolocation.retry = retryStub;

        (container.querySelector('.geolocation-retry-btn') as HTMLElement).click();

        expect(retryStub.callCount).to.equal(1);
        expect(container.querySelector('.geolocation-progress-bar')).to.not.be.null;
        expect(container.querySelector('.geolocation-retry-btn')).to.be.null;
        expect(container.querySelector('.geolocation-skip-btn')).to.be.null;
      });

      it('should add failure class to progress bar when GPS acquisition fails', async () => {
        const promise = Promise.resolve({ code: -2, message: 'Geolocation timeout exceeded' });
        window.CHTCore.Geolocation = { currentPromise: promise };
        buildHtml();
        const widget = createWidget();
        widget._isGeolocationAvailable = () => true;
        widget._init();
        selectHomeContext();

        const container = document.querySelector('#geolocation-widget-test .or-appearance-geolocation-capture')!;
        (container.querySelector('.geolocation-capture-btn') as HTMLElement).click();

        await promise;

        const bar = container.querySelector('.geolocation-progress-bar')!;
        expect(bar.classList.contains('geolocation-progress-failure')).to.be.true;
        expect(bar.classList.contains('geolocation-progress-success')).to.be.false;
      });
    });

    describe('edit mode', () => {
      const buildHtmlWithExistingLocation = (lastCapture?: object) => {
        const lastCaptureAttr = lastCapture
          ? `data-geo-last-capture='${JSON.stringify(lastCapture)}'`
          : '';
        document.body.insertAdjacentHTML('afterbegin', `
          <div id="geolocation-widget-test">
            <label class="question non-select or-appearance-geolocation-capture">
              <input type="hidden" name="/geolocation/capture" data-type-xml="string"
                data-geo-has-location="true" ${lastCaptureAttr} />
            </label>
          </div>`);
      };

      const createWidget = () => {
        const widget = Object.create(GeolocationWidget.prototype);
        widget.element = document.querySelector('#geolocation-widget-test ' + GeolocationWidget.selector);
        widget.question = widget.element.closest('.question');
        return widget;
      };

      it('renders edit badge instead of context radios and capture button', () => {
        buildHtmlWithExistingLocation();
        const widget = createWidget();
        widget._isGeolocationAvailable = () => true;
        widget._init();

        const container = document.querySelector(
          '#geolocation-widget-test .or-appearance-geolocation-capture'
        )!;
        expect(container.querySelector('.geolocation-edit-badge')).to.not.be.null;
        expect(container.querySelector('.geolocation-context-options')).to.be.null;
        expect(container.querySelector('.geolocation-capture-btn')).to.be.null;
      });

      it('renders keep and capture-new radio options', () => {
        buildHtmlWithExistingLocation();
        const widget = createWidget();
        widget._isGeolocationAvailable = () => true;
        widget._init();

        const container = document.querySelector(
          '#geolocation-widget-test .or-appearance-geolocation-capture'
        )!;
        expect(container.querySelector('input[type="radio"][value="kept"]')).to.not.be.null;
        expect(container.querySelector('input[type="radio"][value="capture-new"]')).to.not.be.null;
      });

      it('pre-selects the keep radio and sets element value to kept on init', () => {
        buildHtmlWithExistingLocation();
        const widget = createWidget();
        widget._isGeolocationAvailable = () => true;
        widget._init();

        const keptRadio = document.querySelector(
          '#geolocation-widget-test input[type="radio"][value="kept"]'
        ) as HTMLInputElement;
        expect(keptRadio.checked).to.be.true;
        expect((widget.element as HTMLInputElement).value).to.equal('kept');
      });

      it('sets data-geo-context to home on init', () => {
        buildHtmlWithExistingLocation();
        const widget = createWidget();
        widget._isGeolocationAvailable = () => true;
        widget._init();

        expect((widget.element as HTMLInputElement).dataset.geoContext).to.equal('home');
      });

      it('clears element value when capture-new is selected', () => {
        buildHtmlWithExistingLocation();
        const widget = createWidget();
        widget._isGeolocationAvailable = () => true;
        widget._init();

        const captureNewRadio = document.querySelector(
          '#geolocation-widget-test input[type="radio"][value="capture-new"]'
        ) as HTMLInputElement;
        captureNewRadio.checked = true;
        $(captureNewRadio).trigger('change');

        expect((widget.element as HTMLInputElement).value).to.equal('');
      });

      it('shows warning and acknowledge checkbox when capture-new is selected', () => {
        buildHtmlWithExistingLocation();
        const widget = createWidget();
        widget._isGeolocationAvailable = () => true;
        widget._init();

        const container = document.querySelector(
          '#geolocation-widget-test .or-appearance-geolocation-capture'
        )!;
        const captureNewRadio = document.querySelector(
          '#geolocation-widget-test input[type="radio"][value="capture-new"]'
        ) as HTMLInputElement;
        captureNewRadio.checked = true;
        $(captureNewRadio).trigger('change');

        expect((container.querySelector('.geolocation-edit-warning-group') as HTMLElement).style.display)
          .to.not.equal('none');
        expect(container.querySelector('.geolocation-edit-acknowledge-checkbox')).to.not.be.null;
      });

      it('acknowledge checkbox has the ignore class', () => {
        buildHtmlWithExistingLocation();
        const widget = createWidget();
        widget._isGeolocationAvailable = () => true;
        widget._init();

        const captureNewRadio = document.querySelector(
          '#geolocation-widget-test input[type="radio"][value="capture-new"]'
        ) as HTMLInputElement;
        captureNewRadio.checked = true;
        $(captureNewRadio).trigger('change');

        const checkbox = document.querySelector(
          '#geolocation-widget-test .geolocation-edit-acknowledge-checkbox'
        ) as HTMLInputElement;
        expect(checkbox.classList.contains('ignore')).to.be.true;
      });

      it('re-selecting keep restores element value and hides warning', () => {
        buildHtmlWithExistingLocation();
        const widget = createWidget();
        widget._isGeolocationAvailable = () => true;
        widget._init();

        const captureNewRadio = document.querySelector(
          '#geolocation-widget-test input[type="radio"][value="capture-new"]'
        ) as HTMLInputElement;
        captureNewRadio.checked = true;
        $(captureNewRadio).trigger('change');

        const keptRadio = document.querySelector(
          '#geolocation-widget-test input[type="radio"][value="kept"]'
        ) as HTMLInputElement;
        keptRadio.checked = true;
        $(keptRadio).trigger('change');

        const container = document.querySelector(
          '#geolocation-widget-test .or-appearance-geolocation-capture'
        )!;
        expect((widget.element as HTMLInputElement).value).to.equal('kept');
        expect((container.querySelector('.geolocation-edit-warning-group') as HTMLElement).style.display)
          .to.equal('none');
      });

      it('ticking the acknowledge checkbox shows capture progress UI and hides edit options', () => {
        window.CHTCore.Geolocation = { currentPromise: new Promise(() => {}) };
        buildHtmlWithExistingLocation();
        const widget = createWidget();
        widget._isGeolocationAvailable = () => true;
        widget._init();

        const captureNewRadio = document.querySelector(
          '#geolocation-widget-test input[type="radio"][value="capture-new"]'
        ) as HTMLInputElement;
        captureNewRadio.checked = true;
        $(captureNewRadio).trigger('change');

        const checkbox = document.querySelector(
          '#geolocation-widget-test .geolocation-edit-acknowledge-checkbox'
        ) as HTMLInputElement;
        checkbox.checked = true;
        $(checkbox).trigger('change');

        const container = document.querySelector(
          '#geolocation-widget-test .or-appearance-geolocation-capture'
        )!;
        expect(container.querySelector('.geolocation-progress-bar')).to.not.be.null;
        expect((container.querySelector('.geolocation-edit-options') as HTMLElement).style.display)
          .to.equal('none');
      });

      it('data-geo-context remains home after capture starts', () => {
        window.CHTCore.Geolocation = { currentPromise: new Promise(() => {}) };
        buildHtmlWithExistingLocation();
        const widget = createWidget();
        widget._isGeolocationAvailable = () => true;
        widget._init();

        const captureNewRadio = document.querySelector(
          '#geolocation-widget-test input[type="radio"][value="capture-new"]'
        ) as HTMLInputElement;
        captureNewRadio.checked = true;
        $(captureNewRadio).trigger('change');

        const checkbox = document.querySelector(
          '#geolocation-widget-test .geolocation-edit-acknowledge-checkbox'
        ) as HTMLInputElement;
        checkbox.checked = true;
        $(checkbox).trigger('change');

        expect((widget.element as HTMLInputElement).dataset.geoContext).to.equal('home');
      });

      it('clicking skip after GPS failure reverts to edit options with kept selected', async () => {
        const promise = Promise.resolve({ code: 2, message: 'Position unavailable' });
        window.CHTCore.Geolocation = { currentPromise: promise };
        buildHtmlWithExistingLocation();
        const widget = createWidget();
        widget._isGeolocationAvailable = () => true;
        widget._init();

        const captureNewRadio = document.querySelector(
          '#geolocation-widget-test input[type="radio"][value="capture-new"]'
        ) as HTMLInputElement;
        captureNewRadio.checked = true;
        $(captureNewRadio).trigger('change');

        const editCheckbox = document.querySelector(
          '#geolocation-widget-test .geolocation-edit-acknowledge-checkbox'
        ) as HTMLInputElement;
        editCheckbox.checked = true;
        $(editCheckbox).trigger('change');

        await promise;

        const container = document.querySelector(
          '#geolocation-widget-test .or-appearance-geolocation-capture'
        )!;
        const skipAcknowledgeCheckbox = container.querySelector(
          '.geolocation-status .geolocation-acknowledge-checkbox'
        ) as HTMLInputElement;
        skipAcknowledgeCheckbox.checked = true;
        $(skipAcknowledgeCheckbox).trigger('change');

        (container.querySelector('.geolocation-skip-btn') as HTMLElement).click();

        const editOptions = container.querySelector('.geolocation-edit-options') as HTMLElement;
        expect(editOptions.style.display).to.not.equal('none');
        expect(container.querySelector('.geolocation-status')).to.be.null;

        const keptRadio = container.querySelector(
          'input[type="radio"][value="kept"]'
        ) as HTMLInputElement;
        expect(keptRadio.checked).to.be.true;
        expect((widget.element as HTMLInputElement).value).to.equal('kept');
      });

      it('does not render context or meta elements when data-geo-last-capture is absent', () => {
        buildHtmlWithExistingLocation();
        const widget = createWidget();
        widget._isGeolocationAvailable = () => true;
        widget._init();

        const container = document.querySelector(
          '#geolocation-widget-test .or-appearance-geolocation-capture'
        )!;
        expect(container.querySelector('.geolocation-edit-badge-context')).to.be.null;
        expect(container.querySelector('.geolocation-edit-badge-meta')).to.be.null;
      });

      it('renders context and meta elements when data-geo-last-capture is provided', () => {
        buildHtmlWithExistingLocation({ isHome: true, timestamp: Date.now() - 30 * MS_PER_DAY });
        const widget = createWidget();
        widget._isGeolocationAvailable = () => true;
        widget._init();

        const container = document.querySelector(
          '#geolocation-widget-test .or-appearance-geolocation-capture'
        )!;
        expect(container.querySelector('.geolocation-edit-badge-context')).to.not.be.null;
        expect(container.querySelector('.geolocation-edit-badge-meta')).to.not.be.null;
      });

      it('uses home context translation key when isHome is true', async () => {
        buildHtmlWithExistingLocation({ isHome: true, timestamp: Date.now() - 30 * MS_PER_DAY });
        const widget = createWidget();
        widget._isGeolocationAvailable = () => true;
        await widget._init();

        const context = document.querySelector(
          '#geolocation-widget-test .geolocation-edit-badge-context'
        ) as HTMLElement;
        expect(context.textContent).to.equal('geolocation.edit.context.home');
      });

      it('uses other context translation key when isHome is false', async () => {
        buildHtmlWithExistingLocation({ isHome: false, timestamp: Date.now() - 30 * MS_PER_DAY });
        const widget = createWidget();
        widget._isGeolocationAvailable = () => true;
        await widget._init();

        const context = document.querySelector(
          '#geolocation-widget-test .geolocation-edit-badge-context'
        ) as HTMLElement;
        expect(context.textContent).to.equal('geolocation.edit.context.other');
      });

      it('shows correct day count in badge meta when capture was multiple days ago', async () => {
        window.CHTCore.Translate.get = sinon.stub().callsFake((key: string) => {
          if (key === 'geolocation.edit.last_updated_days') {
            return Promise.resolve('{{days}} days ago');
          }
          return Promise.resolve(key);
        });
        const threeDaysAgo = Date.now() - 3 * MS_PER_DAY;
        buildHtmlWithExistingLocation({ isHome: true, timestamp: threeDaysAgo });
        const widget = createWidget();
        widget._isGeolocationAvailable = () => true;
        await widget._init();

        const meta = document.querySelector(
          '#geolocation-widget-test .geolocation-edit-badge-meta'
        ) as HTMLElement;
        expect(meta.textContent).to.equal('3 days ago');
      });

      it('uses singular day translation key when capture was exactly one day ago', async () => {
        const oneDayAgo = Date.now() - MS_PER_DAY;
        buildHtmlWithExistingLocation({ isHome: true, timestamp: oneDayAgo });
        const widget = createWidget();
        widget._isGeolocationAvailable = () => true;
        await widget._init();

        const meta = document.querySelector(
          '#geolocation-widget-test .geolocation-edit-badge-meta'
        ) as HTMLElement;
        expect(meta.textContent).to.equal('geolocation.edit.last_updated_day');
      });

      it('uses today translation key when capture timestamp is from the current day', async () => {
        const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
        buildHtmlWithExistingLocation({ isHome: true, timestamp: twoHoursAgo });
        const widget = createWidget();
        widget._isGeolocationAvailable = () => true;
        await widget._init();

        const meta = document.querySelector(
          '#geolocation-widget-test .geolocation-edit-badge-meta'
        ) as HTMLElement;
        expect(meta.textContent).to.equal('geolocation.edit.last_updated_today');
      });
    });
  });
});

