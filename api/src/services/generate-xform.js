/**
 * XForm generation service
 * @module generate-xform
 */
const logger = require('../logger');
const db = require('../db');
const formsService = require('./forms');
const transformer = require('enketo-transformer');

const MODEL_ROOT_OPEN = '<root xmlns="http://www.w3.org/2002/xforms" xmlns:xf="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:xsd="http://www.w3.org/2001/XMLSchema">';
const ROOT_CLOSE = '</root>';
const JAVAROSA_SRC = / src="jr:\/\//gi;
const MEDIA_SRC_ATTR = ' data-media-src="';

const transform = (formXml) => {
  return transformer.transform( {
    // required string of XForm
    xform: formXml,
    // optional string, to add theme if no theme is defined in the XForm
    // theme: 'sometheme',
    // optional map, to replace jr://..../myfile.png URLs
    // media: {
    //   'myfile.png' : '/path/to/somefile.png',
    //   'myfile.mp3' : '/another/path/to/2.mp3'
    // },
    // optional preprocess function that transforms the XForm (as libXMLJs object) to
    // e.g. correct incompatible XForm syntax before Enketo's transformation takes place
    // preprocess: doc => doc,
    // TODO Might be able to replace some existing transform logic here if libXMLJs is better...
  } )
    .catch(err => {
      logger.error(err);
      return Promise.reject(new Error(`Error attempting to transform xml: ${err}`));
    });
};

const generateForm = form => {
  return form.replace(JAVAROSA_SRC, MEDIA_SRC_ATTR);
};

const generateModel = model => {
  model = model.replace(MODEL_ROOT_OPEN, '');
  const index = model.lastIndexOf(ROOT_CLOSE);
  if (index === -1) {
    return model;
  }
  return model.slice(0, index) + model.slice(index + ROOT_CLOSE.length);
};

const getEnketoForm = doc => {
  const collect = doc.context && doc.context.collect;
  return !collect && formsService.getXFormAttachment(doc);
};

const generate = formXml => {
  return transform(formXml)
    .then((formData) => ({
      form: generateForm(formData.form),
      model: generateModel(formData.model)
    }));
};

const updateAttachment = (doc, updated, name, type) => {
  const attachmentData = doc._attachments &&
                         doc._attachments[name] &&
                         doc._attachments[name].data &&
                         doc._attachments[name].data.toString();
  if (attachmentData === updated) {
    return false;
  }
  doc._attachments[name] = {
    data: Buffer.from(updated),
    content_type: type
  };
  return true;
};

const updateAttachmentsIfRequired = (doc, updated) => {
  const formUpdated = updateAttachment(doc, updated.form, 'form.html', 'text/html');
  const modelUpdated = updateAttachment(doc, updated.model, 'model.xml', 'text/xml');
  return formUpdated || modelUpdated;
};

const updateAttachments = (accumulator, doc) => {
  return accumulator.then(results => {
    const form = getEnketoForm(doc);
    if (!form) {
      results.push(null); // not an enketo form - no update required
      return results;
    }
    logger.debug(`Generating html and xml model for enketo form "${doc._id}"`);
    return generate(form.data.toString()).then(result => {
      results.push(result);
      return results;
    });
  });
};

// Returns array of docs that need saving.
const updateAllAttachments = docs => {
  // spawn the child processes in series so we don't smash the server
  return docs.reduce(updateAttachments, Promise.resolve([])).then(results => {
    return docs.filter((doc, i) => {
      return results[i] && updateAttachmentsIfRequired(doc, results[i]);
    });
  });
};

module.exports = {

  /**
   * Updates the model and form attachments of the given form if necessary.
   * @param {string} docId - The db id of the doc defining the form.
   */
  update: docId => {
    return db.medic.get(docId, { attachments: true, binary: true })
      .then(doc => updateAllAttachments([ doc ]))
      .then(docs => {
        const doc = docs.length && docs[0];
        if (doc) {
          logger.info(`Updating form with ID "${docId}"`);
          return db.medic.put(doc);
        } else {
          logger.info(`Form with ID "${docId}" does not need to be updated.`);
        }
      });
  },

  /**
   * Updates the model and form attachments for all forms if necessary.
   */
  updateAll: () => {
    return formsService.getFormDocs()
      .then(docs => {
        if (!docs.length) {
          return [];
        }
        return updateAllAttachments(docs);
      })
      .then(toSave => {
        logger.info(`Updating ${toSave.length} enketo form${toSave.length === 1 ? '' : 's'}`);
        if (!toSave.length) {
          return;
        }
        return db.medic.bulkDocs(toSave).then(results => {
          const failures = results.filter(result => !result.ok);
          if (failures.length) {
            logger.error('Bulk save failed with: %o', failures);
            throw new Error('Failed to save updated xforms to the database');
          }
        });
      });

  },

  /**
   * @param formXml The XML form string
   * @returns a promise with the XML form transformed following
   *          the stylesheet rules defined (XSL transformations)
   */
  generate
};
