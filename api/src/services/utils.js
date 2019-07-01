module.exports = {
  parseQueryParams: query => {
    const parsed = {};
    if (!query || typeof query !== 'object') {
      return parsed;
    }

    Object.keys(query).forEach(key => {
      try {
        parsed[key] = JSON.parse(query[key]);
      } catch(e) {
        parsed[key] = query[key];
      }
    });

    return parsed;
  }
};
