const KEY_REGEX = /\${([^}\r\n]*)}/g;

module.exports = {
  loadTranslations: values => {
    if (!values || typeof values !== 'object') {
      return {};
    }

    Object.keys(values).forEach(key => {
      if (typeof(values[key]) === 'string') {
        values[key] = values[key].replace(KEY_REGEX, (match, key) => {
          return ['string', 'number'].includes(typeof(values[key])) && values[key] || ('${' + key + '}');
        });
      }
    });
    return values;
  }
};
