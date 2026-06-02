import { expect } from 'chai';

const GeolocationWidget = require('../../../../../src/js/enketo/widgets/geolocation-widget');

describe('Enketo: Geolocation Widget', () => {
  it('should have the correct selector', () => {
    expect(GeolocationWidget.selector).to.equal('.or-appearance-geolocation-capture input');
  });
});
