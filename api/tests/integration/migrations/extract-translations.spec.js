const sinon = require('sinon');
const utils = require('./utils');

describe('extract-translations', function() {
  afterEach(() => {
    utils.tearDown();
    sinon.restore();
  });

  it('should update existing translations and remove them from app_settings', function() {

    // given
    return utils.initDb([
      {
        _id: 'messages-es',
        type: 'translations',
        code: 'es',
        enabled: true,
        name: 'Spanish',
        values: {
          Submit: 'Subo',
          cancel: 'Cancelo'
        }
      },
      {
        _id: 'messages-en',
        type: 'translations',
        code: 'en',
        enabled: true,
        name: 'English',
        values: {
          Submit: 'Sub',
          cancel: 'Cancel' // new translation
        }
      }
    ])
      .then(function() {
        return utils.initSettings({
          translations: [
            {
              key: 'Submit',
              translations: [
                {
                  locale: 'en',
                  content: 'Send', // different from default so leave
                  default: 'Submit'
                },
                {
                  locale: 'es',
                  content: 'Enviar', // same as default so change
                  default: 'Enviar'
                },
                { // test special characters
                  locale: 'hi',
                  content: 'कृपया {{patient_name}} ({{patient_id}}) को याद दिलाएँ कि इस हफ्ते, वह स्वास्थ्य सुविधा जाएं स्वास्थ्य की जांच के लिए | स्वास्थ्य की जांच के बाद, हमें बताइए \'V {{patient_id}}\' से जवाब भेजकर | धन्यवाद !', // eslint-disable-line max-len
                  default: 'कृपया {{patient_name}} ({{patient_id}}) को याद दिलाएँ कि इस हफ्ते, वह स्वास्थ्य सुविधा जाएं स्वास्थ्य की जांच के लिए | स्वास्थ्य की जांच के बाद, हमें बताइए \'V {{patient_id}}\' से जवाब भेजकर | धन्यवाद !' // eslint-disable-line max-len
                }
              ]
            }
          ],
          locales: [
            { code: 'en' },
            { code: 'es', disabled: true },
            { code: 'fr', disabled: true }
          ],
          schedules: [{
            name: 'ANC Reminders LMP',
            messages: [{
              message: [{
                content: 'कृपया {{patient_name}} ({{patient_id}}) को याद दिलाएँ कि इस हफ्ते, वह स्वास्थ्य सुविधा जाएं स्वास्थ्य की जांच के लिए | स्वास्थ्य की जांच के बाद, हमें बताइए \'V {{patient_id}}\' से जवाब भेजकर | धन्यवाद !', // eslint-disable-line max-len
                locale: 'hi'
              }]
            }]
          }],
          test: 'unchanged'
        });
      })
      .then(function() {
      // when
        return utils.runMigration('extract-translations');

      })
      .then(function() {

        // expect
        return utils.assertDb([
          {
            _id: 'messages-es',
            type: 'translations',
            code: 'es',
            enabled: false,
            name: 'Spanish',
            values: {
              Submit: 'Subo',
              cancel: 'Cancelo'
            }
          },
          {
            _id: 'messages-en',
            type: 'translations',
            code: 'en',
            enabled: true,
            name: 'English',
            values: {
              Submit: 'Send',
              cancel: 'Cancel'
            }
          }
        ]);

      })
      .then(function() {
        return utils.getSettings();
      })
      .then(function(doc) {
        if (doc.settings.translations) {
          throw new Error('`translations` should be empty');
        }
        if (doc.settings.locales) {
          throw new Error('`locales` should be empty');
        }
        if (doc.settings._id) {
          throw new Error('`_id` should be empty');
        }
        if (doc.settings.test !== 'unchanged') {
          throw new Error('Migration changed unexpected property');
        }
        if (doc.settings.schedules[0].messages[0].message[0].content !== 'कृपया {{patient_name}} ({{patient_id}}) को याद दिलाएँ कि इस हफ्ते, वह स्वास्थ्य सुविधा जाएं स्वास्थ्य की जांच के लिए | स्वास्थ्य की जांच के बाद, हमें बताइए \'V {{patient_id}}\' से जवाब भेजकर | धन्यवाद !') { // eslint-disable-line max-len
          throw new Error('message content got corrupted');
        }
      });
  });

});
