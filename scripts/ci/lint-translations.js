const { checkTranslations, TranslationException } = require('@medic/translation-checker');

const TRANSLATION_DIR = `${__dirname}/../../api/resources/translations`;
const SUPPORTED_LANGUAGES = [ 'en', 'es', 'fr', /*'ne',*/ 'sw' ]; // TODO add ne once all missing translations added

const run = async () => {
  try {
    await checkTranslations(
      TRANSLATION_DIR,
      {
        checkPlaceholders: true,
        checkEmpties: true,
        checkMessageformat: true,
        checkMissing: true,
        languages: SUPPORTED_LANGUAGES
      }
    );
  } catch (err) {
    if (err instanceof TranslationException) {
      if (!err.errors) {
        // unknown error
        throw err;
      }
      for (const e of err.errors) {
        console.error(e.message);
      }
      process.exit(-1);
    } else {
      throw err;
    }
  }
};

run();
