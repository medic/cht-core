{
  'use strict';
  const _isPlainObject = require('lodash/isPlainObject');
  const Widget = require('enketo-core/src/js/Widget');
  const $ = require('jquery');
  require('enketo-core/src/js/plugins');

  const PLUGIN_NAME = 'externalapplauncherwidget';
  const APPEARANCES = {
    widget: '.or-appearance-external-app-launcher',
    outputs: '.or-appearance-external-app-outputs',
    inputs: '.or-appearance-external-app-inputs',
    object: '.or-appearance-external-app-object',
    valueList: '.or-appearance-external-app-value-list',
    objectList: '.or-appearance-external-app-object-list',
    image: '.or-appearance-external-app-image'
  };

  /**
   * External App Launcher widget
   * @constructor
   * @param element {Element} The DOM element the widget is applied on.
   * @param options {(Boolean|{touch: Boolean, repeat: Boolean})} Options passed to the widget during instantiation.
   * @param e {*=} Event
   */
  function Externalapplauncherwidget(element, options) {
    this.namespace = PLUGIN_NAME;
    Widget.call(this, element, options);
    this._init();
  }

  // Copy the prototype functions from the Widget super class
  Externalapplauncherwidget.prototype = Object.create(Widget.prototype);

  // Ensure the constructor is the new one
  Externalapplauncherwidget.prototype.constructor = Externalapplauncherwidget;

  Externalapplauncherwidget.prototype.destroy = function(element) { };  // eslint-disable-line no-unused-vars

  Externalapplauncherwidget.prototype._init = function() {
    const $widget = $(this.element);

    if (!window.CHTCore.ExternalAppLauncher.isEnabled()) {
      window.CHTCore.Translate
        .get('external-app-launcher.message.disable')
        .then(label => $widget.append(`<label>${label}</label>`));
      return;
    }

    displayActions($widget);
  };

  function displayActions($widget) {
    window.CHTCore.Translate
      .get('external-app-launcher.button.launch')
      .then(label => {
        $widget.append(`
          <div class="external-app-launcher-actions">
            <a class="btn btn-primary launch-app">${label}</a>
          </div>
        `);

        $widget.on('click', '.btn.launch-app', () => launchApp($widget));
      });
  }

  function launchApp($widget) {
    const externalApp = getExternalAppConfig($widget);

    window.CHTCore.ExternalAppLauncher
      .launchExternalApp(externalApp)
      .then(response => {
        const $outputs = $widget.find(APPEARANCES.outputs);

        if (!$outputs.length) {
          return;
        }

        processOutputData($outputs[0], response);
      });
  }

  function getExternalAppConfig($widget) {
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
      mapToValueList(group),
      mapToObjectList(group),
      mapSubLevelObject(group)
    );
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

  /**
   * Map XForm's 'repeat' group to an array of strings.
   * This array is represented in the XForm as 'repeat' group with fixed size (repeat_count=n)
   * Every repeat iteration element has:
   *    - The name attribute that corresponds to the object's property containing the array.
   *    - 1 field that is pushed the array of strings.
   * @param group {Element} HTML element representing a XForm group, that contains the 'repeat' group.
   * @returns {Object|undefined}
   */
  function mapToValueList(group) {
    // XForm's repeat is automatically wrapped in a <section> element.
    const repeatGroups = $(group)
      .children('section')
      .children(APPEARANCES.valueList);

    if (!repeatGroups.length) {
      return;
    }

    const prop = getElementName(repeatGroups[0]);
    const valueList = [];

    repeatGroups.each((index, repeatGroup) => {
      const $fields = getFieldsInGroup(repeatGroup);
      if (!isValueListValid($fields)) {
        return;
      }

      const val = $($fields[0]).val();
      if (!val) {
        return;
      }
      valueList.push(val);
    });

    return { [prop]: valueList };
  }

  /**
   * Map XForm's 'repeat' group to an array of objects.
   * Every repeat iteration element has:
   *    - The name attribute that corresponds to the object's property containing the array.
   *    - 1 or more field that are mapped to Object's properties
   * @param group {Element} HTML element representing a XForm group, that contains the 'repeat' group.
   * @returns {Object|undefined}
   */
  function mapToObjectList(group) {
    // XForm's repeat is automatically wrapped in a <section> element.
    const repeatGroups = $(group)
      .children('section')
      .children(APPEARANCES.objectList);

    if (!repeatGroups.length) {
      return;
    }

    const prop = getElementName(repeatGroups[0]);
    const objectList = [];

    repeatGroups.each((index, objectGroup) => {
      const obj = mapToObject(objectGroup);
      if (!obj) {
        return;
      }
      objectList.push(obj);
    });

    return { [prop]: objectList };
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

  /**
   * Process the external app data object or sub-object.
   * @param group {Element} HTML element representing a XForm group.
   * @param data {Object} External app data object or sub-object.
   */
  function processOutputData(group, data) {
    if (!group || !_isPlainObject(data) || !Object.keys(data).length) {
      return;
    }

    setOutputFields(group, data);
    processOutputValueList(group, data);
    processOutputObjectList(group, data);
    processOutputSubLevels(group, data);
  }

  function setOutputFields(group, data) {
    const $fields = getFieldsInGroup(group);

    $fields.each((index, input) => {
      const inputName = getElementName(input);
      assignValueToInput(input, inputName, data[inputName]);
    });
  }

  /**
   * Process the external app data that has array of strings, numbers or booleans.
   * This array is represented in the XForm as 'repeat' group with fixed size (repeat_count=n)
   * Every repeat iteration element has:
   *    - The name attribute that corresponds to the data's property containing the array.
   *    - 1 field where the array's value (string, number or boolean) is assigned.
   * @param group {Element} HTML element representing a XForm group, that contains the 'repeat' group.
   * @param data {Object} External app data object or sub-object.
   */
  function processOutputValueList(group, data) {
    // XForm's repeat is automatically wrapped in a <section> element.
    const repeatGroups = $(group)
      .children('section')
      .children(APPEARANCES.valueList);

    if (!repeatGroups.length) {
      return;
    }

    const prop = getElementName(repeatGroups[0]);
    const valueList = data[prop];

    if (!valueList || !valueList.length) {
      return;
    }

    repeatGroups.each((index, repeatGroup) => {
      if (valueList.length < index) {
        return;
      }

      const $fields = getFieldsInGroup(repeatGroup);

      if (isValueListValid($fields)) {
        assignValueToInput($($fields[0]), prop, valueList[index]);
      }
    });
  }

  /**
   * Process the external app data that has array of objects.
   * This array is represented in the XForm as 'repeat' group with fixed size (repeat_count=n)
   * Every repeat iteration element has:
   *    - The name attribute that corresponds to the data's property containing the array.
   *    - 1 or more field where the array's object data is assign.
   * @param group {Element} HTML element representing a XForm group, that contains the 'repeat' group.
   * @param data {Object} External app data object or sub-object.
   */
  function processOutputObjectList(group, data) {
    // XForm's repeat is automatically wrapped in a <section> element.
    const repeatGroups = $(group)
      .children('section')
      .children(APPEARANCES.objectList);

    if (!repeatGroups.length) {
      return;
    }

    const prop = getElementName(repeatGroups[0]);
    const objectList = data[prop];

    if (!objectList || !objectList.length) {
      return;
    }

    repeatGroups.each((index, objectGroup) => {
      if (objectList.length < index) {
        return;
      }
      processOutputData(objectGroup, objectList[index]);
    });
  }

  /**
   * Process the external app data with nested objects.
   * @param group {Element} HTML element representing a XForm group.
   * @param data {Object} External app data object or sub-object.
   */
  function processOutputSubLevels(group, data) {
    $(group)
      .children(APPEARANCES.object)
      .each((index, objectGroup) => {
        const prop = getElementName(objectGroup);
        processOutputData(objectGroup, data[prop]);
      });
  }

  function assignValueToInput(input, inputName, value) {
    if (!input || value === undefined || value === null) {
      return;
    }

    if (_isPlainObject(value)) {
      // eslint-disable-next-line no-console
      console.debug(`External App Launcher Widget :: Cannot set value to "${inputName}" field, value is an object.`);
      return;
    }

    if (Array.isArray(value)) {
      // eslint-disable-next-line no-console
      console.debug(`External App Launcher Widget :: Cannot set value to "${inputName}" field, value is an array.`);
      return;
    }

    const $input = $(input)
      .val(value)
      .trigger('change');

    const $image = getImageElement($input.parent());

    if ($image) {
      $image.attr('src', `data:image/png;base64,${value}`);
    }
  }

  function getImageElement($wrapper) {
    if (!$wrapper.is(APPEARANCES.image)) {
      return;
    }

    const imgClass = 'external-app-image';
    const $img = $wrapper.children(`.${imgClass}`);

    if ($img.length) {
      return $img;
    }

    const $imgElement = $(`<img class="${imgClass}">`);
    $wrapper.append($imgElement);

    return $imgElement;
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
      console.debug('External App Launcher Widget :: "external-app-value-list" missing field.');
      return false;
    }

    if ($fields.length > 1) {
      // eslint-disable-next-line no-console
      console.debug('External App Launcher Widget :: "external-app-value-list" can only have one field.');
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
        $this.data(PLUGIN_NAME, (data = new Externalapplauncherwidget(this, options, event)));
      } else if (data && typeof options === 'string') {
        data[options](this);
      }
    });
  };

  module.exports = {
    'name': PLUGIN_NAME,
    'selector': APPEARANCES.widget,
  };
}
