'use strict';
const _ = require('lodash/core');
const Widget = require( 'enketo-core/src/js/widget' ).default;
const $ = require('jquery');

require('enketo-core/src/js/plugins');

const pluginName = 'dbobjectwidget';
const mainSelector = '.or-appearance-db-object';

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
  Object.assign( this, new Widget( element, options ) );
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

  const $question = $( element ).parent( mainSelector );
  let $textInput = $question.find('input');

  const disabled = $textInput.prop('readonly');
  const relevant = $textInput.attr('data-relevant');
  const name = $textInput.attr('name');

  if ( relevant ) {
    $textInput.removeAttr('data-relevant disabled');
    $question.attr('data-relevant', relevant);
    $question.attr('disabled', disabled);
    $question.attr('name', name);
  }

  // timeout needed to let setting the value complete before rendering
  setTimeout(function() {

    const value = $textInput.val();
    $textInput.replaceWith($textInput[0].outerHTML
      .replace(/^<input /, '<select ')
      .replace(/<\/input>/, '</select>'));
    $textInput = $question.find('select');
    const preSelectedOption = $('<option></option>')
      .attr('value', value)
      .text(value);
    $textInput.append(preSelectedOption);

    const dbObjectType = $textInput.attr('data-type-xml');

    if (!$question.hasClass('or-appearance-bind-id-only')) {
      $textInput.on('change.dbobjectwidget', changeHandler);
    }

    const Select2Search = service('Select2Search');
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

    // Non-existant nodes are undefined
    if (typeof node.getVal() !== 'undefined') {
      node.setVal(value);
    }
  });
};

Dbobjectwidget.prototype.destroy = function( element ) {
  deconstruct( element );
  construct( element );
};

/** Reverse the select2 setup steps performed in construct() */
function deconstruct( element ) {
  const $question = $( element ).parent( mainSelector );

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

Dbobjectwidget.selector = `${mainSelector} input[type=text]`;
Dbobjectwidget.condition = Widget.condition;
Dbobjectwidget.list = function() { return true; };

module.exports = Dbobjectwidget;
