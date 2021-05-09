{
  'use strict';
  const Widget = require('enketo-core/src/js/Widget');
  const $ = require('jquery');
  const moment = require('moment');
  require('enketo-core/src/js/plugins');

  const pluginName = 'rdtoolkitprovisionwidget';

  /**
   * @constructor
   * @param {Element} element [description]
   * @param {(boolean|{touch: boolean, repeat: boolean})} options options
   */
  function Rdtoolkitprovisionwidget(element, options) {
    this.namespace = pluginName;
    Widget.call(this, element, options);
    this._init();
  }

  // Copy the prototype functions from the Widget super class
  Rdtoolkitprovisionwidget.prototype = Object.create(Widget.prototype);

  // Ensure the constructor is the new one
  Rdtoolkitprovisionwidget.prototype.constructor = Rdtoolkitprovisionwidget;

  Rdtoolkitprovisionwidget.prototype.destroy = function(element) {};  // eslint-disable-line no-unused-vars

  Rdtoolkitprovisionwidget.prototype._init = function() {
    const $widget = $(this.element);
    const rdToolkitService = window.CHTCore.RDToolkit;

    if (!rdToolkitService.enabled()) {
      window.CHTCore.Translate
        .get('rdtoolkit.disabled')
        .toPromise()
        .then(label => $widget.append(`<p>${label}</p>`));
      return;
    }

    displayActions($widget);

    $widget.on('click', '.btn.rdtoolkit-provision-test', () => provisionRDTest($widget, rdToolkitService));
  };

  function provisionRDTest($widget, rdToolkitService) {
    const form = getForm();
    // Using form's instance ID as RD Test ID
    const sessionId = getFieldValue(form, 'instanceID').replace('uuid:', '');
    const patientId = getFieldValue(form, 'patient_id');

    if (!sessionId || !patientId) {
      return;
    }

    const patientName = getFieldValue(form, 'patient_name');
    const rdtFilter = getFieldValue(form, 'rdtoolkit_filter');
    const monitorApiURL = getFieldValue(form, 'rdtoolkit_api_url');

    rdToolkitService
      .provisionRDTest(sessionId, patientId, patientName, rdtFilter, monitorApiURL)
      .then((response = {}) => {
        const sessionId = response.sessionId || '';
        const timeStarted = getDate(response.timeStarted);
        const timeResolved = getDate(response.timeResolved);
        const state = response.state || '';

        updateFields($widget, sessionId, state, timeStarted, timeResolved);
        hideActions($widget);
        displayPreview($widget, state, timeStarted, timeResolved);
      });
  }

  function displayActions($widget) {
    window.CHTCore.Translate
      .get('rdtoolkit.provision')
      .toPromise()
      .then(label => {
        $widget
          .find('.or-appearance-rdtoolkit_action_btn')
          .after('<div class="rdtoolkit-preview"></div>')
          .after(`
            <div class="rdtoolkit-actions">
              <a class="btn btn-primary rdtoolkit-provision-test">${label}</a>
            </div>
          `);
      });
  }

  function hideActions($widget) {
    $widget
      .find('.rdtoolkit-actions')
      .hide();
  }

  function displayPreview($widget, state, timeStarted, timeResolved) {
    $widget
      .find('.rdtoolkit-preview')
      .append(`
        <div>
          ${window.CHTCore.Translate.instant('report.rdtoolkit_provision.rdtoolkit_preview_title')}
        </div>
        <br>
        <div>
          <span class="rdt-label">
            ${window.CHTCore.Translate.instant('report.rdtoolkit_provision.rdtoolkit_preview_state')}
          </span>
          <span class="rdt-value">${window.CHTCore.Translate.instant(state)}</span>
        </div>
        <div>
          <span class="rdt-label">
            ${window.CHTCore.Translate.instant('report.rdtoolkit_provision.rdtoolkit_preview_time_started')}
          </span>
          <span class="rdt-value">${timeStarted}</span>
        </div>
        <div>
          <span class="rdt-label">
            ${window.CHTCore.Translate.instant('report.rdtoolkit_provision.rdtoolkit_preview_time_resolved')}
          </span>
          <span class="rdt-value">${timeResolved}</span>
        </div>
        <br>
        <div>
          <span>
            ${window.CHTCore.Translate.instant('report.rdtoolkit_provision.rdtoolkit_preview_next_action')}
          </span>
        </div>
      `);
  }

  function updateFields($widget, sessionId, state, timeStarted, timeResolved) {
    setFieldValue($widget, 'rdtoolkit_session_id', sessionId);
    setFieldValue($widget, 'rdtoolkit_state', state);
    setFieldValue($widget, 'rdtoolkit_time_started', timeStarted);
    setFieldValue($widget, 'rdtoolkit_time_resolved', timeResolved);
  }

  function getDate(dateTime) {
    return dateTime && moment(dateTime).isValid() ? moment(dateTime).format('LLL'): '';
  }

  function getForm() {
    return window.CHTCore.Enketo.getCurrentForm();
  }

  function getFieldValue(form, fieldName) {
    if (!form || !fieldName) {
      return;
    }

    return form.model.$
      .find(fieldName)
      .text();
  }

  function setFieldValue($widget, fieldName, value) {
    if (!fieldName || value === undefined) {
      return;
    }

    $widget
      .find(`input[name$=${fieldName}]`)
      .val(value)
      .trigger('change');
  }

  $.fn[ pluginName ] = function(options, event) {
    return this.each(function () {
      const $this = $(this);
      let data = $this.data(pluginName);

      options = options || {};

      if (!data && typeof options === 'object') {
        $this.data(pluginName, (data = new Rdtoolkitprovisionwidget(this, options, event)));

      } else if (data && typeof options === 'string') {
        data[options](this);
      }
    });
  };

  module.exports = {
    'name': pluginName,
    'selector': '.or-appearance-rdtoolkit_provision',
  };
}
