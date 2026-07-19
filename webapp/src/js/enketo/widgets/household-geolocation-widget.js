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
  CONTINUE_WITHOUT: 'geolocation.continue.without.location',
  AT_HOUSEHOLD: 'geolocation.at.household',
  SOMEWHERE_ELSE: 'geolocation.somewhere.else',
  NO_LOCATION_RECORDED: 'geolocation.no.location.recorded',
  EDIT_BADGE: 'geolocation.edit.badge',
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
      $('<p class="geolocation-permission-denied">')
        .text(this._translate(TRANSLATION_KEYS.PERMISSION_DENIED))
        .appendTo($question);
      this._appendContinueWithoutButton($question);
      document.addEventListener('geolocationPermissionGranted', () => {
        $question.find('.geolocation-permission-denied, .geolocation-continue-without-btn').remove();
        if (this.element.dataset.geoHasLocation === 'true') {
          this._initEditMode($question);
        } else {
          if (this.element.dataset.geoIsEdit === 'true') {
            $('<p class="geolocation-no-location-msg">')
              .text(this._translate(TRANSLATION_KEYS.NO_LOCATION_RECORDED))
              .appendTo($question);
          }
          this._initCreateFlow($question);
        }
      }, { once: true });
      return;
    }

    if (!this._isGeolocationAvailable()) {
      $('<p class="geolocation-unavailable">')
        .text(this._translate(TRANSLATION_KEYS.UNAVAILABLE))
        .appendTo($question);
      this._appendContinueWithoutButton($question);
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

    this._waitForCapture($status, $bar);
  }

  _waitForCapture($status, $bar) {
    if (!globalThis.CHTCore.Geolocation || !globalThis.CHTCore.Geolocation.currentPromise) { // NOSONAR
      console.error('Geolocation widget: currentPromise is not available. Has geolocationService.init() been called?');
      return;
    }

    globalThis.CHTCore.Geolocation.currentPromise.then(result => {
      if (!this._isEditWithLocation && $(this.element).val() !== '') {
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

    if (!this._isEditWithLocation || this._isRecordNewSelected()) {
      $(this.question).append(this._buildContextChoices());
    }
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
    if (this._isPermissionDenied()) {
      $bar.addClass('geolocation-progress-failure');
      $('<p class="geolocation-permission-denied">')
        .text(this._translate(TRANSLATION_KEYS.PERMISSION_DENIED))
        .appendTo($status);
      this._appendContinueWithoutButton();
      return;
    }

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
      $(this.question).find('.geolocation-continue-without-btn').remove();
      this._waitForCapture($status, $bar);
    });

    const $editChoices = $(this.question).find('.geolocation-edit-choices');
    if ($editChoices.length) {
      $retryBtn.insertBefore($editChoices);
    } else {
      $(this.question).append($retryBtn);
    }

    if (!this._isEditWithLocation || this._isRecordNewSelected()) {
      this._appendContinueWithoutButton();
    }
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

  _buildContinueWithoutButton() {
    return $('<button type="button" class="btn btn-default geolocation-continue-without-btn">')
      .text(this._translate(TRANSLATION_KEYS.CONTINUE_WITHOUT));
  }

  _appendContinueWithoutButton($target = $(this.question)) {
    const $btn = this._buildContinueWithoutButton();
    $btn.on('click', () => {
      $(this.element).val('skipped').trigger('change');
    });
    $target.append($btn);
  }

  _isRecordNewSelected() {
    return !!(this.question.querySelector('input[type="radio"][value="capture-new"]:checked'));
  }

  _initEditMode($question) {
    this._isEditWithLocation = true;

    $question.append(
      $('<div class="geolocation-edit-badge">').text(this._translate(TRANSLATION_KEYS.EDIT_BADGE))
    );

    const { $status, $bar } = this._buildProgressRow();
    $question.append($status);
    this._waitForCapture($status, $bar);

    setTimeout(() => $(this.element).val('kept').trigger('change'), 0);
    $question.append(this._buildEditChoices($bar));
  }

  _buildEditChoices($bar) {
    const radioName = 'geo-edit-' + (this.element.getAttribute('name') || '').replace(/\W/g, '-');

    const $keepRadio = $('<input type="radio">').attr('name', radioName).val('kept').prop('checked', true);
    const $keepLabel = $('<label class="geolocation-edit-option">')
      .append($keepRadio, $('<span>').text(this._translate(TRANSLATION_KEYS.EDIT_KEEP)));

    const $recordNewRadio = $('<input type="radio">').attr('name', radioName).val('capture-new');
    const $recordNewLabel = $('<label class="geolocation-edit-option">')
      .append($recordNewRadio, $('<span>').text(this._translate(TRANSLATION_KEYS.EDIT_RECORD_NEW)));

    const $removeRadio = $('<input type="radio">').attr('name', radioName).val('removed');
    const $removeLabel = $('<label class="geolocation-edit-option">')
      .append($removeRadio, $('<span>').text(this._translate(TRANSLATION_KEYS.EDIT_REMOVE)));

    const $choices = $('<div class="geolocation-edit-choices">')
      .append($keepLabel, $recordNewLabel, $removeLabel);

    $choices.on('change', 'input[type="radio"]', event => {
      event.stopPropagation();
      const value = event.target.value;
      if (value === 'kept') {
        $(this.element).val('kept').trigger('change');
        $(this.question).find('.geolocation-context-options, .geolocation-continue-without-btn').remove();
      } else if (value === 'removed') {
        $(this.element).val('skipped').trigger('change');
        $(this.question).find('.geolocation-context-options, .geolocation-continue-without-btn').remove();
      } else if (value === 'capture-new') {
        this._onCaptureNewSelected($bar);
      }
    });

    return $choices;
  }

  _onCaptureNewSelected($bar) {
    $(this.element).val('').trigger('change');
    // Enketo validates async (Promise), so defer the removal to a macrotask
    // that runs after the validation completes and adds the class.
    // This one-shot timeout means the error still appears on submit.
    setTimeout(() => $(this.question).removeClass('invalid-required'), 0);
    if ($bar.hasClass('geolocation-progress-failure') &&
        !$(this.question).find('.geolocation-continue-without-btn').length) {
      this._appendContinueWithoutButton();
    }
    if ($bar.hasClass('geolocation-progress-success') &&
        !$(this.question).find('.geolocation-context-options').length) {
      $(this.question).append(this._buildContextChoices());
    }
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
