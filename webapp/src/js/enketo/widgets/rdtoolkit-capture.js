{
  'use strict';
  const Widget = require('enketo-core/src/js/Widget');
  const $ = require( 'jquery' );
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

  //copy the prototype functions from the Widget super class
  Rdtoolkitcapturewidget.prototype = Object.create(Widget.prototype);

  //ensure the constructor is the new one
  Rdtoolkitcapturewidget.prototype.constructor = Rdtoolkitcapturewidget;

  Rdtoolkitcapturewidget.prototype.destroy = function(element) {};  // eslint-disable-line no-unused-vars

  Rdtoolkitcapturewidget.prototype._init = function() {
    const $widget = $(this.element);
    const rdToolkitService = window.CHTCore.RDToolkit;
    displayActions($widget);

    $widget.on('click', '.btn.rdtoolkit-capture-test', function() {
      const sessionId = getFieldValue('rdtoolkit_capture_session_id');
      rdToolkitService
        .captureRDTest(sessionId)
        .then((response = {}) => {
          const sessionId = response.sessionId || '';
          const timeRead = getDate(response.timeRead);
          const results = response.results || '';

          setFields($widget, sessionId, results, timeRead);
          hideActions($widget);
          displayPreview($widget, results, timeRead);
        });
    });
  };

  function displayActions($widget) {
    window.CHTCore.Translate
      .get('rdtoolkit.capture')
      .toPromise()
      .then(label => {
        $widget
          .find('.or-appearance-patient_id')
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

  function displayPreview($widget, results, timeRead) {
    // ToDo: add translation support
    $widget
      .find('.rdtoolkit-preview')
      .append(`
        <div>
          <span class="rdt-label">Test result information:</span>
        </div>
        <br>
        <div>
            <span class="rdt-label">Results: </span>
            <span class="rdt-value">${results}</span>
        </div>
        <div>
          <span class="rdt-label">Taken on: </span>
          <span class="rdt-value">${timeRead}</span>
        </div>
        <br>
        <div>
          <span class="rdt-label">Click submit to save the information.</span>
        </div>
      `);
  }

  function setFields($widget, sessionId, results, timeRead) {
    // ToDo: set these values in the Enketo way by using: window.CHTCore.Enketo.getCurrentForm()
    $widget
      .find('input[name="/rdtoolkit_capture/rdtoolkit_capture_session_id"]')
      .val(sessionId)
      .trigger('change');
    $widget
      .find('input[name="/rdtoolkit_capture/rdtoolkit_capture_results"]')
      .val(results)
      .trigger('change');
    $widget
      .find('input[name="/rdtoolkit_capture/rdtoolkit_capture_time_read"]')
      .val(timeRead)
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
