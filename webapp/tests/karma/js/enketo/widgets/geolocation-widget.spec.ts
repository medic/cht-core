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

    describe('_startCapture()', () => {
      beforeEach(() => {
        window.CHTCore.Geolocation = { currentPromise: new Promise(() => {}) };
      });

      it('should show progress bar and remove capture button on click', () => {
        buildHtml();
        const widget = createWidget();
        widget._isGeolocationAvailable = () => true;
        widget._init();

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

        const changeHandler = sinon.stub();
        widget.element.addEventListener('change', changeHandler);

        const container = document.querySelector('#geolocation-widget-test .or-appearance-geolocation-capture')!;
        (container.querySelector('.geolocation-capture-btn') as HTMLElement).click();

        await promise;

        expect(widget.element.value).to.equal('captured');
        expect(changeHandler.callCount).to.equal(1);
      });

      it('should show retry and skip buttons when GPS acquisition fails', async () => {
        const promise = Promise.resolve({ code: -2, message: 'Geolocation timeout exceeded' });
        window.CHTCore.Geolocation = { currentPromise: promise };
        buildHtml();
        const widget = createWidget();
        widget._isGeolocationAvailable = () => true;
        widget._init();

        const container = document.querySelector('#geolocation-widget-test .or-appearance-geolocation-capture')!;
        (container.querySelector('.geolocation-capture-btn') as HTMLElement).click();

        await promise;

        expect(container.querySelector('.geolocation-retry-btn')).to.not.be.null;
        expect(container.querySelector('.geolocation-skip-btn')).to.not.be.null;
      });

      it('should set hidden input to "not_captured" and fire change event on failure', async () => {
        const promise = Promise.resolve({ code: -2, message: 'Geolocation timeout exceeded' });
        window.CHTCore.Geolocation = { currentPromise: promise };
        buildHtml();
        const widget = createWidget();
        widget._isGeolocationAvailable = () => true;
        widget._init();

        const changeHandler = sinon.stub();
        widget.element.addEventListener('change', changeHandler);

        const container = document.querySelector('#geolocation-widget-test .or-appearance-geolocation-capture')!;
        (container.querySelector('.geolocation-capture-btn') as HTMLElement).click();

        await promise;

        expect(widget.element.value).to.equal('not_captured');
        expect(changeHandler.callCount).to.equal(1);
      });

      it('should call retry() and return to loading state when retry button is clicked', async () => {
        const failurePromise = Promise.resolve({ code: -2, message: 'Geolocation timeout exceeded' });
        window.CHTCore.Geolocation = { currentPromise: failurePromise };
        buildHtml();
        const widget = createWidget();
        widget._isGeolocationAvailable = () => true;
        widget._init();

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
