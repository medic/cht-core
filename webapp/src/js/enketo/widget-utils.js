const moment = require('moment');


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

const getForm = () => {
  return window.CHTCore.Enketo.getCurrentForm();
};

const setFieldValue = ($widget, fieldName, value) => {
  if (!fieldName || value === undefined) {
    return;
  }

  $widget
    .find(`input[name$=${fieldName}]`)
    .val(value)
    .trigger('change');
};

const getFieldValue = (form, fieldName) => {
  if (!form || !fieldName) {
    return;
  }

  return form.model.$
    .find(fieldName)
    .text();
};

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
