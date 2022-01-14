'use strict';
const _isPlainObject = require('lodash/isPlainObject');
const Widget = require('enketo-core/src/js/Widget');
const $ = require('jquery');
require('enketo-core/src/js/plugins');

const PLUGIN_NAME = 'androidapplauncherwidget';
const APPEARANCES = {
  widget: '.or-appearance-android-app-launcher',
  outputs: '.or-appearance-android-app-outputs',
  inputs: '.or-appearance-android-app-inputs',
  object: '.or-appearance-android-app-object',
  valueList: '.or-appearance-android-app-value-list',
  objectList: '.or-appearance-android-app-object-list',
};

/**
 * Android App Launcher widget
 * @constructor
 * @param element {Element} The DOM element the widget is applied on.
 * @param options {(Boolean|{touch: Boolean, repeat: Boolean})} Options passed to the widget during instantiation.
 * @param e {*=} Event
 */
function Androidapplauncherwidget(element, options) {
  this.namespace = PLUGIN_NAME;
  Widget.call(this, element, options);
  this._init();
}

// Copy the prototype functions from the Widget super class
Androidapplauncherwidget.prototype = Object.create(Widget.prototype);

// Ensure the constructor is the new one
Androidapplauncherwidget.prototype.constructor = Androidapplauncherwidget;

Androidapplauncherwidget.prototype.destroy = function(element) { };  // eslint-disable-line no-unused-vars

Androidapplauncherwidget.prototype._init = function() {
  const $widget = $(this.element);

  if (!window.CHTCore.AndroidAppLauncher.isEnabled()) {
    window.CHTCore.Translate
      .get('android_app_launcher.message.disable')
      .then(label => $widget.append(`<label>${label}</label>`));
    return;
  }

  displayActions($widget);
};

function displayActions($widget) {
  window.CHTCore.Translate
    .get('android_app_launcher.button.launch')
    .then(label => {
      $widget.append(`
        <div class="android-app-launcher-actions">
          <a class="btn btn-primary launch-app">${label}</a>
        </div>
      `);

      $widget.on('click', '.btn.launch-app', () => launchApp($widget));
    });
}

function launchApp($widget) {
  const androidApp = getAndroidAppConfig($widget);

  window.CHTCore.AndroidAppLauncher
    .launchAndroidApp(androidApp)
    .then(response => {
      const $outputs = $widget.find(APPEARANCES.outputs);

      if (!$outputs.length) {
        return;
      }

      processOutputData($outputs[0], response);
    })
    // eslint-disable-next-line no-console
    .catch(error => console.error('Android App Launcher widget :: An error occurred: ', error));
}

function getAndroidAppConfig($widget) {
  const config = mapToObject($widget);
  const $inputs = $widget.find(APPEARANCES.inputs);

  if (!$inputs.length) {
    return config;
  }

  config.extras = mapToObject($inputs[0]);
  return config;
}

/**
 * Map group's fields to an object.
 * @param group {Element} HTML element representing a XForm group.
 * @returns {Object|undefined}
 */
function mapToObject(group) {
  if (!group) {
    return;
  }

  return Object.assign(
    {},
    mapObjectProperties(group),
    processRepeatGroup(group, APPEARANCES.valueList, null, addValueToList),
    processRepeatGroup(group, APPEARANCES.objectList, null, addObjectToList),
    mapSubLevelObject(group)
  );
}

/**
 * Map input fields from XForm's group to an Object.
 * @param group {Element} HTML element representing a XForm group.
 * @returns {Object|undefined}
 */
function mapObjectProperties(group) {
  const $fields = getFieldsInGroup(group);

  if (!$fields.length) {
    return;
  }

  const map = {};
  $fields.each((index, input) => map[getElementName(input)] = $(input).val());
  return map;
}

function mapSubLevelObject(group) {
  const subLevels = $(group).children(APPEARANCES.object);

  if (!subLevels.length) {
    return;
  }

  const map = {};
  subLevels.each((index, level) => map[getElementName(level)] = mapToObject(level));
  return map;
}

function addValueToList(itemGroupIndex, itemGroup, dataProperty, dataValueList) {
  const $fields = getFieldsInGroup(itemGroup);

  if (!isValueListValid($fields)) {
    return;
  }

  const val = $($fields[0]).val();

  if (!val) {
    return;
  }

  dataValueList.push(val);
}

function addObjectToList(itemGroupIndex, itemGroup, dataProperty, dataValueList) {
  const obj = mapToObject(itemGroup);

  if (!obj) {
    return;
  }

  dataValueList.push(obj);
}

/**
 * Process the android app data object or sub-object.
 * @param group {Element} HTML element representing a XForm group.
 * @param data {Object} Android app data object or sub-object.
 */
function processOutputData(group, data) {
  if (!group || !_isPlainObject(data) || !Object.keys(data).length) {
    return;
  }

  setOutputFields(group, data);
  processRepeatGroup(group, APPEARANCES.valueList, data, assignDataValueToRepeatGroup);
  processRepeatGroup(group, APPEARANCES.objectList, data, assignDataObjectToRepeatGroup);
  processOutputSubLevels(group, data);
}

function setOutputFields(group, data) {
  const $fields = getFieldsInGroup(group);

  $fields.each((index, input) => {
    const inputName = getElementName(input);
    assignValueToInput(input, inputName, data[inputName]);
  });
}

function assignDataValueToRepeatGroup(itemGroupIndex, itemGroup, dataProperty, dataValueList) {
  if (dataValueList.length < itemGroupIndex) {
    return;
  }

  const $fields = getFieldsInGroup(itemGroup);

  if (isValueListValid($fields)) {
    assignValueToInput($($fields[0]), dataProperty, dataValueList[itemGroupIndex]);
  }
}

function assignDataObjectToRepeatGroup(itemGroupIndex, itemGroup, dataProperty, dataValueList) {
  if (dataValueList.length < itemGroupIndex) {
    return;
  }
  processOutputData(itemGroup, dataValueList[itemGroupIndex]);
}

function processOutputSubLevels(group, data) {
  $(group)
    .children(APPEARANCES.object)
    .each((index, objectGroup) => {
      const prop = getElementName(objectGroup);
      processOutputData(objectGroup, data[prop]);
    });
}

/**
 * Finds 'repeat' groups and execute a function to process each element.
 * An Array of data (strings, number, objects) is represented in the XForm as 'repeat' group
 * with fixed size (repeat_count=n). Every repeat iteration element has a 'name' attribute
 * that corresponds to the data's property containing the array.
 *
 * @param group {Element} HTML element representing a XForm group, that contains the 'repeat' group.
 * @param selector {String} Selector to find the 'repeat' group.
 * @param data {Object} Data or piece of data from Android app.
 * @param processItem {Function} Function that will process every element.
 * @returns {Object}
 */
function processRepeatGroup(group, selector, data, processItem) {
  // XForm's repeat is automatically wrapped in a <section> element.
  const repeatGroups = $(group)
    .children('section')
    .children(selector);

  if (!repeatGroups.length) {
    return;
  }

  const prop = getElementName(repeatGroups[0]);
  const valueArray = data && data[prop] ? data[prop] : [];
  repeatGroups.each((index, item) => processItem(index, item, prop, valueArray));

  return { [prop]: valueArray };
}

function assignValueToInput(input, inputName, value) {
  if (!input || value === undefined || value === null) {
    return;
  }

  if (_isPlainObject(value)) {
    // eslint-disable-next-line no-console
    console.debug(`Android App Launcher Widget :: Cannot set value to "${inputName}" field, value is an object.`);
    return;
  }

  if (Array.isArray(value)) {
    // eslint-disable-next-line no-console
    console.debug(`Android App Launcher Widget :: Cannot set value to "${inputName}" field, value is an array.`);
    return;
  }

  $(input)
    .val(value)
    .trigger('change');
}

function getFieldsInGroup(group) {
  return $(group)
    .children('.question')
    .children('input');
}

function getElementName(element) {
  if (!element) {
    return;
  }

  return ($(element).attr('name') || '')
    .split('/')
    .pop();
}

function isValueListValid($fields) {
  if (!$fields.length) {
    // eslint-disable-next-line no-console
    console.debug('Android App Launcher Widget :: "android-app-value-list" missing field.');
    return false;
  }

  if ($fields.length > 1) {
    // eslint-disable-next-line no-console
    console.debug('Android App Launcher Widget :: "android-app-value-list" can only have one field.');
    return false;
  }

  return true;
}

$.fn[PLUGIN_NAME] = function (options, event) {
  return this.each(function () {
    const $this = $(this);
    let data = $this.data(PLUGIN_NAME);

    options = options || {};

    if (!data && typeof options === 'object') {
      $this.data(PLUGIN_NAME, (data = new Androidapplauncherwidget(this, options, event)));
    } else if (data && typeof options === 'string') {
      data[options](this);
    }
  });
};

module.exports = {
  'name': PLUGIN_NAME,
  'selector': APPEARANCES.widget,
  'widget': Androidapplauncherwidget
};
