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
    }

    if (!this._isGeolocationAvailable()) {
      const $el = $('<p class="geolocation-unavailable">');
      $question.append($el);
      return globalThis.CHTCore.Translate.get('geolocation.unavailable')
        .then(text => $el.text(text));
    }

    const radioName = 'geo-ctx-' + (this.element.getAttribute('name') || '').replace(/\W/g, '-');
    const $homeSpan = $('<span class="geolocation-context-label">');
    const $homeRadio = $('<input type="radio">').attr('name', radioName).val('home');
    const $homeLabel = $('<label class="geolocation-context-option">').append($homeRadio, $homeSpan);

    const $otherSpan = $('<span class="geolocation-context-label">');
    const $otherRadio = $('<input type="radio">').attr('name', radioName).val('other');
    const $otherLabel = $('<label class="geolocation-context-option">').append($otherRadio, $otherSpan);

    const $contextOptions = $('<div class="geolocation-context-options">').append($homeLabel, $otherLabel);
    $question.append($contextOptions);

    const $button = $('<button type="button" class="btn btn-default geolocation-capture-btn">');
    $('<i class="fa fa-map-marker" aria-hidden="true">').appendTo($button);
    $button.prop('disabled', true);
    $button.on('click', () => this._startCapture());
    $question.append($button);

    $contextOptions.on('change', 'input[type="radio"]', event => {
      event.stopPropagation();
      this.element.dataset.geoContext = event.target.value;
      $button.prop('disabled', false);
    });

    return Promise.all([
      globalThis.CHTCore.Translate.get('geolocation.capture')
        .then(text => $button.append($('<span class="geolocation-btn-label">').text(text))),
      globalThis.CHTCore.Translate.get('geolocation.context.home').then(text => $homeSpan.text(text)),
      globalThis.CHTCore.Translate.get('geolocation.context.other').then(text => $otherSpan.text(text)),
    ]);
  }

  _startCapture() {
    $(this.question).find('.geolocation-context-options').hide();

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

        const $acknowledgeCheckbox = $('<input type="checkbox" class="geolocation-acknowledge-checkbox ignore">');
        const $acknowledgeSpan = $('<span class="geolocation-acknowledge-text">');
        const $acknowledgeLabel = $('<label class="geolocation-acknowledge-label">').append($acknowledgeCheckbox, $acknowledgeSpan);

        const $skipBtn = $('<button type="button" class="btn btn-default geolocation-skip-btn">');
        $skipBtn.prop('disabled', true);

        $acknowledgeCheckbox.on('change', event => {
          event.stopPropagation();
          $skipBtn.prop('disabled', !$acknowledgeCheckbox.prop('checked'));
        });

        $skipBtn.on('click', () => {
          $retryBtn.remove();
          $acknowledgeLabel.remove();
          $skipBtn.remove();

          const $skippedMsg = $('<p class="geolocation-skipped-msg">');
          $status.append($skippedMsg);
          globalThis.CHTCore.Translate.get('geolocation.skipped').then(text => $skippedMsg.text(text));

          $(this.element).val('skipped').trigger('change');
        });
        $status.append($retryBtn, $acknowledgeLabel, $skipBtn);

        globalThis.CHTCore.Translate.get('geolocation.result.label').then(text => $resultLabel.text(text));
        globalThis.CHTCore.Translate.get('geolocation.failure').then(text => $resultText.text(text));
        globalThis.CHTCore.Translate.get('geolocation.retry')
          .then(text => $retryBtn.append($('<span class="geolocation-btn-label">').text(text)));
        globalThis.CHTCore.Translate.get('geolocation.skip.button').then(text => $skipBtn.text(text));
        globalThis.CHTCore.Translate.get('geolocation.skip.acknowledge').then(text => $acknowledgeSpan.text(text));
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
