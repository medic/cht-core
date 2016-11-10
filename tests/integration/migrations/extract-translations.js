var utils = require('./utils'),
    db = require('../../../db');

describe('extract-translations', function() {
  afterEach(function() {
    return utils.tearDown();
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
      return new Promise(function(resolve, reject) {
        db.medic.get('_design/medic', function(err, ddoc) {
          if (err) {
            return reject(err);
          }
          resolve(ddoc);
        });
      });
    })
    .then(function(ddoc) {
      ddoc.app_settings.translations = [
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
            }
          ]
        }
      ];
      ddoc.app_settings.locales = [
        { code: 'en' },
        { code: 'es', disabled: true },
        { code: 'fr', disabled: true }
      ];
      
      return new Promise(function(resolve, reject) {
        db.medic.insert(ddoc, function(err) {
          if (err) {
            return reject(err);
          }
          resolve();
        });
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
      return new Promise(function(resolve, reject) {
        db.medic.get('_design/medic', function(err, ddoc) {
          if (err) {
            return reject(err);
          }
          resolve(ddoc);
        });
      });
    })
    .then(function(ddoc) {
      if (ddoc.app_settings.translations) {
        throw new Error('`translations` should be empty');
      }
      if (ddoc.app_settings.locales) {
        throw new Error('`locales` should be empty');
      }
    });
  });

});
