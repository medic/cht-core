const re = {
  alpha: /^[a-zA-Z]+$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  email: /^.*?@.*?\\..+$/
};

const ValidatorFunctions = {
  equals: (allValues, value, equalsTo) => value === equalsTo,

  iequals: (allValues, value, equalsTo) => value.toLowerCase() === equalsTo.toLowerCase(),

  sequals: (allValues, value, equalsTo) => value === equalsTo,

  siequals: (allValues, value, equalsTo) => value.toLowerCase() === equalsTo.toLowerCase(),

  lenmin: (allValues, value, min) => value.length >= min,

  lenmax: (allValues, value, max) => value.length <= max,

  lenequals: (allValues, value, equalsTo) => value.toString().length === parseInt(equalsTo, 10),

  min: (allValues, value, min) => parseFloat(value, 10) >= min,

  max: (allValues, value, max) => parseFloat(value, 10) <= max,

  between: (allValues, value, min, max) => {
    const numVal = parseFloat(value, 10);
    return ((numVal >= min) && (numVal <= max));
  },

  in: (allValues, value) => {
    const args = Array.prototype.slice.call(arguments);
    args.shift();
    args.shift();

    const inList = args;
    for (let i = 0; i < inList.length; i++) {
      if (inList[i] === value) {
        return true;
      }
    }

    return false;
  },

  required: (allValues, value) => !!value,

  optional: () => true,

  numeric: (allValues, value) => {
    // http://stackoverflow.com/a/1830844/316944
    return !isNaN(parseFloat(value)) && isFinite(value);
  },

  alpha: (allValues, value) => re.alpha.test(value),

  alphanumeric: (allValues, value) => re.alphanumeric.test(value),

  email: (allValues, value) => {
    // We used to use this regex: http://stackoverflow.com/a/2855946/316944
    // But it's probably a bit overkill.
    return re.email.test(value);
  },

  regex: (allValues, value, regex, flags) => {
    flags = flags || '';
    return (new RegExp(regex, flags)).test(value);
  },

  integer: (allValues, value) => parseInt(value, 10) === value,

  equalsto: (allValues, value, equalsToKey) => value === allValues[equalsToKey]
};

module.exports = ValidatorFunctions;
