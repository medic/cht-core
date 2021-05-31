{
  'use strict';
  const Widget = require('enketo-core/src/js/Widget');
  const $ = require('jquery');
  const utils = require('../widget-utils');
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
        .then(label => $widget.append(`<label>${label}</label>`));
      return;
    }

    displayActions($widget);

    $widget.on('click', '.btn.rdtoolkit-provision-test', () => provisionRDTest($widget, rdToolkitService));
  };

  function provisionRDTest($widget, rdToolkitService) {
    const dateFormat = 'LLL';
    const form = utils.getForm();
    const formTagName = form.model.rootElement.tagName;
    // Using form's instance ID as RD Test ID
    const sessionId = utils.getFieldValue(form, `${formTagName} > meta > instanceID`).replace('uuid:', '');
    const patientId = utils.getFieldValue(form, `${formTagName} > patient_id`);

    if (!sessionId || !patientId) {
      return;
    }

    const patientName = utils.getFieldValue(form, `${formTagName} > patient_name`);
    const rdtFilter = utils.getFieldValue(form, `${formTagName} > data > rdtoolkit_filter`);
    const monitorApiURL = utils.getFieldValue(form, `${formTagName} > data > rdtoolkit_api_url`);

    rdToolkitService
      .provisionRDTest(sessionId, patientId, patientName, rdtFilter, monitorApiURL)
      .then((response = {}) => {
        const sessionId = response.sessionId || '';
        const timeStarted = utils.formatDate(response.timeStarted, dateFormat);
        const timeResolved = utils.formatDate(response.timeResolved, dateFormat);
        const state = response.state || '';

        updateFields($widget, formTagName, sessionId, state, timeStarted, timeResolved);
        hideActions($widget);
        displayPreview($widget, state, timeStarted, timeResolved);
      });
  }

  function displayActions($widget) {
    window.CHTCore.Translate
      .get('rdtoolkit-provision.title')
      .toPromise()
      .then(label => {
        $widget
          .find('.or-appearance-rdtoolkit-action-btn')
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
          ${window.CHTCore.Translate.instant('rdtoolkit-provision.preview.title')}
        </div>
        <br>
        <div>
          <span class="rdt-label">
            ${window.CHTCore.Translate.instant('rdtoolkit-provision.preview.state')}
          </span>
          <span class="rdt-value">${window.CHTCore.Translate.instant(state)}</span>
        </div>
        <div>
          <span class="rdt-label">
            ${window.CHTCore.Translate.instant('rdtoolkit-provision.preview.time_started')}
          </span>
          <span class="rdt-value">${timeStarted}</span>
        </div>
        <div>
          <span class="rdt-label">
            ${window.CHTCore.Translate.instant('rdtoolkit-provision.preview.time_resolved')}
          </span>
          <span class="rdt-value">${timeResolved}</span>
        </div>
        <br>
        <div>
          <span>
            ${window.CHTCore.Translate.instant('rdtoolkit-provision.preview.next_action')}
          </span>
        </div>
      `);
  }

  function updateFields($widget, formTagName, sessionId, state, timeStarted, timeResolved) {
    utils.setFieldValue($widget, `input[name="/${formTagName}/data/rdtoolkit_session_id"]`, sessionId);
    utils.setFieldValue($widget, `input[name="/${formTagName}/data/rdtoolkit_state"]`, state);
    utils.setFieldValue($widget, `input[name="/${formTagName}/data/rdtoolkit_time_started"]`, timeStarted);
    utils.setFieldValue($widget, `input[name="/${formTagName}/data/rdtoolkit_time_resolved"]`, timeResolved);
  }

  $.fn[ pluginName ] = utils.getBindFunction(pluginName, Rdtoolkitprovisionwidget);

  module.exports = {
    'name': pluginName,
    'selector': '.or-appearance-rdtoolkit-provision',
  };
}
