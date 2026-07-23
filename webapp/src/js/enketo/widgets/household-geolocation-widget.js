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
  SAVE_WITHOUT: 'geolocation.save.without.location',
  AT_HOUSEHOLD: 'geolocation.at.household',
  SOMEWHERE_ELSE: 'geolocation.somewhere.else',
  NO_LOCATION_RECORDED: 'geolocation.no.location.recorded',
  EDIT_BADGE: 'geolocation.edit.badge',
  EDIT_KEEP: 'geolocation.edit.keep.saved',
  EDIT_CHANGE_LOCATION: 'geolocation.edit.change.location',
  EDIT_NOT_AT_HOUSEHOLD: 'geolocation.edit.not.at.household',
  EDIT_REMOVE: 'geolocation.edit.remove',
};

const WEAK_SIGNAL_CODES = new Set([2, 3, -2]);
// Standard GeolocationPositionError.PERMISSION_DENIED code (W3C Geolocation API spec).
const GEOLOCATION_PERMISSION_DENIED = 1;

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
      this._appendSaveWithoutCheckbox($question);
      document.addEventListener('geolocationPermissionGranted', () => {
        $question.find('.geolocation-permission-denied, .geolocation-save-without-label').remove();
        if (this.element.dataset.geoHasLocation === 'true') {
          this._initEditMode($question);
        } else {
          this._initCreateFlow($question);
          if (this.element.dataset.geoIsEdit === 'true') {
            $('<p class="geolocation-no-location-msg">')
              .text(this._translate(TRANSLATION_KEYS.NO_LOCATION_RECORDED))
              .appendTo($question);
          }
        }
      }, { once: true });
      return;
    }

    if (!this._isGeolocationAvailable()) {
      $('<p class="geolocation-unavailable">')
        .text(this._translate(TRANSLATION_KEYS.UNAVAILABLE))
        .appendTo($question);
      this._appendSaveWithoutCheckbox($question);
      return;
    }

    if (this.element.dataset.geoHasLocation === 'true') {
      this._initEditMode($question);
      return;
    }

    this._initCreateFlow($question);

    if (this.element.dataset.geoIsEdit === 'true') {
      $('<p class="geolocation-no-location-msg">')
        .text(this._translate(TRANSLATION_KEYS.NO_LOCATION_RECORDED))
        .appendTo($question);
    }
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

    if (this._isEditWithLocation) {
      $(this.question)
        .find('input[type="radio"][value="capture-home"], input[type="radio"][value="capture-other"]')
        .prop('disabled', false);
    }

    const $resultRow = $('<div class="geolocation-result-row">');
    $('<span class="geolocation-result-label">')
      .text(this._translate(TRANSLATION_KEYS.RESULT_LABEL)).appendTo($resultRow);
    $('<p class="geolocation-success-msg">').text(this._translate(TRANSLATION_KEYS.SUCCESS)).appendTo($resultRow);
    $status.append($resultRow);

    if (!this._isEditWithLocation) {
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
    $bar.addClass('geolocation-progress-failure');

    if (this._isEditWithLocation) {
      $(this.question)
        .find('input[type="radio"][value="capture-home"], input[type="radio"][value="capture-other"]')
        .prop('disabled', true);
    }

    if (errorCode === GEOLOCATION_PERMISSION_DENIED) {
      $('<p class="geolocation-permission-denied">')
        .text(this._translate(TRANSLATION_KEYS.PERMISSION_DENIED))
        .appendTo($status);
      if (!this._isEditWithLocation) {
        this._appendSaveWithoutCheckbox();
      }
      return;
    }

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
      $(this.question).find('.geolocation-save-without-label').remove();
      this._waitForCapture($status, $bar);
    });

    $status.append($retryBtn);

    if (!this._isEditWithLocation) {
      this._appendSaveWithoutCheckbox();
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

  _buildSaveWithoutCheckbox() {
    const $checkbox = $('<input type="checkbox" class="geolocation-save-without-checkbox">');
    const $label = $('<label class="geolocation-save-without-label">')
      .append($checkbox, $('<span>').text(this._translate(TRANSLATION_KEYS.SAVE_WITHOUT)));
    $checkbox.on('change', (event) => {
      event.stopPropagation();
      const checked = $checkbox.prop('checked');
      $label.attr('data-checked', checked ? 'true' : null);
      if (checked && globalThis.CHTCore.Geolocation.currentHandle) {
        globalThis.CHTCore.Geolocation.currentHandle.cancel();
      }
      $(this.element).val(checked ? 'skipped' : '').trigger('change');
    });
    return $label;
  }

  _appendSaveWithoutCheckbox($target = $(this.question)) {
    $target.append(this._buildSaveWithoutCheckbox());
  }

  _initEditMode($question) {
    this._isEditWithLocation = true;

    const { $status, $bar } = this._buildProgressRow();
    $question.append($status);
    this._waitForCapture($status, $bar);

    $question.append(
      $('<div class="geolocation-edit-badge">').text(this._translate(TRANSLATION_KEYS.EDIT_BADGE))
    );

    setTimeout(() => $(this.element).val('kept').trigger('change'), 0);
    $question.append(this._buildEditChoices());
  }

  _buildEditChoices() {
    const radioName = 'geo-edit-' + (this.element.getAttribute('name') || '').replace(/\W/g, '-');

    const $keepRadio = $('<input type="radio">').attr('name', radioName).val('kept').prop('checked', true);
    const $keepLabel = $('<label class="geolocation-edit-option">')
      .append($keepRadio, $('<span>').text(this._translate(TRANSLATION_KEYS.EDIT_KEEP)));

    const $changeLocationRadio = $('<input type="radio">')
      .attr('name', radioName).val('capture-home').prop('disabled', true);
    const $changeLocationLabel = $('<label class="geolocation-edit-option">')
      .append($changeLocationRadio, $('<span>').text(this._translate(TRANSLATION_KEYS.EDIT_CHANGE_LOCATION)));

    const $notAtHouseholdRadio = $('<input type="radio">')
      .attr('name', radioName).val('capture-other').prop('disabled', true);
    const $notAtHouseholdLabel = $('<label class="geolocation-edit-option">')
      .append($notAtHouseholdRadio, $('<span>').text(this._translate(TRANSLATION_KEYS.EDIT_NOT_AT_HOUSEHOLD)));

    const $removeRadio = $('<input type="radio">').attr('name', radioName).val('removed');
    const $removeLabel = $('<label class="geolocation-edit-option">')
      .append($removeRadio, $('<span>').text(this._translate(TRANSLATION_KEYS.EDIT_REMOVE)));

    const $choices = $('<div class="geolocation-edit-choices">')
      .append($keepLabel, $changeLocationLabel, $notAtHouseholdLabel, $removeLabel);

    $choices.on('change', 'input[type="radio"]', event => {
      event.stopPropagation();
      const value = event.target.value;
      if (value === 'kept') {
        $(this.element).val('kept').trigger('change');
      } else if (value === 'removed') {
        $(this.element).val('skipped').trigger('change');
      } else if (value === 'capture-home') {
        this.element.dataset.geoContext = 'home';
        $(this.element).val('captured').trigger('change');
      } else if (value === 'capture-other') {
        this.element.dataset.geoContext = 'other';
        $(this.element).val('captured').trigger('change');
      }
    });

    return $choices;
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
