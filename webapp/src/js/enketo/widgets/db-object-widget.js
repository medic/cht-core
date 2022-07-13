'use strict';
const _ = require('lodash/core');
const Widget = require('enketo-core/src/js/widget').default;
const $ = require('jquery');
const CONTACT_TYPE_CLASS_PREFIX = 'or-appearance-type-';

require('enketo-core/src/js/plugins');

/**
 * Allows drop-down selectors for db objects.
 *
 * @extends Widget
 */
class Dbobjectwidget extends Widget {
  static get selector() {
    return '.or-appearance-db-object,.or-appearance-select-contact';
  }

  _init() {
    construct(this.element);
  }

  list() {
    return true;
  }
}

function construct(element) {
  const $question = $( element );

  const Select2Search = window.CHTCore.Select2Search;

  let $textInput = $question.find('input');

  const value = $textInput.val();
  const disabled = $textInput.prop('readonly');
  $textInput.replaceWith($textInput[0].outerHTML.replace(/^<input /, '<select ').replace(/<\/input>/, '</select>'));
  $textInput = $question.find('select');
  const preSelectedOption = $('<option></option>')
    .attr('value', value)
    .text(value);
  $textInput.append(preSelectedOption);

  const contactTypes = getContactTypes($question, $textInput);

  if (!$question.hasClass('or-appearance-bind-id-only')) {
    $textInput.on('change.dbobjectwidget', changeHandler);
  }
  const allowNew = $question.hasClass('or-appearance-allow-new');
  Select2Search.init($textInput, contactTypes, { allowNew }).then(function() {
    // select2 doesn't understand readonly
    $textInput.prop('disabled', disabled);
  });
}

const getContactTypes = function($question, $textInput) {
  const dbObjectType = $textInput.attr('data-type-xml');
  if (dbObjectType !== 'string') {
    // deprecated db-object widget
    return [ dbObjectType ];
  }
  const types = [];
  const names = $question.attr('class').split(/\s+/);
  for (const name of names) {
    if (name.startsWith(CONTACT_TYPE_CLASS_PREFIX)) {
      types.push(name.slice(CONTACT_TYPE_CLASS_PREFIX.length));
    }
  }
  return types;
};

const changeHandler = function() {
  const $this = $(this);
  const selected = $this.select2('data');
  const doc = selected && selected[0] && selected[0].doc;
  if (doc) {
    const field = $this.attr('name');
    const index = $('[name="' + field + '"]').index(this);
    const keyRoot = field.substring(0, field.lastIndexOf('/'));
    updateFields(doc, keyRoot, index, field);
    // https://github.com/enketo/enketo-core/issues/910
    // Re-validate the current question now that we have loaded the doc data.
    // This will clear any constraint errors that were resolved by the doc data.
    window.CHTCore.Enketo.getCurrentForm().validateContent($this.parent());
  }
};

const updateFields = function(data, keyRoot, index, originatingKeyPath) {
  const Enketo = window.CHTCore.Enketo;

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

    const node = Enketo.getCurrentForm().model.node(path, index, { onlyLeaf: true });

    if(node.getElements().length) {
      node.setVal(value);
    }
  });
};

module.exports = Dbobjectwidget;
