import jQuery from 'jquery';
import sinon from 'sinon';
import { expect } from 'chai';

const GeolocationWidget = require('../../../../../src/js/enketo/widgets/geolocation-widget');

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

      it('should enable the "Continue without location" button when the acknowledgement checkbox is checked', async () => {
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

      it('should re-disable the "Continue without location" button when the acknowledgement checkbox is unchecked', async () => {
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
  });
});
