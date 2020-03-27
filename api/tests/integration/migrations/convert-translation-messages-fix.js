const utils = require('./utils');
const DDOC_ID = '_design/medic';

describe('convert-translation-messages-fix migration', function() {
  afterEach(function() {
    return utils.tearDown();
  });

  it('converts translation messages structure', () => {

    // given
    return utils.initDb([
      {
        _id: 'messages-en',
        code: 'en',
        type: 'translations',
        enabled: true,
        values: { Contact: 'Contact', From: 'From', hello: 'Hello', bye: 'Goodbye CUSTOMISED' }
      }
    ])
      .then(function() {
        return utils.getDdoc(DDOC_ID);
      })
      .then(function(ddoc) {
        const attachment = {
          content_type: 'application/octet-stream',
          content: 'Contact = Contact\nFrom = From',
          key: 'translations/messages-en.properties'
        };
        return utils.insertAttachment(ddoc, attachment);
      })
      .then(function() {
        return utils.runMigration('convert-translation-messages-fix');
      })
      .then(function() {
        return utils.assertDb([
          {
            _id: 'messages-en',
            code: 'en',
            type: 'translations',
            enabled: true,
            generic: { Contact: 'Contact', From: 'From' },
            custom: { hello: 'Hello', bye: 'Goodbye CUSTOMISED' },
          }
        ]);
      });

  });

  it('converts translation messages structure following an upgrade after merging', () => {

    // given
    return utils.initDb([
      {
        _id: 'messages-en',
        code: 'en',
        type: 'translations',
        enabled: true,
        generic: { Contact: 'Contact', From: 'From', hello: 'Hi' },
        values: { hello: 'Bonjour', bye: 'Goodbye CUSTOMISED' }
      }
    ])
      .then(function() {
        return utils.getDdoc(DDOC_ID);
      })
      .then(function(ddoc) {
        const attachment = {
          content_type: 'application/octet-stream',
          content: 'Contact = Contact\nFrom = From',
          key: 'translations/messages-en.properties'
        };

        return utils.insertAttachment(ddoc, attachment);
      })
      .then(function() {
        return utils.runMigration('convert-translation-messages-fix');
      })
      .then(function() {
        return utils.assertDb([
          {
            _id: 'messages-en',
            code: 'en',
            type: 'translations',
            enabled: true,
            generic: { Contact: 'Contact', From: 'From', hello: 'Hi' },
            custom: { hello: 'Bonjour', bye: 'Goodbye CUSTOMISED' },
          }
        ]);
      });

  });

  it('does nothing when translation messages have the new structure', () => {

    // given
    return utils.initDb([
      {
        _id: 'messages-en',
        code: 'en',
        type: 'translations',
        enabled: true,
        generic: { Contact: 'Contact', From: 'From', hello: 'Hello', bye: 'Goodbye CUSTOMISED' }
      }
    ])
      .then(function() {
        return utils.getDdoc(DDOC_ID);
      })
      .then(function(ddoc) {
        const attachment = {
          content_type: 'application/octet-stream',
          content: 'Contact = Contact\nFrom = From',
          key: 'translations/messages-en.properties'
        };
        return utils.insertAttachment(ddoc, attachment);
      })
      .then(function() {
        return utils.runMigration('convert-translation-messages-fix');
      })
      .then(function() {
        return utils.assertDb([
          {
            _id: 'messages-en',
            code: 'en',
            type: 'translations',
            enabled: true,
            generic: { Contact: 'Contact', From: 'From', hello: 'Hello', bye: 'Goodbye CUSTOMISED' }
          }
        ]);
      });

  });

  it('should work correctly for all types of translations', () => {
    const generateAttachment = (code, values) => ({
      content_type: 'application/octet-stream',
      key: `translations/messages-${code}.properties`,
      content: Object.keys(values).map(key => `${key} = ${values[key]}`).join('\n')
    });

    const messagesEn = {
      _id: 'messages-en',
      code: 'en',
      type: 'translations',
      enabled: true,
      values: {
        one: 'first',
        two: 'second',
        three: 'third new', // updated translation
        custom1: 'custom 1',
        custom2: 'custom 2'
      }
    };
    const attachmentEn = generateAttachment('en', { one: 'first', two: 'second', three: 'third'});

    const messagesEs = {
      _id: 'messages-es',
      code: 'es',
      type: 'translations',
      enabled: false,
      values: {
        one: 'first',
        two: 'second',
        three: 'three',
        custom1: '',
      }
    };
    const attachmentEs = generateAttachment('es', { one: 'first', two: '', three: '' });

    const messagesFr = {
      _id: 'messages-fr',
      code: 'fr',
      type: 'translations',
      enabled: false,
      generic: {
        one: 'first',
        three: 'three',
      },
      custom: {
        custom1: 'custom 1',
        custom2: 'custom 2'
      },
      values: {
        one: 'first',
        two: 'second',
        custom1: 'custom one',
      }
    };
    const attachmentFr = generateAttachment('fr', { one: 'first', two: '', three: '' });

    const messagesRn = {
      _id: 'messages-rn',
      code: 'rn',
      type: 'translations',
      enabled: true,
      values: {
        one: 'first',
        two: '',
        three: '',
        custom1: 'custom 1',
      },
      custom: {
        custom2: 'custom 2'
      },
    };

    return utils
      .initDb([messagesEn, messagesEs, messagesFr, messagesRn])
      .then(() => utils.getDocStub(DDOC_ID))
      .then(docStub => utils.insertAttachment(docStub, attachmentEn))
      .then(result => utils.insertAttachment({ _id: result.id, _rev: result.rev }, attachmentEs))
      .then(result => utils.insertAttachment({ _id: result.id, _rev: result.rev }, attachmentFr))
      .then(() => utils.runMigration('convert-translation-messages-fix'))
      .then(() => utils.assertDb([
        {
          _id: 'messages-en',
          code: 'en',
          type: 'translations',
          enabled: true,
          generic: {
            one: 'first',
            two: 'second',
            three: 'third new' // keept the updated translation
          },
          custom: {
            custom1: 'custom 1',
            custom2: 'custom 2'
          }
        },
        {
          _id: 'messages-es',
          code: 'es',
          type: 'translations',
          enabled: false,
          generic: {
            one: 'first',
            two: 'second',
            three: 'three'
          },
          custom: {
            custom1: '',
          }
        },
        {
          _id: 'messages-fr',
          code: 'fr',
          type: 'translations',
          enabled: false,
          generic: {
            one: 'first',
            two: 'second',
            three: 'three',
          },
          custom: {
            custom1: 'custom one',
            custom2: 'custom 2'
          }
        },
        {
          _id: 'messages-rn',
          code: 'rn',
          type: 'translations',
          enabled: true,
          generic: {},
          custom: {
            one: 'first',
            two: '',
            three: '',
            custom1: 'custom 1',
            custom2: 'custom 2'
          }
        }
      ]));
  });

});
