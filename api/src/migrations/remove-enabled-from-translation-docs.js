const settingsService = require('../services/settings');
const db = require('../db');
const translations = require('../translations');

module.exports = {
  name: 'remove-enabled-from-translation-docs',
  created: new Date('2025-09-01'),
  run: async () => {
    const settings = await settingsService.get();
    if (settings.languages) {
      return;
    }

    const translationDocs = await translations.getTranslationDocs();
    const enabledLocales = translationDocs.filter(doc => doc.enabled).map(doc => doc.code);

    const languages = Object.keys(translations.localeNames())
      .map(code => ({ locale: code, enabled: enabledLocales.includes(code) }));
    await settingsService.update({ languages });

    translationDocs.forEach(doc => delete doc.enabled);
    await db.medic.bulkDocs(translationDocs);
  }
};
