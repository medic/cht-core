var utils = require('./utils'),
    DDOC_ID = '_design/medic';

describe('convert-translation-messages migration', function() {
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
      return utils.runMigration('convert-translation-messages');
    })
    .then(function() {
      return utils.assertDb([
        {
          _id: 'messages-en',
          code: 'en',
          type: 'translations',
          generic: { Contact: 'Contact', From: 'From' },
          custom: { hello: 'Hello', bye: 'Goodbye CUSTOMISED' },
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
      return utils.runMigration('convert-translation-messages');      
    })
    .then(function() {  
      return utils.assertDb([
        {
          _id: 'messages-en',
          code: 'en',
          type: 'translations',
          generic: { Contact: 'Contact', From: 'From', hello: 'Hello', bye: 'Goodbye CUSTOMISED' }
        }
      ]);  
    });

  });

});
