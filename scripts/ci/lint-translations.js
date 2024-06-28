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
  if (e instanceof TranslationException && e.errors) {
    for (const error of e.errors) {
      console.error(error.message);
    }
    return 1;
  }
  console.log(e);
  return 2;
};

const run = async () => {
  console.log('Linting translation files...');
  await checkTranslations(TRANSLATION_DIR, TRANSLATION_OPTIONS);
  console.log('Linting translation files passed');
};

try {
  run();
} catch (e) {
  const exitCode = handleError(e);
  process.exit(exitCode);
}
