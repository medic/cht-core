'use strict';
const Widget = require('enketo-core/src/js/widget').default;
const $ = require('jquery');
require('enketo-core/src/js/plugins');

class GeolocationWidget extends Widget {
  static get selector() {
    return '.or-appearance-geolocation-capture input';
  }

  _init() {
    const $question = $(this.question);

    if (this._isPermissionDenied()) {
      const $el = $('<p class="geolocation-permission-denied">');
      $question.append($el);
      return window.CHTCore.Translate.get('geolocation.permission.denied')
        .then(text => $el.text(text));
    } else if (!this._isGeolocationAvailable()) {
      const $el = $('<p class="geolocation-unavailable">');
      $question.append($el);
      return window.CHTCore.Translate.get('geolocation.unavailable')
        .then(text => $el.text(text));
    } else {
      const $button = $('<button type="button" class="geolocation-capture-btn">');
      $button.on('click', () => this._startCapture());
      $question.append($button);
      return window.CHTCore.Translate.get('geolocation.capture')
        .then(text => $button.text(text));
    }
  }

  _startCapture() {
    const $question = $(this.question);
    $question.find([
      '.geolocation-capture-btn',
      '.geolocation-progress-bar',
      '.geolocation-retry-btn',
      '.geolocation-skip-btn',
      '.geolocation-success-msg',
    ].join(',')).remove();

    const $bar = $('<div class="geolocation-progress-bar">');
    $question.append($bar);

    window.CHTCore.Geolocation.currentPromise.then(result => {
      if ('code' in result) {
        $bar.addClass('geolocation-progress-failure');

        const $retryBtn = $('<button type="button" class="geolocation-retry-btn">');
        $retryBtn.on('click', () => {
          window.CHTCore.Geolocation.retry();
          this._startCapture();
        });
        $question.append($retryBtn);
        window.CHTCore.Translate.get('geolocation.retry')
          .then(text => $retryBtn.text(text));

        const $skipBtn = $('<button type="button" class="geolocation-skip-btn">');
        $question.append($skipBtn);
        window.CHTCore.Translate.get('geolocation.skip')
          .then(text => $skipBtn.text(text));

        $(this.element).val('not_captured').trigger('change');
      } else {
        $bar.addClass('geolocation-progress-success');

        const $msg = $('<p class="geolocation-success-msg">');
        $question.append($msg);
        window.CHTCore.Translate.get('geolocation.success')
          .then(text => $msg.text(text));

        $(this.element).val('captured').trigger('change');
      }
    });
  }

  _isGeolocationAvailable() {
    return !!window.navigator.geolocation;
  }

  _isPermissionDenied() {
    try {
      if (!window.medicmobile_android || typeof window.medicmobile_android.getLocationPermissions !== 'function') {
        return false;
      }
      return !window.medicmobile_android.getLocationPermissions();
    } catch (err) {
      return false;
    }
  }
}

module.exports = GeolocationWidget;
