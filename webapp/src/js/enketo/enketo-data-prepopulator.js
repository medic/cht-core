const { isString: _isString } = require('lodash');
const { bindJsonToXml } = require('./enketo-data-translator');

class EnketoDataPrepopulator {
  constructor(userSettingsService) {
    this.userSettingsService = userSettingsService;
  }

  get(model, data) {
    if(data && _isString(data)) {
      return Promise.resolve(data);
    }

    return this.userSettingsService
      .get()
      .then((user) => {
        const xml = $($.parseXML(model));
        const bindRoot = xml.find('model instance').children().first();
        const userRoot = bindRoot.find('>inputs>user');

        if(data) {
          bindJsonToXml(bindRoot, data, (name) => {
            // Either a direct child or a direct child of inputs
            return '>%, >inputs>%'.replace(/%/g, name);
          });
        }

        if(userRoot.length) {
          bindJsonToXml(userRoot, user);
        }

        return new XMLSerializer().serializeToString(bindRoot[0]);
      });
  }
}

module.exports = EnketoDataPrepopulator;
