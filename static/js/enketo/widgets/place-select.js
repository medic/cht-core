if (typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function') {
  var define = function(factory) {
    factory(require, exports, module);
  };
}

define(function(require, exports, module) {

  'use strict';

  var Widget = require('enketo-core/src/js/Widget'),
      $ = require('jquery'),
      _ = require('underscore'),
      format = require('../../modules/format');

  var pluginName = 'medicPlaceSelect';

  function PlaceSelect(element, options) {
    this.namespace = pluginName;
    Widget.call(this, element, options);
    this._init();
  }

  PlaceSelect.prototype = Object.create(Widget.prototype);

  PlaceSelect.prototype.constructor = PlaceSelect;

  PlaceSelect.prototype._init = function() {

    var DB = angular.element(document.body).injector().get('DB');
    var $elem = $(this.element);
    var initialValue = $elem.val();
    var placeTypes = [ [ 'district_hospital' ], [ 'health_center' ], [ 'clinic' ] ];
    var formatResult = function(doc) {
      return doc && format.contact(doc);
    };
    DB.get()
      .query('medic/doc_by_type', { include_docs: true, keys: placeTypes })
      .then(function(results) {
        $elem.select2({
          id: function(doc) {
            return doc._id;
          },
          width: '100%',
          formatResult: formatResult,
          formatSelection: formatResult,
          data: _.pluck(results.rows, 'doc')
        });

        // Set the initial value
        $elem.select2('val', initialValue);

        // Ignore the select2 input or Enketo listens to it
        $elem.prev().find('input').addClass('ignore');
      })
      .catch(function(err) {
        console.error('Error querying patients', err);
      });
  };

  $.fn[pluginName] = function(options, event) {
    options = options || {};
    return this.each(function() {
      var $this = $(this),
          data = $this.data(pluginName);
      if (!data && typeof options === 'object') {
        data = new PlaceSelect( this, options, event );
        $this.data(pluginName, data);
      } else if (data && typeof options === 'string') {
        data[options](this);
      }
    });
  };

  module.exports = {
    name: pluginName,
    selector: 'input[data-type-xml="medicPlaceSelect"]'
  };
});
