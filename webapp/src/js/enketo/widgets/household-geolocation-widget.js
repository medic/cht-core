/* global globalThis */
'use strict';
const Widget = require('enketo-core/src/js/widget').default;
const $ = require('jquery');
require('enketo-core/src/js/plugins');

const WEAK_SIGNAL_CODES = new Set([2, 3, -2]);

const TRANSLATION_KEYS = {
  CONTEXT_HOME: 'geolocation.context.home',
  CONTEXT_OTHER: 'geolocation.context.other',
  EDIT_ACKNOWLEDGE: 'geolocation.edit.acknowledge',
  EDIT_BADGE: 'geolocation.edit.badge',
  EDIT_CAPTURE_NEW: 'geolocation.edit.capture_new',
  EDIT_CONTEXT_HOME: 'geolocation.edit.context.home',
  EDIT_CONTEXT_OTHER: 'geolocation.edit.context.other',
  EDIT_KEEP: 'geolocation.edit.keep',
  EDIT_PROMPT: 'geolocation.edit.prompt',
  EDIT_WARNING: 'geolocation.edit.warning',
  EDIT_WARNING_TITLE: 'geolocation.edit.warning.title',
  FAILURE: 'geolocation.failure',
  PERMISSION_DENIED: 'geolocation.permission.denied',
  PROGRESS: 'geolocation.progress',
  RESULT_LABEL: 'geolocation.result.label',
  RETRY: 'geolocation.retry',
  SIGNAL_WEAK: 'geolocation.signal.weak',
  EDIT_HOME_REMOVING: 'geolocation.edit.home.removing',
  NO_LOCATION_RECORDED: 'geolocation.no.location.recorded',
  SKIP_ACKNOWLEDGE: 'geolocation.skip.acknowledge',
  SKIP_BUTTON: 'geolocation.skip.button',
  SKIPPED: 'geolocation.skipped',
  SUCCESS: 'geolocation.success',
  UNAVAILABLE: 'geolocation.unavailable',
};

class HouseholdGeolocationWidget extends Widget {
  static get selector() {
    return '.or-appearance-geolocation-capture input';
  }

  _init() {
    $(this.element).hide();
    const $question = $(this.question);

    if (this._isPermissionDenied()) {
      $(this.element).val('denied').trigger('change');
      const $el = $('<p class="geolocation-permission-denied">');
      $el.text(globalThis.CHTCore.Translate.instant(TRANSLATION_KEYS.PERMISSION_DENIED));
      $question.append($el);
      return;
    }

    if (!this._isGeolocationAvailable()) {
      $(this.element).val('unavailable').trigger('change');
      const $el = $('<p class="geolocation-unavailable">');
      $el.text(globalThis.CHTCore.Translate.instant(TRANSLATION_KEYS.UNAVAILABLE));
      $question.append($el);
      return;
    }

    if (this.element.dataset.geoHasLocation === 'true') {
      this._initEditMode();
      return;
    }

    if (this.element.dataset.geoIsEdit === 'true') {
      const $noLocationMsg = $('<p class="geolocation-no-location-msg">');
      $noLocationMsg.text(globalThis.CHTCore.Translate.instant(TRANSLATION_KEYS.NO_LOCATION_RECORDED));
      $question.append($noLocationMsg);
    }

    const radioName = 'geo-ctx-' + (this.element.getAttribute('name') || '').replace(/\W/g, '-');
    const { $contextOptions, $homeSpan, $otherSpan } = this._buildContextOptions(radioName);
    $question.append($contextOptions);

    $contextOptions.on('change', 'input[type="radio"]', event => {
      event.stopPropagation();
      this.element.dataset.geoContext = event.target.value;
      this._startCapture();
    });

    $homeSpan.text(globalThis.CHTCore.Translate.instant(TRANSLATION_KEYS.CONTEXT_HOME));
    $otherSpan.text(globalThis.CHTCore.Translate.instant(TRANSLATION_KEYS.CONTEXT_OTHER));
  }

  _buildContextOptions(radioName) {
    const $homeSpan = $('<span class="geolocation-context-label">');
    const $homeRadio = $('<input type="radio">').attr('name', radioName).val('home');
    const $homeLabel = $('<label class="geolocation-context-option">').append($homeRadio, $homeSpan);

    const $otherSpan = $('<span class="geolocation-context-label">');
    const $otherRadio = $('<input type="radio">').attr('name', radioName).val('other');
    const $otherLabel = $('<label class="geolocation-context-option">').append($otherRadio, $otherSpan);

    const $contextOptions = $('<div class="geolocation-context-options">').append($homeLabel, $otherLabel);
    return { $contextOptions, $homeSpan, $otherSpan };
  }

  _initEditMode() {
    const $question = $(this.question);

    $(this.element).val('kept');
    this.element.dataset.geoContext = 'home';
    // Defer the change trigger: Enketo's setEventHandlers() runs after widgets.init(),
    // so triggering immediately would fire before the model update listener is registered.
    setTimeout(() => $(this.element).trigger('change'), 0);

    const lastCapture = this._parseLastCapture();
    const { $badge, $badgeText, $badgeContext } = this._buildEditBadge(lastCapture);

    const $prompt = $('<p class="geolocation-edit-prompt">');
    $question.append($badge, $prompt);

    const radioName = 'geo-edit-' + (this.element.getAttribute('name') || '').replace(/\W/g, '-');
    const { $keptLabel, $keptSpan, $captureNewLabel, $captureNewSpan } = this._buildEditRadioOptions(radioName);
    const { $editAcknowledgeLabel, $editAcknowledgeCheckbox, $editAcknowledgeSpan } = this._buildEditAcknowledgeLabel();
    const { $warningGroup, $warningTitleText, $warningText } = this._buildEditWarningGroup($editAcknowledgeLabel);

    const $editOptions = $('<div class="geolocation-edit-options">')
      .append($keptLabel, $captureNewLabel, $warningGroup);
    $question.append($editOptions);

    $editOptions.on('change', 'input[type="radio"]', event => {
      event.stopPropagation();
      this._handleEditRadioChange(event.target.value, $warningGroup);
    });

    $editAcknowledgeCheckbox.on('change', event => {
      event.stopPropagation();
      this._onEditAcknowledgeChange($editAcknowledgeCheckbox, $editOptions);
    });

    $badgeText.text(globalThis.CHTCore.Translate.instant(TRANSLATION_KEYS.EDIT_BADGE));
    if (lastCapture) {
      this._translateBadgeContext(lastCapture, $badgeContext);
    }
    $prompt.text(globalThis.CHTCore.Translate.instant(TRANSLATION_KEYS.EDIT_PROMPT));
    $keptSpan.text(globalThis.CHTCore.Translate.instant(TRANSLATION_KEYS.EDIT_KEEP));
    $captureNewSpan.text(globalThis.CHTCore.Translate.instant(TRANSLATION_KEYS.EDIT_CAPTURE_NEW));
    $warningTitleText.text(globalThis.CHTCore.Translate.instant(TRANSLATION_KEYS.EDIT_WARNING_TITLE));
    $warningText.text(globalThis.CHTCore.Translate.instant(TRANSLATION_KEYS.EDIT_WARNING));
    $editAcknowledgeSpan.text(globalThis.CHTCore.Translate.instant(TRANSLATION_KEYS.EDIT_ACKNOWLEDGE));
  }

  _parseLastCapture() {
    try {
      return this.element.dataset.geoLastCapture
        ? JSON.parse(this.element.dataset.geoLastCapture)
        : null;
    } catch (e) {
      console.error('Failed to parse geoLastCapture dataset', e);
      return null;
    }
  }

  _buildEditBadge(lastCapture) {
    const $badge = $('<div class="geolocation-edit-badge">');
    const $badgeIcon = $('<i class="fa fa-map-marker geolocation-edit-badge-icon" aria-hidden="true">');
    const $badgeText = $('<span class="geolocation-edit-badge-text">');
    const $badgeContent = $('<div class="geolocation-edit-badge-content">').append($badgeText);
    $('<div class="geolocation-edit-badge-header">').append($badgeIcon, $badgeContent).appendTo($badge);

    let $badgeContext = null;
    if (lastCapture) {
      $badgeContext = $('<span class="geolocation-edit-badge-context">');
      $badgeContent.append($badgeContext);
    }

    return { $badge, $badgeText, $badgeContext };
  }

  _buildEditRadioOptions(radioName) {
    const $keptSpan = $('<span class="geolocation-context-label">');
    const $keptRadio = $('<input type="radio">').attr('name', radioName).val('kept').prop('checked', true);
    const $keptLabel = $('<label class="geolocation-context-option">').append($keptRadio, $keptSpan);

    const $captureNewSpan = $('<span class="geolocation-context-label">');
    const $captureNewRadio = $('<input type="radio">').attr('name', radioName).val('capture-new');
    const $captureNewLabel = $('<label class="geolocation-context-option">')
      .append($captureNewRadio, $captureNewSpan);

    return { $keptLabel, $keptSpan, $captureNewLabel, $captureNewSpan };
  }

  _buildEditAcknowledgeLabel() {
    const $editAcknowledgeCheckbox = $(
      '<input type="checkbox" class="geolocation-edit-acknowledge-checkbox ignore">'
    );
    const $editAcknowledgeSpan = $('<span class="geolocation-edit-acknowledge-text">');
    const $editAcknowledgeLabel = $('<label class="geolocation-edit-acknowledge-label">')
      .append($editAcknowledgeCheckbox, $editAcknowledgeSpan);
    return { $editAcknowledgeLabel, $editAcknowledgeCheckbox, $editAcknowledgeSpan };
  }

  _buildEditWarningGroup($editAcknowledgeLabel) {
    const $warningTitleIcon = $(
      '<i class="fa fa-exclamation-triangle geolocation-edit-warning-title-icon" aria-hidden="true">'
    );
    const $warningTitleText = $('<span>');
    const $warningTitle = $('<div class="geolocation-edit-warning-title">')
      .append($warningTitleIcon, $warningTitleText);
    const $warningText = $('<span class="geolocation-edit-warning-text">');
    const $warning = $('<div class="geolocation-edit-warning">').append($warningTitle, $warningText);
    const $warningGroup = $('<div class="geolocation-edit-warning-group">').hide()
      .append($warning, $editAcknowledgeLabel);
    return { $warningGroup, $warningTitleText, $warningText };
  }

  _handleEditRadioChange(value, $warning) {
    if (value === 'capture-new') {
      $(this.element).val('').trigger('change');
      // Enketo validates asynchronously (via Promise), so the invalid-required class
      // is added after this synchronous call returns. setTimeout defers the removal
      // until after the microtask queue drains, keeping the UI clean while the user
      // completes the capture flow. Validation still fires (and blocks submit) if
      // the user tries to proceed without finishing.
      setTimeout(() => $(this.question).removeClass('invalid-required'), 0);
      $warning.show();
    } else {
      $(this.element).val('kept').trigger('change');
      $warning.hide();
    }
  }

  _onEditAcknowledgeChange($editAcknowledgeCheckbox, $editOptions) {
    if ($editAcknowledgeCheckbox.prop('checked')) {
      $editOptions.hide();
      this._startCapture();
    }
  }

  _translateBadgeContext(lastCapture, $badgeContext) {
    const key = lastCapture.isHome ? TRANSLATION_KEYS.EDIT_CONTEXT_HOME : TRANSLATION_KEYS.EDIT_CONTEXT_OTHER;
    $badgeContext.text(globalThis.CHTCore.Translate.instant(key));
  }

  _revertToEditChoice() {
    globalThis.CHTCore.Geolocation.retry();
    const $question = $(this.question);
    $question.find('.geolocation-edit-options, .geolocation-edit-prompt').show();
    const $keptRadio = $question.find('input[type="radio"][value="kept"]');
    $keptRadio.prop('checked', true).trigger('change');
  }

  _startCapture() {
    const isEditMode = this.element.dataset.geoHasLocation === 'true';
    const $question = $(this.question);

    if (isEditMode) {
      $question.find('.geolocation-edit-options, .geolocation-edit-prompt').hide();
    }

    $question.find([
      '.geolocation-context-confirmation',
      '.geolocation-status',
      '.geolocation-retry-btn',
      '.geolocation-skip-btn',
    ].join(',')).remove();

    const { $status, $progressLabel, $bar } = this._buildProgressRow();
    $question.append($status);

    $progressLabel.text(globalThis.CHTCore.Translate.instant(TRANSLATION_KEYS.PROGRESS));

    if (!globalThis.CHTCore.Geolocation || !globalThis.CHTCore.Geolocation.currentPromise) { // NOSONAR
      console.error('Geolocation widget: currentPromise is not available. Has geolocationService.init() been called?');
      return;
    }

    globalThis.CHTCore.Geolocation.currentPromise.then(result => {
      if ('code' in result) {
        this._buildCaptureFailureUI(result.code, $status, $bar, isEditMode);
      } else {
        this._buildCaptureSuccessUI($status, $bar);
      }
    });
  }

  _buildProgressRow() {
    const $status = $('<div class="geolocation-status">');
    const $progressRow = $('<div class="geolocation-progress-row">');
    const $progressLabel = $('<span class="geolocation-progress-label">');
    const $bar = $('<div class="geolocation-progress-bar">');
    $progressRow.append($progressLabel, $bar);
    $status.append($progressRow);
    return { $status, $progressLabel, $bar };
  }

  _buildCaptureFailureUI(errorCode, $status, $bar, isEditMode) {
    $bar.addClass('geolocation-progress-failure');

    const $resultRow = $('<div class="geolocation-result-row">');
    const $resultLabel = $('<span class="geolocation-result-label">');
    const $resultText = $('<span class="geolocation-failure-msg">');
    $resultRow.append($resultLabel, $resultText);
    $status.append($resultRow);

    const isWeakSignal = WEAK_SIGNAL_CODES.has(errorCode);
    if (isWeakSignal) {
      const $weakSignalMsg = $('<p class="geolocation-weak-signal-msg">');
      $weakSignalMsg.text(globalThis.CHTCore.Translate.instant(TRANSLATION_KEYS.SIGNAL_WEAK));
      $status.append($weakSignalMsg);
    }

    const $retryBtn = $('<button type="button" class="btn btn-default geolocation-retry-btn">');
    $('<i class="fa fa-map-marker" aria-hidden="true">').appendTo($retryBtn);
    $retryBtn.on('click', () => {
      globalThis.CHTCore.Geolocation.retry();
      this._startCapture();
    });

    const $acknowledgeCheckbox = $('<input type="checkbox" class="geolocation-acknowledge-checkbox ignore">');
    const $acknowledgeSpan = $('<span class="geolocation-acknowledge-text">');
    const $acknowledgeLabel = $('<label class="geolocation-acknowledge-label">')
      .append($acknowledgeCheckbox, $acknowledgeSpan);

    const $skipBtn = $('<button type="button" class="btn btn-default geolocation-skip-btn">').prop('disabled', true);

    $acknowledgeCheckbox.on('change', event => {
      event.stopPropagation();
      $skipBtn.prop('disabled', !$acknowledgeCheckbox.prop('checked'));
    });

    if (isEditMode) {
      $skipBtn.on('click', () => {
        const $question = $(this.question);
        $status.remove();
        $question.find([
          '.geolocation-edit-badge',
          '.geolocation-edit-options',
          '.geolocation-edit-prompt',
        ].join(',')).hide();
        const $removingMsg = $('<p class="geolocation-home-removing-msg">');
        $removingMsg.text(globalThis.CHTCore.Translate.instant(TRANSLATION_KEYS.EDIT_HOME_REMOVING));
        $question.append($removingMsg);
        $(this.element).val('skipped').trigger('change');
      });
    } else {
      $skipBtn.on('click', () => {
        $retryBtn.remove();
        $acknowledgeLabel.remove();
        $skipBtn.remove();
        $resultRow.remove();
        $status.find('.geolocation-weak-signal-msg').remove();
        const $skippedMsg = $('<p class="geolocation-skipped-msg">');
        $skippedMsg.text(globalThis.CHTCore.Translate.instant(TRANSLATION_KEYS.SKIPPED));
        $status.append($skippedMsg);
        $(this.element).val('skipped').trigger('change');
      });
    }

    $status.append($retryBtn, $acknowledgeLabel, $skipBtn);

    $resultLabel.text(globalThis.CHTCore.Translate.instant(TRANSLATION_KEYS.RESULT_LABEL));
    $resultText.text(globalThis.CHTCore.Translate.instant(TRANSLATION_KEYS.FAILURE));
    $retryBtn.append(
      $('<span class="geolocation-btn-label">').text(globalThis.CHTCore.Translate.instant(TRANSLATION_KEYS.RETRY))
    );
    $skipBtn.text(globalThis.CHTCore.Translate.instant(TRANSLATION_KEYS.SKIP_BUTTON));
    $acknowledgeSpan.text(globalThis.CHTCore.Translate.instant(TRANSLATION_KEYS.SKIP_ACKNOWLEDGE));
  }

  _buildCaptureSuccessUI($status, $bar) {
    $bar.addClass('geolocation-progress-success');

    const $resultRow = $('<div class="geolocation-result-row">');
    const $resultLabel = $('<span class="geolocation-result-label">');
    const $msg = $('<p class="geolocation-success-msg">');
    $resultRow.append($resultLabel, $msg);
    $status.append($resultRow);

    $resultLabel.text(globalThis.CHTCore.Translate.instant(TRANSLATION_KEYS.RESULT_LABEL));
    $msg.text(globalThis.CHTCore.Translate.instant(TRANSLATION_KEYS.SUCCESS));

    $(this.element).val('captured').trigger('change');
  }

  _isGeolocationAvailable() {
    return globalThis.CHTCore.Geolocation.isAvailable();
  }

  _isPermissionDenied() {
    return globalThis.CHTCore.Geolocation.isPermissionDenied();
  }
}

module.exports = HouseholdGeolocationWidget;
