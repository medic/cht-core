const { isString: _isString } = require('lodash');
const { bindJsonToXml } = require('./enketo-data-translator');

class EnketoDataPrepopulator {
  constructor(userSettingsService, languageService) {
    this.userSettingsService = userSettingsService;
    this.languageService = languageService;
  }

  get(model, data) {
    if(data && _isString(data)) {
      return Promise.resolve(data);
    }

    return Promise.all([
      this.userSettingsService.get(),
      this.languageService.get()
    ])
      .then(([user, language]) => {
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
          const userObject = Object.assign({ language }, user);
          bindJsonToXml(userRoot, userObject);
        }

        return new XMLSerializer().serializeToString(bindRoot[0]);
      });
  }
}

module.exports = EnketoDataPrepopulator;
