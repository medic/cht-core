const { checkTranslations, TranslationException } = require('@medic/translation-checker');

const SUPPORTED_LANGUAGES = [ 'en', 'es', 'fr', 'ne', 'sw' ];
const API_TRANSLATION_DIR = `${__dirname}/../../api/resources/translations`;
const CONFIG_TRANSLATION_DIRS = [
  `${__dirname}/../../config/default/translations`,
  `${__dirname}/../../config/demo/translations`,
];
const API_OPTIONS = {
  checkPlaceholders: true,
  checkEmpties: true,
  checkMessageformat: true,
  checkMissing: true,
  languages: SUPPORTED_LANGUAGES
};
const CONFIG_OPTIONS = {
  checkPlaceholders: true,
  checkEmpties: false,
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
  let failed = false;

  try {
    const files = await checkTranslations(API_TRANSLATION_DIR, API_OPTIONS);
    console.log(`API files checked: ${files}`);
  } catch (e) {
    handleError(e);
    failed = true;
  }

  for (const dir of CONFIG_TRANSLATION_DIRS) {
    try {
      const files = await checkTranslations(dir, CONFIG_OPTIONS);
      console.log(`Config files checked (${dir.split('/').slice(-3, -1).join('/')}): ${files}`);
    } catch (e) {
      handleError(e);
      failed = true;
    }
  }

  if (failed) {
    process.exit(1);
  }
  console.log('Linting translation files passed');
};

console.log('Linting translation files...');
run();
