/* global globalThis */
'use strict';
const Widget = require('enketo-core/src/js/widget').default;
const $ = require('jquery');
require('enketo-core/src/js/plugins');

const TRANSLATION_KEYS = {
  PROGRESS: 'geolocation.progress',
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

// Class names referenced from more than one method - created in one place, queried/removed in
// another. Kept as a single source of truth so the two sides can't silently drift apart.
const CLASS_NAMES = {
  PROGRESS_ROW: 'geolocation-progress-row',
  RESULT_ROW: 'geolocation-result-row',
  WEAK_SIGNAL_MSG: 'geolocation-weak-signal-msg',
  SAVE_WITHOUT_LABEL: 'geolocation-save-without-label',
  PERMISSION_DENIED_MSG: 'geolocation-permission-denied',
};

// The edit-choices radio group's own DOM `value`s - distinct from FIELD_VALUES below, which are
// what actually gets written to the form field once a choice is made.
const RADIO_VALUES = {
  KEPT: 'kept',
  CHANGE_LOCATION: 'capture-home',
  NOT_AT_HOUSEHOLD: 'capture-other',
  REMOVED: 'removed',
};

const CAPTURE_RADIOS_SELECTOR = `input[type="radio"][value="${RADIO_VALUES.CHANGE_LOCATION}"], ` +
  `input[type="radio"][value="${RADIO_VALUES.NOT_AT_HOUSEHOLD}"]`;

const FIELD_VALUES = {
  SKIPPED: 'skipped',
  CAPTURED: 'captured',
};

const GEO_CONTEXT = {
  HOME: 'home',
  OTHER: 'other',
};

class HouseholdGeolocationWidget extends Widget {
  static get selector() {
    return '.or-appearance-geolocation-capture input';
  }

  _init() {
    $(this.element).hide();
    const $question = $(this.question);

    if (this._isPermissionDenied()) {
      $(`<p class="${CLASS_NAMES.PERMISSION_DENIED_MSG}">`)
        .text(this._translate(TRANSLATION_KEYS.PERMISSION_DENIED))
        .appendTo($question);
      this._appendSaveWithoutCheckbox($question);
      document.addEventListener('geolocationPermissionGranted', () => {
        $question.find(`.${CLASS_NAMES.PERMISSION_DENIED_MSG}, .${CLASS_NAMES.SAVE_WITHOUT_LABEL}`).remove();
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

  _onCaptureSuccess($status) {
    $(`.${CLASS_NAMES.PROGRESS_ROW}`).hide();

    if (this._isEditWithLocation) {
      $(this.question)
        .find(CAPTURE_RADIOS_SELECTOR)
        .prop('disabled', false);
    }

    const $resultRow = $(`<div class="${CLASS_NAMES.RESULT_ROW}">`);
    $('<span class="alert alert-success">')
      .append(
        $('<i class="fa fa-check" aria-hidden="true">'),
        $('<span>').text(' ' + this._translate(TRANSLATION_KEYS.SUCCESS))
      )
      .appendTo($resultRow);
    $status.append($resultRow);

    if (!this._isEditWithLocation) {
      $(this.question).append(this._buildContextChoices());
    }
  }

  _buildContextChoices() {
    const radioName = 'geo-ctx-' + (this.element.getAttribute('name') || '').replace(/\W/g, '-');

    const $atHousehold = $('<input type="radio">').attr('name', radioName).val(GEO_CONTEXT.HOME);
    const $atHouseholdLabel = $('<label class="geolocation-context-option">')
      .append($atHousehold, $('<span>').text(this._translate(TRANSLATION_KEYS.AT_HOUSEHOLD)));

    const $somewhereElse = $('<input type="radio">').attr('name', radioName).val(GEO_CONTEXT.OTHER);
    const $somewhereElseLabel = $('<label class="geolocation-context-option">')
      .append($somewhereElse, $('<span>').text(this._translate(TRANSLATION_KEYS.SOMEWHERE_ELSE)));

    const $contextOptions = $('<div class="geolocation-context-options">')
      .append($atHouseholdLabel, $somewhereElseLabel);

    $contextOptions.on('change', 'input[type="radio"]', event => {
      event.stopPropagation();
      this.element.dataset.geoContext = event.target.value;
      $(this.element).val(FIELD_VALUES.CAPTURED).trigger('change');
    });

    return $contextOptions;
  }

  _onCaptureFailure(errorCode, $status, $bar) {
    $(`.${CLASS_NAMES.PROGRESS_ROW}`).hide();

    if (this._isEditWithLocation) {
      $(this.question)
        .find(CAPTURE_RADIOS_SELECTOR)
        .prop('disabled', true);
    }

    if (errorCode === GEOLOCATION_PERMISSION_DENIED) {
      this._showPermissionDeniedFailure($status);
      return;
    }

    this._showGenericFailure(errorCode, $status, $bar);
  }

  _showPermissionDeniedFailure($status) {
    $(`<p class="${CLASS_NAMES.PERMISSION_DENIED_MSG}">`)
      .text(this._translate(TRANSLATION_KEYS.PERMISSION_DENIED))
      .appendTo($status);
    if (!this._isEditWithLocation) {
      this._appendSaveWithoutCheckbox();
    }
  }

  _showGenericFailure(errorCode, $status, $bar) {
    const $resultRow = $(`<div class="${CLASS_NAMES.RESULT_ROW}">`);
    $('<span class="alert alert-error">')
      .append(
        $('<i class="fa fa-exclamation-triangle" aria-hidden="true">'),
        $('<span>').text(' ' + this._translate(TRANSLATION_KEYS.FAILURE))
      )
      .appendTo($resultRow);
    $status.append($resultRow);

    if (WEAK_SIGNAL_CODES.has(errorCode)) {
      $(`<p class="${CLASS_NAMES.WEAK_SIGNAL_MSG}">`)
        .append(
          $('<i class="fa fa-info-circle" aria-hidden="true">'),
          $('<span>').text(' ' + this._translate(TRANSLATION_KEYS.SIGNAL_WEAK))
        )
        .appendTo($status);
    }

    const $retryBtn = $('<button type="button" class="btn btn-primary geolocation-retry-btn">')
      .append(
        $('<i class="fa fa-refresh" aria-hidden="true">'),
        $('<span class="geolocation-btn-label">').text(this._translate(TRANSLATION_KEYS.RETRY))
      );

    $retryBtn.on('click', () => {
      $(`.${CLASS_NAMES.PROGRESS_ROW}`).show();
      globalThis.CHTCore.Geolocation.retry();
      $status.find(`.${CLASS_NAMES.RESULT_ROW}, .${CLASS_NAMES.WEAK_SIGNAL_MSG}`).remove();
      $retryBtn.remove();
      $(this.question).find(`.${CLASS_NAMES.SAVE_WITHOUT_LABEL}`).remove();
      this._waitForCapture($status, $bar);
    });

    $status.append($retryBtn);

    if (!this._isEditWithLocation) {
      this._appendSaveWithoutCheckbox();
    }
  }

  _buildProgressRow() {
    const $status = $('<div class="geolocation-status">');
    const $progressRow = $(`<div class="${CLASS_NAMES.PROGRESS_ROW}">`);
    $('<span class="geolocation-progress-label">')
      .text(this._translate(TRANSLATION_KEYS.PROGRESS)).appendTo($progressRow);
    const $bar = $('<div class="geolocation-progress-bar">');
    $progressRow.append($bar);
    $status.append($progressRow);
    return { $status, $bar };
  }

  _buildSaveWithoutCheckbox() {
    const $checkbox = $('<input type="checkbox" class="geolocation-save-without-checkbox">');
    const $label = $(`<label class="${CLASS_NAMES.SAVE_WITHOUT_LABEL}">`)
      .append($checkbox, $('<span>').text(this._translate(TRANSLATION_KEYS.SAVE_WITHOUT)));
    $checkbox.on('change', (event) => {
      event.stopPropagation();
      const checked = $checkbox.prop('checked');
      $label.attr('data-checked', checked ? 'true' : null);
      if (checked && globalThis.CHTCore.Geolocation.currentHandle) {
        globalThis.CHTCore.Geolocation.currentHandle.cancel();
      }
      $(this.element).val(checked ? FIELD_VALUES.SKIPPED : '').trigger('change');
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

    setTimeout(() => $(this.element).val(RADIO_VALUES.KEPT).trigger('change'), 0);
    $question.append(this._buildEditChoices());
  }

  _buildEditChoices() {
    const radioName = 'geo-edit-' + (this.element.getAttribute('name') || '').replace(/\W/g, '-');

    const $keepRadio = $('<input type="radio">').attr('name', radioName).val(RADIO_VALUES.KEPT).prop('checked', true);
    const $keepLabel = $('<label class="geolocation-edit-option">')
      .append($keepRadio, $('<span>').text(this._translate(TRANSLATION_KEYS.EDIT_KEEP)));

    const $changeLocationRadio = $('<input type="radio">')
      .attr('name', radioName).val(RADIO_VALUES.CHANGE_LOCATION).prop('disabled', true);
    const $changeLocationLabel = $('<label class="geolocation-edit-option">')
      .append($changeLocationRadio, $('<span>').text(this._translate(TRANSLATION_KEYS.EDIT_CHANGE_LOCATION)));

    const $notAtHouseholdRadio = $('<input type="radio">')
      .attr('name', radioName).val(RADIO_VALUES.NOT_AT_HOUSEHOLD).prop('disabled', true);
    const $notAtHouseholdLabel = $('<label class="geolocation-edit-option">')
      .append($notAtHouseholdRadio, $('<span>').text(this._translate(TRANSLATION_KEYS.EDIT_NOT_AT_HOUSEHOLD)));

    const $removeRadio = $('<input type="radio">').attr('name', radioName).val(RADIO_VALUES.REMOVED);
    const $removeLabel = $('<label class="geolocation-edit-option">')
      .append($removeRadio, $('<span>').text(this._translate(TRANSLATION_KEYS.EDIT_REMOVE)));

    const $choices = $('<div class="geolocation-edit-choices">')
      .append($keepLabel, $changeLocationLabel, $notAtHouseholdLabel, $removeLabel);

    $choices.on('change', 'input[type="radio"]', event => {
      event.stopPropagation();
      const value = event.target.value;
      if (value === RADIO_VALUES.KEPT) {
        $(this.element).val(RADIO_VALUES.KEPT).trigger('change');
      } else if (value === RADIO_VALUES.REMOVED) {
        $(this.element).val(FIELD_VALUES.SKIPPED).trigger('change');
      } else if (value === RADIO_VALUES.CHANGE_LOCATION) {
        this.element.dataset.geoContext = GEO_CONTEXT.HOME;
        $(this.element).val(FIELD_VALUES.CAPTURED).trigger('change');
      } else if (value === RADIO_VALUES.NOT_AT_HOUSEHOLD) {
        this.element.dataset.geoContext = GEO_CONTEXT.OTHER;
        $(this.element).val(FIELD_VALUES.CAPTURED).trigger('change');
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
