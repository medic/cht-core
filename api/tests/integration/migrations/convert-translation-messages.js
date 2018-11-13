var utils = require('./utils'),
    db = require('../../../src/db-pouch'),
    DDOC_ID = '_design/medic';

describe('convert-translation-messages migration', function() {
  afterEach(function() {
    return utils.tearDown();
  });

  it('converts translation messages structure', async () => {

    // given
    await utils.initDb([
      {
        _id: 'messages-en',
        code: 'en',
        type: 'translations',
        values: { Contact: 'Contact', From: 'From', hello: 'Hello', bye: 'Goodbye CUSTOMISED' }
      }
    ]);

    const ddoc = await utils.getDdoc(DDOC_ID);
    const attachment = {
      content_type: 'application/octet-stream',
      content: "Contact = Contact\nFrom = From",
      key: 'translations/messages-en.properties'
    };     
    await utils.insertAttachment(ddoc, attachment);

    // when
    await utils.runMigration('convert-translation-messages');

    // expect
    await utils.assertDb([
      {
        _id: 'messages-en',
        code: 'en',
        type: 'translations',
        default: { Contact: 'Contact', From: 'From' },
        custom: { hello: 'Hello', bye: 'Goodbye CUSTOMISED' },
      }
    ]);
  });

  it('does nothing when translation messages have the new structure', async () => {

    // given
    await utils.initDb([
      {
        _id: 'messages-en',
        code: 'en',
        type: 'translations',
        default: { Contact: 'Contact', From: 'From', hello: 'Hello', bye: 'Goodbye CUSTOMISED' }
      }
    ]);

    const ddoc = await utils.getDdoc(DDOC_ID);
    const attachment = {
      content_type: 'application/octet-stream',
      content: "Contact = Contact\nFrom = From",
      key: 'translations/messages-en.properties'
    };     
    await utils.insertAttachment(ddoc, attachment);

    // when
    await utils.runMigration('convert-translation-messages');

    // expect
    await utils.assertDb([
      {
        _id: 'messages-en',
        code: 'en',
        type: 'translations',
        default: { Contact: 'Contact', From: 'From', hello: 'Hello', bye: 'Goodbye CUSTOMISED' }
      }
    ]);
  });

});
