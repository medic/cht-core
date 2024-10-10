const isValid = (results) => {
  for (const index in results) {
    if (!results[index]) {
      return false;
    }
  }
  return true;
};

const getErrors = (results) => {
  const errors = [];
  for (const index in results) {
    if (!results[index]) {
      errors.push(index);
    }
  }
  return errors;
};

module.exports = {
  create: (results) => {
    return {
      results,
      isValid: () => isValid(results),
      hasErrors: () => !isValid(results),
      errors: () => getErrors(results),
      fields: () => results
    };
  }
};
