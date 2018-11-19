const _ = require('underscore'),
      properties = require('properties'),
      db = require('./db-pouch'),
      DDOC_ID = '_design/medic',
      TRANSLATION_FILE_NAME_REGEX = /translations\/messages\-([a-z]*)\.properties/,
      DOC_TYPE = 'translations';

const LOCAL_NAME_MAP = {
  bm: 'Bamanankan (Bambara)',
  en: 'English',
  es: 'Español (Spanish)',
  fr: 'Français (French)',
  ne: 'नेपाली (Nepali)',
  sw: 'Kiswahili (Swahili)',
  hi: 'हिन्दी (Hindi)',
  id: 'Bahasa Indonesia (Indonesian)'
};

const extractLocaleCode = filename => {
  const parts = TRANSLATION_FILE_NAME_REGEX.exec(filename);
  if (parts && parts[1]) {
    return parts[1].toLowerCase();
  }
};

const createDoc = attachment => {
  return {
    _id: [ 'messages', attachment.code ].join('-'),
    type: DOC_TYPE,
    code: attachment.code,
    name: LOCAL_NAME_MAP[attachment.code] || attachment.code,
    enabled: true,
    generic: attachment.generic
  };
};

const overwrite = (attachments, docs) => {
  const updatedDocs = [];
  const english = _.findWhere(attachments, { code: 'en' });
  const knownKeys = english ? Object.keys(english.generic) : [];
  attachments.forEach(attachment => {
    const code = attachment.code;
    if (!code) {
      return;
    }
    knownKeys.forEach(knownKey => {
      const value = attachment.generic[knownKey];
      if (_.isUndefined(value) || value === null) {
        attachment.generic[knownKey] = knownKey;
      } else if (typeof value !== 'string') {
        attachment.generic[knownKey] = String(value);
      }
    });
    const doc = _.findWhere(docs, { code: code });
    if (doc) {
      if (!_.isEqual(doc.generic, attachment.generic)) {
        // backup the modified attachment
        doc.generic = attachment.generic;
        updatedDocs.push(doc);
      }
    } else {
      updatedDocs.push(createDoc(attachment));
    }
  });
  return updatedDocs;
};

const getAttachment = name => {
  return db.medic.getAttachment(DDOC_ID, name)
    .then(attachment => {
      return new Promise((resolve, reject) => {
        properties.parse(attachment.toString('utf8'), (err, values) => {
          if (err) {
            return reject(err);
          }
          resolve({
            code: extractLocaleCode(name),
            generic: values
          });
        });
      });
    });
};

const getAttachments = () => {
  return db.medic.get(DDOC_ID)
    .then(ddoc => {
      if (!ddoc._attachments) {
        return [];
      }
      const attachments = _.filter(Object.keys(ddoc._attachments), key => {
        return key.match(TRANSLATION_FILE_NAME_REGEX);
      });
      return Promise.all(attachments.map(getAttachment));
    });
};

const getDocs = options => {
  return db.medic.query('medic-client/doc_by_type', options)
    .then(response => {
      return _.pluck(response.rows, 'doc');
    });
};

const getTranslationDocs = () => {
  return getDocs({
    startkey: [ DOC_TYPE, false ],
    endkey: [ DOC_TYPE, true ],
    include_docs: true
  });
};

module.exports = {
  run: () => {
    return getAttachments()
      .then(attachments => {
        if (!attachments.length) {
          return;
        }
        return Promise.all([ getTranslationDocs() ])
          .then(([ docs ]) => overwrite(attachments, docs))
          .then(updated => {
            if (updated.length) {
              return db.medic.bulkDocs(updated);
            }
          });
      });
  }
};
