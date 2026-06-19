/* global globalThis */
'use strict';
const Widget = require('enketo-core/src/js/widget').default;
const $ = require('jquery');
require('enketo-core/src/js/plugins');

const MS_PER_DAY = 86400000;

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

    if (this.element.dataset.geoHasLocation === 'true') {
      return this._initEditMode();
    }

    const radioName = 'geo-ctx-' + (this.element.getAttribute('name') || '').replace(/\W/g, '-');
    const { $contextOptions, $homeSpan, $otherSpan } = this._buildContextOptions(radioName);
    const $button = this._buildCaptureButton();
    $question.append($contextOptions, $button);

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

  _buildCaptureButton() {
    const $button = $('<button type="button" class="btn btn-default geolocation-capture-btn">');
    $('<i class="fa fa-map-marker" aria-hidden="true">').appendTo($button);
    $button.prop('disabled', true);
    $button.on('click', () => this._startCapture());
    return $button;
  }

  _initEditMode() {
    const $question = $(this.question);

    $(this.element).val('kept');
    this.element.dataset.geoContext = 'home';
    // Defer the change trigger: Enketo's setEventHandlers() runs after widgets.init(),
    // so triggering immediately would fire before the model update listener is registered.
    setTimeout(() => $(this.element).trigger('change'), 0);

    const lastCapture = this._parseLastCapture();
    const { $badge, $badgeText, $badgeContext, $badgeMeta } = this._buildEditBadge(lastCapture);

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

    return Promise.all([
      globalThis.CHTCore.Translate.get('geolocation.edit.badge').then(text => $badgeText.text(text)),
      ...(lastCapture ? [
        this._translateBadgeContext(lastCapture, $badgeContext),
        this._translateBadgeMeta(lastCapture, $badgeMeta),
      ] : []),
      globalThis.CHTCore.Translate.get('geolocation.edit.prompt').then(text => $prompt.text(text)),
      globalThis.CHTCore.Translate.get('geolocation.edit.keep').then(text => $keptSpan.text(text)),
      globalThis.CHTCore.Translate.get('geolocation.edit.capture_new')
        .then(text => $captureNewSpan.text(text)),
      globalThis.CHTCore.Translate.get('geolocation.edit.warning.title')
        .then(text => $warningTitleText.text(text)),
      globalThis.CHTCore.Translate.get('geolocation.edit.warning').then(text => $warningText.text(text)),
      globalThis.CHTCore.Translate.get('geolocation.edit.acknowledge')
        .then(text => $editAcknowledgeSpan.text(text)),
    ]);
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
    const $badgeHeader = $('<span class="geolocation-edit-badge-header">').append($badgeIcon, $badgeText);
    $badge.append($badgeHeader);

    let $badgeContext = null;
    let $badgeMeta = null;
    if (lastCapture) {
      $badgeContext = $('<span class="geolocation-edit-badge-context">');
      $badgeMeta = $('<span class="geolocation-edit-badge-meta">');
      $badge.append($badgeContext, $badgeMeta);
    }

    return { $badge, $badgeText, $badgeContext, $badgeMeta };
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
      $(this.element).val('');
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
    const key = lastCapture.isHome ? 'geolocation.edit.context.home' : 'geolocation.edit.context.other';
    return globalThis.CHTCore.Translate.get(key).then(text => $badgeContext.text(text));
  }

  _translateBadgeMeta(lastCapture, $badgeMeta) {
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    if (lastCapture.timestamp >= todayMidnight.getTime()) {
      return globalThis.CHTCore.Translate.get('geolocation.edit.last_updated_today')
        .then(text => $badgeMeta.text(text));
    }
    const days = Math.floor((Date.now() - lastCapture.timestamp) / MS_PER_DAY);
    const key = days === 1 ? 'geolocation.edit.last_updated_day' : 'geolocation.edit.last_updated_days';
    return globalThis.CHTCore.Translate.get(key)
      .then(text => $badgeMeta.text(text.replace('{{days}}', days)));
  }

  _revertToEditChoice() {
    globalThis.CHTCore.Geolocation.retry();
    const $question = $(this.question);
    $question.find('.geolocation-edit-options').show();
    const $keptRadio = $question.find('input[type="radio"][value="kept"]');
    $keptRadio.prop('checked', true).trigger('change');
  }

  _startCapture() {
    const isEditMode = this.element.dataset.geoHasLocation === 'true';
    const $question = $(this.question);

    if (isEditMode) {
      $question.find('.geolocation-edit-options').hide();
    } else {
      $question.find('.geolocation-context-options').hide();
    }

    $question.find([
      '.geolocation-capture-btn',
      '.geolocation-status',
      '.geolocation-retry-btn',
      '.geolocation-skip-btn',
    ].join(',')).remove();

    const { $status, $progressLabel, $bar } = this._buildProgressRow();
    $question.append($status);

    globalThis.CHTCore.Translate.get('geolocation.progress')
      .then(text => $progressLabel.text(text));

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

    const isWeakSignal = errorCode === 2 || errorCode === 3;
    if (isWeakSignal) {
      const $weakSignalMsg = $('<p class="geolocation-weak-signal-msg">');
      $status.append($weakSignalMsg);
      globalThis.CHTCore.Translate.get('geolocation.signal.weak').then(text => $weakSignalMsg.text(text));
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
        $status.remove();
        this._revertToEditChoice();
      });
    } else {
      $skipBtn.on('click', () => {
        $retryBtn.remove();
        $acknowledgeLabel.remove();
        $skipBtn.remove();
        const $skippedMsg = $('<p class="geolocation-skipped-msg">');
        $status.append($skippedMsg);
        globalThis.CHTCore.Translate.get('geolocation.skipped').then(text => $skippedMsg.text(text));
        $(this.element).val('skipped').trigger('change');
      });
    }

    $status.append($retryBtn, $acknowledgeLabel, $skipBtn);

    globalThis.CHTCore.Translate.get('geolocation.result.label').then(text => $resultLabel.text(text));
    globalThis.CHTCore.Translate.get('geolocation.failure').then(text => $resultText.text(text));
    globalThis.CHTCore.Translate.get('geolocation.retry')
      .then(text => $retryBtn.append($('<span class="geolocation-btn-label">').text(text)));
    globalThis.CHTCore.Translate.get('geolocation.skip.button').then(text => $skipBtn.text(text));
    globalThis.CHTCore.Translate.get('geolocation.skip.acknowledge').then(text => $acknowledgeSpan.text(text));
  }

  _buildCaptureSuccessUI($status, $bar) {
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
