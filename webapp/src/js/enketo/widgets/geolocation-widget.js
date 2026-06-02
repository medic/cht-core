'use strict';
const Widget = require('enketo-core/src/js/widget').default;

class GeolocationWidget extends Widget {
  static get selector() {
    return '.or-appearance-geolocation-capture input';
  }
}

module.exports = GeolocationWidget;
