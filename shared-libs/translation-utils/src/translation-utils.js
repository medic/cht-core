const KEY_REGEX = /\${([^}\r\n]*)}/g;

module.exports = {
  loadTranslations: values => {
    Object.keys(values).forEach(key => {
      if (typeof(values[key]) === 'string') {
		values[key] = values[key].replace(KEY_REGEX, (match, key) => ['string', 'number'].includes(typeof(values[key])) && values[key] || ('${' + key + '}')); 
      }
    });
    return values;
  }
};
