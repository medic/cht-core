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

  Rdtoolkitprovisionwidget.prototype._init = function() {
    const self = this;
    const $el = $(this.element);
    const $contact = $('.or-appearance-rdtoolkit_provision_contact');

    const $translate = window.CHTCore.Translate;
    const rdToolkitService = window.CHTCore.RDToolkit;

    $el.on('click', '.btn.rdtoolkit-provision-test', function() {
      const patientId = $contact.find('select').val();

      if (!patientId) {
        return;
      }

      rdToolkitService
        .provisionRDTest(patientId)
        .then((response = {}) => {
          const sessionId = response.sessionId || '';
          const timeStarted = getDate(response.timeStarted);
          const timeResolved = getDate(response.timeResolved);
          const state = response.state || '';

          $(self.element)
            .find('input[name="/rdtoolkit_provision/rdtoolkit_provision_session_id"]')
            .val(sessionId)
            .trigger('change');
          $(self.element)
            .find('input[name="/rdtoolkit_provision/rdtoolkit_provision_state"]')
            .val(state)
            .trigger('change');
          $(self.element)
            .find('input[name="/rdtoolkit_provision/rdtoolkit_provision_time_started"]')
            .val(timeStarted)
            .trigger('change');
          $(self.element)
            .find('input[name="/rdtoolkit_provision/rdtoolkit_provision_time_resolved"]')
            .val(timeResolved)
            .trigger('change');

          $(self.element)
            .find('.rdtoolkit-actions')
            .hide();

          $(self.element)
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
        });
    });

    $translate
      .get('rdtoolkit.provision')
      .toPromise()
      .then(label => {
        $el
          .find('.or-appearance-rdtoolkit_provision_contact')
          .after('<div class="rdtoolkit-preview"></div>')
          .after(`
            <div class="rdtoolkit-actions">
              <a class="btn btn-primary rdtoolkit-provision-test">${label}</a>
            </div>
          `);
      });
  };

  function getDate(dateTime) {
    return dateTime && moment(dateTime).isValid() ? moment(dateTime).format('LLL'): '';
  }

  Rdtoolkitprovisionwidget.prototype.destroy = function(element) {};  // eslint-disable-line no-unused-vars

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
