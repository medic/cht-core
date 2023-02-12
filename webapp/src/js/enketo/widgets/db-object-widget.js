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

const construct = ( element ) => {
  const $question = $( element );

  const Select2Search = window.CHTCore.Select2Search;

  const $textInput = $question.find('input');
  const $proxyInput = $('<select></select>');

  const $option = $('<option></option>');
  const setOptionValue = value => $option.attr('value', value).text(value);
  setOptionValue($textInput.val());
  $textInput.on('inputupdate', () => setOptionValue($textInput.val()));

  $textInput.hide();
  $textInput.after($proxyInput);
  $proxyInput.attr('name', $textInput.attr('name'));

  const $selectInput = $question.find('select');
  $selectInput.append($option);
  $selectInput.on('change.dbobjectwidget', () => {
    const selected = $selectInput.select2('data');
    const id = selected && selected[0] && selected[0].id;
    $textInput.val(id);
  });

  if (!$question.hasClass('or-appearance-bind-id-only')) {
    $selectInput.on('change.dbobjectwidget', changeHandler);
  }
  const contactTypes = getContactTypes($question, $textInput);
  const allowNew = $question.hasClass('or-appearance-allow-new');
  Select2Search.init($selectInput, contactTypes, { allowNew }).then(function() {
    // select2 doesn't understand readonly
    $selectInput.prop('disabled', $textInput.prop('readonly'));
  });
};

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

const getCurrentForm = () => window.CHTCore.Enketo && window.CHTCore.Enketo.getCurrentForm();

const changeHandler = function() {
  const $this = $(this);
  const selected = $this.select2('data');
  const doc = selected && selected[0] && selected[0].doc;
  if (doc) {
    const field = $this.attr('name');
    const index = $('select[name="' + field + '"]').index(this);
    const keyRoot = field.substring(0, field.lastIndexOf('/'));
    updateFields(doc, keyRoot, index, field);
    // https://github.com/enketo/enketo-core/issues/910
    // Re-validate the current question now that we have loaded the doc data.
    // This will clear any constraint errors that were resolved by the doc data.
    const currentForm = getCurrentForm();
    if (currentForm) {
      currentForm.validateContent($this.parent());
    }
  }
};

const updateFields = function(data, keyRoot, index, originatingKeyPath) {
  const currentForm = getCurrentForm();
  const currentModel = currentForm && currentForm.model;
  if (!currentModel) {
    // form has been unloaded so there's nothing elements left to set
    return;
  }

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

    const node = currentModel.node(path, index, { onlyLeaf: true });
    if (node.getElements().length) {
      node.setVal(value);
    }
  });

};

module.exports = Dbobjectwidget;
module.exports._updateFields = updateFields; // exposed for testing
