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
    displayActions($widget);

    $widget.on('click', '.btn.rdtoolkit-provision-test', function() {
      const sessionId = getFieldValue('instanceID'); // Using form's instance ID as RD Test ID
      const patientName = getFieldValue('patient_name');
      const patientId = getFieldValue('patient_id');

      if (!sessionId || !patientId) {
        return;
      }

      rdToolkitService
        .provisionRDTest(sessionId, patientId, patientName)
        .then((response = {}) => {
          const sessionId = response.sessionId || '';
          const timeStarted = getDate(response.timeStarted);
          const timeResolved = getDate(response.timeResolved);
          const state = response.state || '';

          setFields($widget, sessionId, state, timeStarted, timeResolved);
          hideActions($widget);
          displayPreview($widget, state, timeStarted, timeResolved);
        });
    });
  };

  function displayActions($widget) {
    window.CHTCore.Translate
      .get('rdtoolkit.provision')
      .toPromise()
      .then(label => {
        $widget
          .find('.or-appearance-rdtoolkit_contact')
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
            ${window.CHTCore.Translate.instant('report.rdtoolkit_provision.rdtoolkit_preview_status')}
          </span>
          <span class="rdt-value">${window.CHTCore.Translate.instant(state) || state}</span>
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

  function setFields($widget, sessionId, state, timeStarted, timeResolved) {
    // ToDo: set these values in the Enketo way by using: window.CHTCore.Enketo.getCurrentForm()
    $widget
      .find('input[name="/rdtoolkit_provision/rdtoolkit_session_id"]')
      .val(sessionId)
      .trigger('change');
    $widget
      .find('input[name="/rdtoolkit_provision/rdtoolkit_state"]')
      .val(state)
      .trigger('change');
    $widget
      .find('input[name="/rdtoolkit_provision/rdtoolkit_time_started"]')
      .val(timeStarted)
      .trigger('change');
    $widget
      .find('input[name="/rdtoolkit_provision/rdtoolkit_time_resolved"]')
      .val(timeResolved)
      .trigger('change');
  }

  function getDate(dateTime) {
    return dateTime && moment(dateTime).isValid() ? moment(dateTime).format('LLL'): '';
  }

  function getFieldValue(fieldName) {
    const form = window.CHTCore.Enketo.getCurrentForm();

    if (!form) {
      return;
    }

    return form.model.$.find(fieldName).text();
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
