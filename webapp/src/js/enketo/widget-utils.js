const moment = require('moment');

/**
 * Returns the binding function that will create the widget's instance.
 * @param widgetName { string }
 * @param widgetClass { Class } Used to create a widget's instance.
 * @returns { function(*=, *=): * }
 */
const getBindFunction = (widgetName, widgetClass) => {
  return function (options, event) {
    return this.each(function () {
      const $this = $(this);
      let data = $this.data(widgetName);

      options = options || {};

      if (!data && typeof options === 'object') {
        $this.data(widgetName, (data = new widgetClass(this, options, event)));

      } else if (data && typeof options === 'string') {
        data[options](this);
      }
    });
  };
};

/**
 * Returns the current Enketo form.
 * @returns { Object }
 */
const getForm = () => {
  return window.CHTCore.Enketo.getCurrentForm();
};

/**
 * Set the value to a field matching the selector provided.
 * @param $widget { Object } Jquery object reference of element in DOM
 * @param fieldSelector { string } Selector to match field in the HTML.
 * @param value { any }
 */
const setFieldValue = ($widget, fieldSelector, value) => {
  if (!fieldSelector || value === undefined) {
    return;
  }

  $widget
    .find(fieldSelector)
    .val(value)
    .trigger('change');
};

/**
 * Get the value of a field matching the selector for the Enketo form (XML like).
 * Example:
 *
 * <instance>
 *   <data>
 *     <myField></myField>
 *   </data>
 * </instance>
 *
 * fieldSelector is: "instance > data > myField"
 *
 * @param form { Object } Enketo form object reference.
 * @param fieldSelector { string } Selector to match field in the XML.
 * @returns {*}
 */
const getFieldValue = (form, fieldSelector) => {
  if (!form || !fieldSelector) {
    return;
  }

  return form.model.$
    .find(fieldSelector)
    .text();
};

/**
 * Format date to string
 * @param dateTime { Date }
 * @param format { string }
 * @returns { string }
 */
const formatDate = (dateTime, format) => {
  return dateTime && format && moment(dateTime).isValid() ? moment(dateTime).format(format): '';
};

module.exports = {
  getBindFunction,
  getForm,
  setFieldValue,
  getFieldValue,
  formatDate
};
