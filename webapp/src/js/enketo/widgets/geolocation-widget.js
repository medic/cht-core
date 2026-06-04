/* global globalThis */
'use strict';
const Widget = require('enketo-core/src/js/widget').default;
const $ = require('jquery');
require('enketo-core/src/js/plugins');

class GeolocationWidget extends Widget {
  static get selector() {
    return '.or-appearance-geolocation-capture input';
  }

  _init() {
    $(this.element).hide();
    const $question = $(this.question);

    if (this._isPermissionDenied()) {
      const $el = $('<p class="geolocation-permission-denied">');
      $question.append($el);
      return globalThis.CHTCore.Translate.get('geolocation.permission.denied')
        .then(text => $el.text(text));
    } else if (this._isGeolocationAvailable()) {
      const $button = $('<button type="button" class="btn btn-primary geolocation-capture-btn">');
      $button.on('click', () => this._startCapture());
      $question.append($button);
      return globalThis.CHTCore.Translate.get('geolocation.capture')
        .then(text => $button.text(text));
    } else {
      const $el = $('<p class="geolocation-unavailable">');
      $question.append($el);
      return globalThis.CHTCore.Translate.get('geolocation.unavailable')
        .then(text => $el.text(text));
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

    globalThis.CHTCore.Geolocation.currentPromise.then(result => {
      if ('code' in result) {
        $bar.addClass('geolocation-progress-failure');

        const $retryBtn = $('<button type="button" class="btn btn-default geolocation-retry-btn">');
        $retryBtn.on('click', () => {
          globalThis.CHTCore.Geolocation.retry();
          this._startCapture();
        });
        $question.append($retryBtn);
        globalThis.CHTCore.Translate.get('geolocation.retry')
          .then(text => $retryBtn.text(text));

        const $skipBtn = $('<button type="button" class="btn btn-default geolocation-skip-btn">');
        $question.append($skipBtn);
        globalThis.CHTCore.Translate.get('geolocation.skip')
          .then(text => $skipBtn.text(text));

        $(this.element).val('not_captured').trigger('change');
      } else {
        $bar.addClass('geolocation-progress-success');

        const $msg = $('<p class="geolocation-success-msg">');
        $question.append($msg);
        globalThis.CHTCore.Translate.get('geolocation.success')
          .then(text => $msg.text(text));

        $(this.element).val('captured').trigger('change');
      }
    });
  }

  _isGeolocationAvailable() {
    return !!globalThis.navigator.geolocation;
  }

  _isPermissionDenied() {
    try {
      const android = globalThis.medicmobile_android;
      if (!android || typeof android.getLocationPermissions !== 'function') {
        return false;
      }
      return !android.getLocationPermissions();
    } catch (err) {
      console.error('Error checking location permissions', err);
      return false;
    }
  }
}

module.exports = GeolocationWidget;
