const { checkTranslations, TranslationException } = require('@medic/translation-checker');

const SUPPORTED_LANGUAGES = [ 'en', 'es', 'fr', /*'ne',*/ 'sw' ]; // add ne once all missing translations added
const TRANSLATION_DIR = `${__dirname}/../../api/resources/translations`;
const TRANSLATION_OPTIONS = {
  checkPlaceholders: true,
  checkEmpties: true,
  checkMessageformat: true,
  checkMissing: true,
  languages: SUPPORTED_LANGUAGES
};

const handleError = (e) => {
  if (e instanceof TranslationException && !!e.errors) {
    for (const err of e.errors) {
      console.error(err.message);
    }
    return 1;
  }
  console.error(e);
  return 2;
};

const run = async () => {
  try {
    const files = await checkTranslations(TRANSLATION_DIR, TRANSLATION_OPTIONS);
    console.log(`Files checked: ${files}`);
    console.log('Linting translation files passed');
  } catch (e) {
    const exitCode = handleError(e);
    process.exit(exitCode);
  }
};

console.log('Linting translation files...');
run();
