const { isString: _isString } = require('lodash');
const { EnketoTranslator } = require('../src/enketo-translator');

class EnketoPrepopulationDataService {
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
          EnketoTranslator.bindJsonToXml(bindRoot, data, (name) => {
            // Either a direct child or a direct child of inputs
            return '>%, >inputs>%'.replace(/%/g, name);
          });
        }

        if(userRoot.length) {
          EnketoTranslator.bindJsonToXml(userRoot, user);
        }

        return new XMLSerializer().serializeToString(bindRoot[0]);
      });
  }
}

module.exports = EnketoPrepopulationDataService;
