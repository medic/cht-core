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

  _initEditMode() {
    const $question = $(this.question);

    $(this.element).val('kept');
    this.element.dataset.geoContext = 'home';
    // Defer the change trigger: Enketo's setEventHandlers() runs after widgets.init(),
    // so triggering immediately would fire before the model update listener is registered.
    setTimeout(() => $(this.element).trigger('change'), 0);

    let lastCapture = null;
    try {
      if (this.element.dataset.geoLastCapture) {
        lastCapture = JSON.parse(this.element.dataset.geoLastCapture);
      }
    } catch (e) { // eslint-disable-line no-unused-vars
    }

    const $badge = $('<div class="geolocation-edit-badge">');
    const $badgeText = $('<span class="geolocation-edit-badge-text">');
    $badge.append($badgeText);

    let $badgeContext = null;
    let $badgeMeta = null;
    if (lastCapture) {
      $badgeContext = $('<span class="geolocation-edit-badge-context">');
      $badgeMeta = $('<span class="geolocation-edit-badge-meta">');
      $badge.append($badgeContext, $badgeMeta);
    }

    $question.append($badge);

    const radioName = 'geo-edit-' + (this.element.getAttribute('name') || '').replace(/\W/g, '-');

    const $keptSpan = $('<span class="geolocation-context-label">');
    const $keptRadio = $('<input type="radio">').attr('name', radioName).val('kept').prop('checked', true);
    const $keptLabel = $('<label class="geolocation-context-option">').append($keptRadio, $keptSpan);

    const $captureNewSpan = $('<span class="geolocation-context-label">');
    const $captureNewRadio = $('<input type="radio">').attr('name', radioName).val('capture-new');
    const $captureNewLabel = $('<label class="geolocation-context-option">')
      .append($captureNewRadio, $captureNewSpan);

    const $editAcknowledgeCheckbox = $(
      '<input type="checkbox" class="geolocation-edit-acknowledge-checkbox ignore">'
    );
    const $editAcknowledgeSpan = $('<span class="geolocation-edit-acknowledge-text">');
    const $editAcknowledgeLabel = $('<label class="geolocation-edit-acknowledge-label">')
      .append($editAcknowledgeCheckbox, $editAcknowledgeSpan);

    const $warning = $('<div class="geolocation-edit-warning">').hide()
      .append($editAcknowledgeLabel);

    const $editOptions = $('<div class="geolocation-edit-options">')
      .append($keptLabel, $captureNewLabel, $warning);
    $question.append($editOptions);

    $editOptions.on('change', 'input[type="radio"]', event => {
      event.stopPropagation();
      this._handleEditRadioChange(event.target.value, $warning);
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
      globalThis.CHTCore.Translate.get('geolocation.edit.keep').then(text => $keptSpan.text(text)),
      globalThis.CHTCore.Translate.get('geolocation.edit.capture_new')
        .then(text => $captureNewSpan.text(text)),
      globalThis.CHTCore.Translate.get('geolocation.edit.warning').then(text => {
        $warning.prepend($('<span class="geolocation-edit-warning-text">').text(text));
      }),
      globalThis.CHTCore.Translate.get('geolocation.edit.acknowledge')
        .then(text => $editAcknowledgeSpan.text(text)),
    ]);
  }

  _handleEditRadioChange(value, $warning) {
    if (value === 'capture-new') {
      $(this.element).val('').trigger('change');
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
        const $acknowledgeLabel = $('<label class="geolocation-acknowledge-label">')
          .append($acknowledgeCheckbox, $acknowledgeSpan);

        const $skipBtn = $('<button type="button" class="btn btn-default geolocation-skip-btn">');
        $skipBtn.prop('disabled', true);

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
