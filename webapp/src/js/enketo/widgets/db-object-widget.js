if ( typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function' ) {
  var define = function( factory ) { // eslint-disable-line
    factory( require, exports, module );
  };
}

define( function( require, exports, module ) {
  'use strict';
  const _ = require('lodash/core');
  const Widget = require('enketo-core/src/js/Widget');
  const $ = require('jquery');

  require('enketo-core/src/js/plugins');

  const pluginName = 'dbobjectwidget';

  /**
     * Allows drop-down selectors for db objects.
     *
     * @constructor
     * @param {Element} element [description]
     * @param {(boolean|{touch: boolean, repeat: boolean})} options options
     * @param {*=} e     event
     */

  function Dbobjectwidget( element, options ) {
    this.namespace = pluginName;
    Widget.call( this, element, options );
    this._init();
  }

  //copy the prototype functions from the Widget super class
  Dbobjectwidget.prototype = Object.create( Widget.prototype );

  //ensure the constructor is the new one
  Dbobjectwidget.prototype.constructor = Dbobjectwidget;

  Dbobjectwidget.prototype._init = function() {
    construct( this.element );
  };

  function service(serviceName) {
    return angular.element(document.body).injector().get(serviceName);
  }

  function construct( element ) {
    // timeout needed to let setting the value complete before rendering
    setTimeout(function() {
      const $question = $( element );

      const Select2Search = service('Select2Search');

      let $textInput = $question.find('input');

      const value = $textInput.val();
      const disabled = $textInput.prop('readonly');
      $textInput.replaceWith($textInput[0].outerHTML.replace(/^<input /, '<select ').replace(/<\/input>/, '</select>'));
      $textInput = $question.find('select');
      const preSelectedOption = $('<option></option>')
        .attr('value', value)
        .text(value);
      $textInput.append(preSelectedOption);

      const dbObjectType = $textInput.attr('data-type-xml');

      if (!$question.hasClass('or-appearance-bind-id-only')) {
        $textInput.on('change.dbobjectwidget', changeHandler);
      }
      Select2Search($textInput, dbObjectType, {
        allowNew: $question.hasClass('or-appearance-allow-new')
      }).then(function() {
        // select2 doesn't understand readonly
        $textInput.prop('disabled', disabled);
      });
    });
  }

  const changeHandler = function() {
    const $this = $(this);
    const selected = $this.select2('data');
    const doc = selected && selected[0] && selected[0].doc;
    if (doc) {
      const field = $this.attr('name');
      const index = $('[name="' + field + '"]').index(this);
      const keyRoot = field.substring(0, field.lastIndexOf('/'));
      updateFields(doc, keyRoot, index, field);
    }
  };

  const updateFields = function(data, keyRoot, index, originatingKeyPath) {
    const Enketo = service('Enketo');

    Object.keys(data).forEach(function(key) {
      const path = keyRoot + '/' + key;
      if (path === originatingKeyPath) {
        // don't update the field that fired the update
        return;
      }
      const value = data[key];
      if (_.isArray(value)) {
        // arrays aren't currently handled
        return;
      }
      if (_.isObject(value)) {
        // recursively set fields for children
        return updateFields(value, path, index, originatingKeyPath);
      }

      const node = Enketo.getCurrentForm().model.node(path, index);

      // Non-existant nodes still return a value, it's just an empty array
      // Real nodes have a value, or at minimum [""]
      if (node.getVal().length) {
        node.setVal(value);
      }
    });
  };

  /**
     * This function, implemented on all enketo widgets, is only called when
     * cloning repeated sections of a form.  It's actually called on the cloned
     * copy of a question, and for some reason for this widget needs to destroy
     * and then re-create the select2.
     * @see https://github.com/medic/medic/issues/3487
     */
  Dbobjectwidget.prototype.destroy = function( element ) {
    deconstruct( element );
    construct( element );
  };

  /** Reverse the select2 setup steps performed in construct() */
  function deconstruct( element ) {
    const $question = $( element );

    $question.find( '.select2-container' ).remove();

    const $selectInput = $question.find( 'select' );

    // At this stage in construct(), the select2 jquery plugin is
    // initialised.  To reverse this, we would call:
    //     $selectInput.data( 'select2' ).destroy();
    // However, calling this here would destroy the select2 for the original
    // widget, so -do not do it-.

    $selectInput.off( 'change.dbobjectwidget' );

    $selectInput.find( 'option' ).remove();

    const replacementHtml = $selectInput[0].outerHTML
      .replace( /^<select /, '<input ' )
      .replace( /<\/select>/, '</input>' );
    $selectInput.replaceWith( replacementHtml );
  }

  $.fn[ pluginName ] = function( options, event ) {
    return this.each( function() {
      const $this = $( this );
      let data = $this.data( pluginName );

      options = options || {};

      if ( !data && typeof options === 'object' ) {
        $this.data( pluginName, ( data = new Dbobjectwidget( this, options, event ) ) );
      } else if ( data && typeof options === 'string' ) {
        data[ options ]( this );
      }
    } );
  };

  module.exports = {
    'name': pluginName,
    'selector': '.or-appearance-db-object',
  };
} );
