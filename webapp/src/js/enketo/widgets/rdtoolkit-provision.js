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

  //copy the prototype functions from the Widget super class
  Rdtoolkitprovisionwidget.prototype = Object.create(Widget.prototype);

  //ensure the constructor is the new one
  Rdtoolkitprovisionwidget.prototype.constructor = Rdtoolkitprovisionwidget;

  Rdtoolkitprovisionwidget.prototype.destroy = function(element) {};  // eslint-disable-line no-unused-vars

  Rdtoolkitprovisionwidget.prototype._init = function() {
    const $widget = $(this.element);
    const rdToolkitService = window.CHTCore.RDToolkit;
    displayActions($widget);

    $widget.on('click', '.btn.rdtoolkit-provision-test', function() {
      const patientName = getFieldValue('patient_name');
      const patientId = getFieldValue('patient_id');

      if (!patientId) {
        return;
      }

      rdToolkitService
        .provisionRDTest(patientId, patientName)
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
          .find('.or-appearance-rdtoolkit_provision_contact')
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
    // ToDo: add translation support
    $widget
      .find('.rdtoolkit-preview')
      .append(`
        <div>
          <span class="rdt-label">Provision test information:</span>
        </div>
        <br>
        <div>
            <span class="rdt-label">Status: </span>
            <span class="rdt-value">${state}</span>
        </div>
        <div>
          <span class="rdt-label">Started on: </span>
          <span class="rdt-value">${timeStarted}</span>
        </div>
        <div>
          <span class="rdt-label">Results available on: </span>
          <span class="rdt-value">${timeResolved}</span>
        </div>
        <br>
        <div>
          <span class="rdt-label">Click submit to save the information.</span>
        </div>
      `);
  }

  function setFields($widget, sessionId, state, timeStarted, timeResolved) {
    // ToDo: set these values in the Enketo way by using: window.CHTCore.Enketo.getCurrentForm()
    $widget
      .find('input[name="/rdtoolkit_provision/rdtoolkit_provision_session_id"]')
      .val(sessionId)
      .trigger('change');
    $widget
      .find('input[name="/rdtoolkit_provision/rdtoolkit_provision_state"]')
      .val(state)
      .trigger('change');
    $widget
      .find('input[name="/rdtoolkit_provision/rdtoolkit_provision_time_started"]')
      .val(timeStarted)
      .trigger('change');
    $widget
      .find('input[name="/rdtoolkit_provision/rdtoolkit_provision_time_resolved"]')
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
