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
      const $button = $('<button type="button" class="btn btn-default geolocation-capture-btn">');
      $('<i class="fa fa-map-marker" aria-hidden="true">').appendTo($button);
      $button.on('click', () => this._startCapture());
      $question.append($button);

      const contextEl = this.question.closest('.or-group, .or-group-data')?.querySelector('.or-appearance-geolocation-context');
      if (contextEl && !contextEl.querySelector('input[type="radio"]:checked')) {
        $button.prop('disabled', true);
        $(contextEl).one('change', 'input[type="radio"]', () => $button.prop('disabled', false));
      }

      return globalThis.CHTCore.Translate.get('geolocation.capture')
        .then(text => $button.append($('<span class="geolocation-btn-label">').text(text)));
    } else {
      const $el = $('<p class="geolocation-unavailable">');
      $question.append($el);
      return globalThis.CHTCore.Translate.get('geolocation.unavailable')
        .then(text => $el.text(text));
    }
  }

  _startCapture() {
    const contextEl = this.question.closest('.or-group, .or-group-data')?.querySelector('.or-appearance-geolocation-context');
    if (contextEl) {
      $(contextEl).hide();
    }

    const $question = $(this.question);
    $question.find([
      '.geolocation-capture-btn',
      '.geolocation-status',
      '.geolocation-retry-btn',
      '.geolocation-skip-btn',
    ].join(',')).remove();

    const $status = $('<div class="geolocation-status">');
    const $progressRow = $('<div class="geolocation-progress-row">');
    const $progressLabel = $('<span class="geolocation-progress-label">');
    const $bar = $('<div class="geolocation-progress-bar">');
    $progressRow.append($progressLabel, $bar);
    $status.append($progressRow);
    $question.append($status);

    globalThis.CHTCore.Translate.get('geolocation.progress')
      .then(text => $progressLabel.text(text));

    globalThis.CHTCore.Geolocation.currentPromise.then(result => {
      if ('code' in result) {
        $bar.addClass('geolocation-progress-failure');

        const $resultRow = $('<div class="geolocation-result-row">');
        const $resultLabel = $('<span class="geolocation-result-label">');
        const $resultText = $('<span class="geolocation-failure-msg">');
        $resultRow.append($resultLabel, $resultText);
        $status.append($resultRow);

        const $retryBtn = $('<button type="button" class="btn btn-default geolocation-retry-btn">');
        $('<i class="fa fa-map-marker" aria-hidden="true">').appendTo($retryBtn);
        $retryBtn.on('click', () => {
          globalThis.CHTCore.Geolocation.retry();
          this._startCapture();
        });

        const $skipBtn = $('<button type="button" class="btn btn-default geolocation-skip-btn">');
        $status.append($retryBtn, $skipBtn);

        globalThis.CHTCore.Translate.get('geolocation.result.label').then(text => $resultLabel.text(text));
        globalThis.CHTCore.Translate.get('geolocation.failure').then(text => $resultText.text(text));
        globalThis.CHTCore.Translate.get('geolocation.retry').then(text => $retryBtn.append($('<span class="geolocation-btn-label">').text(text)));
        globalThis.CHTCore.Translate.get('geolocation.skip').then(text => $skipBtn.text(text));

        $(this.element).val('not_captured').trigger('change');
      } else {
        $bar.addClass('geolocation-progress-success');

        const $resultRow = $('<div class="geolocation-result-row">');
        const $resultLabel = $('<span class="geolocation-result-label">');
        const $msg = $('<p class="geolocation-success-msg">');
        $resultRow.append($resultLabel, $msg);
        $status.append($resultRow);

        globalThis.CHTCore.Translate.get('geolocation.result.label').then(text => $resultLabel.text(text));
        globalThis.CHTCore.Translate.get('geolocation.success').then(text => $msg.text(text));

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
