const KEY_REGEX = /\${([^}\r\n]*)}/g;

module.exports = {
  loadTranslations: values => {
    Object.keys(values).forEach(key => {
      values[key] = values[key].replace(KEY_REGEX, (match, key) => values[key] || ('${' + key + '}'));
    });
    return values;
  }
};
