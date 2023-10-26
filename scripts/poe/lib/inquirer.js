const {mmVersion} = require('./utils');
const inquirer = require('inquirer');
const {validTranslations, validDirectory} = require('./validate');

const apiTokenQuestion = {
  name: 'api_token', type: 'input',
  message: 'Enter poeditor\'s api key:',
  default: process.env.POE_API_TOKEN || '',
  validate: function( value ) {
    return value.length ? true : 'Please enter poeditor\'s api key.';
  }
};

const projectIdQuestion = {
  name: 'id', type: 'input',
  message: 'Enter poeditor\'s project id:',
  default: process.env.POE_PROJECT_ID || '',
  validate: function(value) {
    return value.length ? true : 'Please enter poeditor\'s project id.';
  }
};

const questions = {
  export: [
    apiTokenQuestion,
    projectIdQuestion,
    {
      name: 'language',
      type: 'list',
      message: 'Select the language to download.',
      choices: ['all', 'en'],
      default: 'all'
    },
    {
      name: 'type',
      type: 'list',
      message: 'Select the file format.',
      choices: [
        'po', 'pot', 'mo', 'xls', 'csv', 'resw', 'resx', 'android_strings', 'apple_strings', 'xliff',
        'properties', 'key_value_json', 'json', 'xmb', 'xtb'
      ],
      default: 'properties'
    },
    {
      name: 'file', type: 'input',
      message: 'Enter the relative path to the download directory',
      default: '.',
      validate: function( value ) {
        return validDirectory(value) ? true : 'Please enter the download directory.';
      }
    },
    {
      name: 'filters',
      type: 'list',
      message: 'Filter results by:',
      choices: ['none', 'translated', 'untranslated', 'fuzzy', 'not_fuzzy',
        'automatic', 'not_automatic', 'proofread', 'not_proofread'],
      default: 'none'
    },
    {
      name: 'tags',
      type: 'string',
      message: 'Filter results by tags.\nYou can use either a string for a single tag or a json array for one ' +
        'or multiple tags.',
      default: `${mmVersion()}`
    }
  ],
  import: [
    apiTokenQuestion,
    projectIdQuestion,
    {
      name: 'updating', type: 'list',
      message: 'Select the type of UPDATING.',
      choices: ['terms', 'terms_translations', 'translations'],
      default: 'terms_translations'
    },
    {
      name: 'file', type: 'input',
      message: 'Enter the relative path to the translation file',
      default: './messages-en.properties',
      validate: function( value ) {
        return validTranslations(value) ? true : 'Please enter the translation file.';
      }
    },
    {
      name: 'overwrite', type: 'list',
      message: 'Do you want to overwrite translations?',
      choices: ['yes', 'no'],
      default: 'yes'
    },
    {
      name: 'sync_terms', type: 'list',
      message: 'Do you want to sync terms?\nSet to yes if you want to sync your terms \n(terms that are not found in ' +
        'the uploaded file will be deleted from project and the new ones added). \nIgnored if updating = translations.',
      choices: ['yes', 'no'],
      default: 'yes'
    },
    {
      name: 'tags', type: 'input',
      message: 'Do you want to add tags?\n\nAvailable when updating terms or terms_translations; you can use the ' +
        'following keys: \
        \n"all" - for all the imported terms, \
        \n"new" - for the terms which aren\'t already in the project, \
        \n"obsolete" - for the terms which are in the project but not in the imported file and \
        \n"overwritten_translations" - for the terms for which translations change. \
        \n\nexamples: \
        \n# If not specified, the tags are set by default to all terms. \
        \ntags=["name-of-tag", "name-of-another-tag"] \
        \ntags={"all": "name-of-tag"} \
        \ntags={"all": "name-of-tag", "new": ["name-of-tag"], "obsolete": ["name-of-tag", "name-of-another-tag"]}\n\n',
      default: `{"all": ["${mmVersion()}"]}`
    },
    {
      name: 'fuzzy_trigger', type: 'list',
      message: 'Fuzzy trigger?\nSet it to yes to mark corresponding translations from the other languages as fuzzy ' +
        'for the updated values',
      choices: ['yes', 'no'],
      default: 'yes'
    }
  ]
};

module.exports = {
  ask: async (arg) => {
    const values = await inquirer.prompt(questions[arg]);
    ['overwrite', 'sync_terms', 'fuzzy_trigger'].forEach(key => {
      if (values[key]) {
        values[key] = values[key] === 'yes' ? 1 : 0;
      }
    });
    ['filters', 'tags'].forEach(key => {
      if (['', 'none'].includes(values[key])) {
        delete values[key];
      }
    });
    return values;
  }
};
