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
  });
});
