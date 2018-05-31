const _ = require('underscore'),
      properties = require('properties'),
      db = require('./db-pouch'),
      DDOC_ID = '_design/medic',
      TRANSLATION_FILE_NAME_REGEX = /translations\/messages\-([a-z]*)\.properties/,
      DOC_TYPE = 'translations',
      BACKUP_TYPE = 'translations-backup';

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

const createBackup = attachment => {
  return {
    _id: [ 'messages', attachment.code, 'backup' ].join('-'),
    type: BACKUP_TYPE,
    code: attachment.code,
    values: attachment.values
  };
};

const createDoc = attachment => {
  return {
    _id: [ 'messages', attachment.code ].join('-'),
    type: DOC_TYPE,
    code: attachment.code,
    name: LOCAL_NAME_MAP[attachment.code] || attachment.code,
    enabled: true,
    values: attachment.values
  };
};

const merge = (attachments, backups, docs) => {
  const updatedDocs = [];
  const english = _.findWhere(attachments, { code: 'en' });
  const knownKeys = english ? Object.keys(english.values) : [];
  attachments.forEach(attachment => {
    const code = attachment.code;
    if (!code) {
      return;
    }
    knownKeys.forEach(knownKey => {
      const value = attachment.values[knownKey];
      if (_.isUndefined(value) || value === null) {
        attachment.values[knownKey] = knownKey;
      } else if (typeof value !== 'string') {
        attachment.values[knownKey] = String(value);
      }
    });
    const backup = _.findWhere(backups, { code: code });
    if (!backup) {
      // new language
      updatedDocs.push(createDoc(attachment));
      updatedDocs.push(createBackup(attachment));
      return;
    }
    const doc = _.findWhere(docs, { code: code });
    if (doc) {
      // language hasn't been deleted - free to update
      let updated = false;
      Object.keys(attachment.values).forEach(key => {
        const existing = doc.values[key];
        const backedUp = backup.values[key];
        const attached = attachment.values[key];
        if (_.isUndefined(existing) ||
            (existing === backedUp && backedUp !== attached)) {
          // new or updated translation
          doc.values[key] = attachment.values[key];
          updated = true;
        }
      });
      if (updated) {
        updatedDocs.push(doc);
      }
    }
    if (!_.isEqual(backup.values, attachment.values)) {
      // backup the modified attachment
      backup.values = attachment.values;
      updatedDocs.push(backup);
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
            values: values
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

const getBackups = () => {
  return getDocs({
    key: [ BACKUP_TYPE ],
    include_docs: true
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
        return Promise.all([ getBackups(), getTranslationDocs() ])
          .then(([ backups, docs ]) => merge(attachments, backups, docs))
          .then(updated => {
            if (updated.length) {
              return db.medic.bulkDocs(updated);
            }
          });
      });
  }
};
