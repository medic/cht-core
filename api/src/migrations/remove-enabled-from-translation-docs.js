const settingsService = require('../services/settings');
const db = require('../db');
const translations = require('../translations');

const deleteEnabledFromTranslationDocs = async (translationDocs) => {
  translationDocs.forEach(doc => delete doc.enabled);
  await db.medic.bulkDocs(translationDocs);
};

module.exports = {
  name: 'remove-enabled-from-translation-docs',
  created: new Date('2025-09-01'),
  run: async () => {
    const settings = await settingsService.get();
    const translationDocs = await translations.getTranslationDocs();

    if (settings.languages) {
      await deleteEnabledFromTranslationDocs(translationDocs);
      return;
    }

    const enabledLocales = translationDocs.filter(doc => doc.enabled).map(doc => doc.code);
    const languages = translationDocs.map(doc => ({ locale: doc.code, enabled: enabledLocales.includes(doc.code) }));
    await settingsService.update({ languages });
    await deleteEnabledFromTranslationDocs(translationDocs);
  }
};
