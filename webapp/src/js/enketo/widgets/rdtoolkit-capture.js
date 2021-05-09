{
  'use strict';
  const Widget = require('enketo-core/src/js/Widget');
  const $ = require('jquery');
  const moment = require('moment');
  require('enketo-core/src/js/plugins');

  const pluginName = 'rdtoolkitcapturewidget';

  /**
   * @constructor
   * @param {Element} element [description]
   * @param {(boolean|{touch: boolean, repeat: boolean})} options options
   */
  function Rdtoolkitcapturewidget(element, options) {
    this.namespace = pluginName;
    Widget.call(this, element, options);
    this._init();
  }

  // Copy the prototype functions from the Widget super class
  Rdtoolkitcapturewidget.prototype = Object.create(Widget.prototype);

  // Ensure the constructor is the new one
  Rdtoolkitcapturewidget.prototype.constructor = Rdtoolkitcapturewidget;

  Rdtoolkitcapturewidget.prototype.destroy = function(element) {};  // eslint-disable-line no-unused-vars

  Rdtoolkitcapturewidget.prototype._init = function() {
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

    $widget.on('click', '.btn.rdtoolkit-capture-test', () => captureRDTestResult($widget, rdToolkitService));
  };

  function captureRDTestResult($widget, rdToolkitService) {
    const form = getForm();
    const sessionId = getFieldValue(form, 'rdtoolkit_session_id');

    rdToolkitService
      .captureRDTest(sessionId)
      .then((response = {}) => {
        const capturedTest = {
          sessionId: response.sessionId || '',
          state: response.state || '',
          timeStarted: getDate(response.timeStarted),
          timeResolved: getDate(response.timeResolved),
          timeRead: getDate(response.timeRead),
          results: response.results || [],
          resultsDescription: getFormattedResult(response.results),
          image: response.croppedImage
        };

        updateFields($widget, capturedTest);
        hideActions($widget);
        displayPreview($widget, capturedTest);
      });
  }

  function displayActions($widget) {
    window.CHTCore.Translate
      .get('rdtoolkit.capture')
      .toPromise()
      .then(label => {
        $widget
          .find('.or-appearance-rdtoolkit_action_btn')
          .after('<div class="rdtoolkit-preview"></div>')
          .after(`
            <div class="rdtoolkit-actions">
              <a class="btn btn-primary rdtoolkit-capture-test">${label}</a>
            </div>
          `);
      });
  }

  function hideActions($widget) {
    $widget
      .find('.rdtoolkit-actions')
      .hide();
  }

  function displayPreview($widget, capturedTest) {
    $widget
      .find('.rdtoolkit-preview')
      .append(`
        <div>
          ${window.CHTCore.Translate.instant('report.rdtoolkit_capture.rdtoolkit_preview_title')}
        </div>
        <br>
        <div>
          <span class="rdt-label">
            ${window.CHTCore.Translate.instant('report.rdtoolkit_capture.rdtoolkit_preview_results')} 
          </span>
          <span class="rdt-value">${capturedTest.resultsDescription}</span>
        </div>
        <div>
          <span class="rdt-label">
            ${window.CHTCore.Translate.instant('report.rdtoolkit_capture.rdtoolkit_preview_time_read')} 
          </span>
          <span class="rdt-value">${capturedTest.timeRead}</span>
        </div>
        <div>
          <span class="rdt-label">
            ${window.CHTCore.Translate.instant('report.rdtoolkit_capture.rdtoolkit_preview_image')} 
          </span>
          <img src="data:image/png;base64,${capturedTest.image}">
        </div>
        <br>
        <div>
           ${window.CHTCore.Translate.instant('report.rdtoolkit_capture.rdtoolkit_preview_next_action')} 
        </div>
      `);
  }

  function updateFields($widget, capturedTest) {
    setFieldValue($widget, 'rdtoolkit_session_id', capturedTest.sessionId);
    setFieldValue($widget, 'rdtoolkit_results', JSON.stringify(capturedTest.results));
    setFieldValue($widget, 'rdtoolkit_results_description', capturedTest.resultsDescription);
    setFieldValue($widget, 'rdtoolkit_time_read', capturedTest.timeRead);
    setFieldValue($widget, 'rdtoolkit_state', capturedTest.state);
    setFieldValue($widget, 'rdtoolkit_time_started', capturedTest.timeStarted);
    setFieldValue($widget, 'rdtoolkit_time_resolved', capturedTest.timeResolved);
    setFieldValue($widget, 'rdtoolkit_image', capturedTest.image);
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

  function getFormattedResult(results) {
    if (!results) {
      return '';
    }

    let description = '';

    results.forEach(item => {
      const test = window.CHTCore.Translate.instant(item.test);
      const result = window.CHTCore.Translate.instant(item.result);

      description += `${description ? ', ' : ''}${test || item.test}: ${result || item.result}`;
    });

    return description;
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

  $.fn[pluginName] = function(options, event) {
    return this.each(function() {
      const $this = $(this);
      let data = $this.data(pluginName);

      options = options || {};

      if (!data && typeof options === 'object') {
        $this.data(pluginName, (data = new Rdtoolkitcapturewidget(this, options, event)));

      } else if (data && typeof options === 'string') {
        data[options](this);
      }
    });
  };

  module.exports = {
    'name': pluginName,
    'selector': '.or-appearance-rdtoolkit_capture',
  };

}
