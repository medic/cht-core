const convertTranslationsMessages = require('./convert-translation-messages');

module.exports = {
  name: 'convert-translation-messages-fix',
  created: new Date(2019, 6, 7),
  run: () => convertTranslationsMessages.run()
};
