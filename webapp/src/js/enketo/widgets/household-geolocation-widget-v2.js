/* global globalThis */
'use strict';
const Widget = require('enketo-core/src/js/widget').default;
const $ = require('jquery');
require('enketo-core/src/js/plugins');

const TRANSLATION_KEYS = {
  PROGRESS: 'geolocation.progress',
  RESULT_LABEL: 'geolocation.result.label',
  FAILURE: 'geolocation.failure',
  SIGNAL_WEAK: 'geolocation.signal.weak',
  RETRY: 'geolocation.retry',
  SUCCESS: 'geolocation.success',
  PERMISSION_DENIED: 'geolocation.permission.denied',
  UNAVAILABLE: 'geolocation.unavailable',
  CANT_RECORD: 'geolocation.cant.record',
  AT_HOUSEHOLD: 'geolocation.at.household',
  SOMEWHERE_ELSE: 'geolocation.somewhere.else',
  NO_LOCATION_RECORDED: 'geolocation.no.location.recorded',
  EDIT_BADGE: 'geolocation.edit.badge',
  EDIT_CONTEXT_HOME: 'geolocation.edit.context.home',
  EDIT_CONTEXT_OTHER: 'geolocation.edit.context.other',
  EDIT_KEEP: 'geolocation.edit.keep.saved',
  EDIT_RECORD_NEW: 'geolocation.edit.record.new',
  EDIT_REMOVE: 'geolocation.edit.remove',
};

const WEAK_SIGNAL_CODES = new Set([2, 3, -2]);

class HouseholdGeolocationWidget extends Widget {
  static get selector() {
    return '.or-appearance-geolocation-capture input';
  }

  _init() {
    $(this.element).hide();
    const $question = $(this.question);

    if (this._isPermissionDenied()) {
      $(this.element).val('denied').trigger('change');
      $('<p class="geolocation-permission-denied">')
        .text(this._translate(TRANSLATION_KEYS.PERMISSION_DENIED))
        .appendTo($question);
      return;
    }

    if (!this._isGeolocationAvailable()) {
      $(this.element).val('unavailable').trigger('change');
      $('<p class="geolocation-unavailable">')
        .text(this._translate(TRANSLATION_KEYS.UNAVAILABLE))
        .appendTo($question);
      return;
    }

    if (this.element.dataset.geoHasLocation === 'true') {
      this._initEditMode($question);
      return;
    }

    if (this.element.dataset.geoIsEdit === 'true') {
      $('<p class="geolocation-no-location-msg">')
        .text(this._translate(TRANSLATION_KEYS.NO_LOCATION_RECORDED))
        .appendTo($question);
    }

    this._initCreateFlow($question);
  }

  _initCreateFlow($question) {
    const { $status, $bar } = this._buildProgressRow();
    $question.append($status);

    const $cantRecordBtn = this._buildCantRecordButton();
    $question.append($cantRecordBtn);

    $cantRecordBtn.on('click', () => {
      $(this.element).val('skipped').trigger('change');
    });

    this._waitForCapture($status, $bar);
  }

  _waitForCapture($status, $bar) {
    if (!globalThis.CHTCore.Geolocation || !globalThis.CHTCore.Geolocation.currentPromise) { // NOSONAR
      console.error('Geolocation widget: currentPromise is not available. Has geolocationService.init() been called?');
      return;
    }

    globalThis.CHTCore.Geolocation.currentPromise.then(result => {
      if ($(this.element).val() !== '') {
        return;
      }

      if ('code' in result) {
        this._onCaptureFailure(result.code, $status, $bar);
      } else {
        this._onCaptureSuccess($status, $bar);
      }
    });
  }

  _onCaptureSuccess($status, $bar) {
    $bar.addClass('geolocation-progress-success');

    const $resultRow = $('<div class="geolocation-result-row">');
    $('<span class="geolocation-result-label">')
      .text(this._translate(TRANSLATION_KEYS.RESULT_LABEL)).appendTo($resultRow);
    $('<p class="geolocation-success-msg">').text(this._translate(TRANSLATION_KEYS.SUCCESS)).appendTo($resultRow);
    $status.append($resultRow);

    const $contextOptions = this._buildContextChoices();
    $(this.question).find('.geolocation-cant-record-btn').before($contextOptions);
  }

  _buildContextChoices() {
    const radioName = 'geo-ctx-' + (this.element.getAttribute('name') || '').replace(/\W/g, '-');

    const $atHousehold = $('<input type="radio">').attr('name', radioName).val('home');
    const $atHouseholdLabel = $('<label class="geolocation-context-option">')
      .append($atHousehold, $('<span>').text(this._translate(TRANSLATION_KEYS.AT_HOUSEHOLD)));

    const $somewhereElse = $('<input type="radio">').attr('name', radioName).val('other');
    const $somewhereElseLabel = $('<label class="geolocation-context-option">')
      .append($somewhereElse, $('<span>').text(this._translate(TRANSLATION_KEYS.SOMEWHERE_ELSE)));

    const $contextOptions = $('<div class="geolocation-context-options">')
      .append($atHouseholdLabel, $somewhereElseLabel);

    $contextOptions.on('change', 'input[type="radio"]', event => {
      event.stopPropagation();
      this.element.dataset.geoContext = event.target.value;
      $(this.element).val('captured').trigger('change');
    });

    return $contextOptions;
  }

  _onCaptureFailure(errorCode, $status, $bar) {
    $bar.addClass('geolocation-progress-failure');

    const $resultRow = $('<div class="geolocation-result-row">');
    $('<span class="geolocation-result-label">')
      .text(this._translate(TRANSLATION_KEYS.RESULT_LABEL)).appendTo($resultRow);
    $('<span class="geolocation-failure-msg">').text(this._translate(TRANSLATION_KEYS.FAILURE)).appendTo($resultRow);
    $status.append($resultRow);

    if (WEAK_SIGNAL_CODES.has(errorCode)) {
      $('<p class="geolocation-weak-signal-msg">')
        .text(this._translate(TRANSLATION_KEYS.SIGNAL_WEAK))
        .appendTo($status);
    }

    const $retryBtn = $('<button type="button" class="btn btn-default geolocation-retry-btn">')
      .append(
        $('<i class="fa fa-map-marker" aria-hidden="true">'),
        $('<span class="geolocation-btn-label">').text(this._translate(TRANSLATION_KEYS.RETRY))
      );

    $retryBtn.on('click', () => {
      globalThis.CHTCore.Geolocation.retry();
      $status.find('.geolocation-result-row, .geolocation-weak-signal-msg').remove();
      $bar.removeClass('geolocation-progress-failure');
      $retryBtn.remove();
      this._waitForCapture($status, $bar);
    });

    $(this.question).find('.geolocation-cant-record-btn').before($retryBtn);
  }

  _buildProgressRow() {
    const $status = $('<div class="geolocation-status">');
    const $progressRow = $('<div class="geolocation-progress-row">');
    $('<span class="geolocation-progress-label">')
      .text(this._translate(TRANSLATION_KEYS.PROGRESS)).appendTo($progressRow);
    const $bar = $('<div class="geolocation-progress-bar">');
    $progressRow.append($bar);
    $status.append($progressRow);
    return { $status, $bar };
  }

  _buildCantRecordButton() {
    return $('<button type="button" class="btn btn-link geolocation-cant-record-btn">')
      .text(this._translate(TRANSLATION_KEYS.CANT_RECORD));
  }

  _initEditMode($question) { // eslint-disable-line no-unused-vars
    // Implemented in Phase 4
  }

  _translate(key) {
    return globalThis.CHTCore.Translate.instant(key);
  }

  _isGeolocationAvailable() {
    return globalThis.CHTCore.Geolocation.isAvailable();
  }

  _isPermissionDenied() {
    return globalThis.CHTCore.Geolocation.isPermissionDenied();
  }
}

module.exports = HouseholdGeolocationWidget;
