/**
 * XForm generation service
 * @module generate-xform
 */
const childProcess = require('child_process');
const path = require('path');
const logger = require('../logger');
const db = require('../db');
const formsService = require('./forms');

const FORM_ROOT_OPEN = '<root xmlns:xf="http://www.w3.org/2002/xforms" xmlns:orx="http://openrosa.org/xforms" xmlns:enk="http://enketo.org/xforms" xmlns:kb="http://kobotoolbox.org/xforms" xmlns:esri="http://esri.com/xforms" xmlns:oc="http://openclinica.org/xforms" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:jr="http://openrosa.org/javarosa">';
const MODEL_ROOT_OPEN = '<root xmlns="http://www.w3.org/2002/xforms" xmlns:xf="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:xsd="http://www.w3.org/2001/XMLSchema">';
const ROOT_CLOSE = '</root>';
const JAVAROSA_SRC = / src="jr:\/\//gi;
const MEDIA_SRC_ATTR = ' data-media-src="';

const FORM_STYLESHEET = path.join(__dirname, '../xsl/openrosa2html5form.xsl');
const MODEL_STYLESHEET = path.join(__dirname, '../../node_modules/enketo-xslt/xsl/openrosa2xmlmodel.xsl');

const transform = (formXml, stylesheet) => {
  return new Promise((resolve, reject) => {
    const xsltproc = childProcess.spawn('xsltproc', [ stylesheet, '-' ]);
    let stdout = '';
    let stderr = '';
    xsltproc.stdout.on('data', data => stdout += data);
    xsltproc.stderr.on('data', data => stderr += data);
    xsltproc.stdin.setEncoding('utf-8');
    xsltproc.stdin.write(formXml);
    xsltproc.stdin.end();
    xsltproc.on('exit', code => {
      if (code !== 0 || stderr.length) {
        logger.error('xsltproc stderr output: ');
        logger.error(stderr);
        return reject(new Error(`Error transforming xml, xsltproc returned code "${code}"`));
      }
      resolve(stdout);
    });
    xsltproc.on('error', err => {
      logger.error(err);
      return reject(new Error('Child process errored attempting to transform xml'));
    });
  });
};

const generateForm = formXml => {
  return transform(formXml, FORM_STYLESHEET).then(form => {
    return form
      // remove the root node leaving just the HTML to be rendered
      .replace(FORM_ROOT_OPEN, '')
      .replace(ROOT_CLOSE, '')
      // rename the media src attributes so the browser doesn't try and
      // request them, instead leaving it to custom code in the Enketo
      // service to load them asynchronously
      .replace(JAVAROSA_SRC, MEDIA_SRC_ATTR);
  });
};

const generateModel = formXml => {
  return transform(formXml, MODEL_STYLESHEET).then(model => {
    return model
      // remove the root node leaving just the HTML to be rendered
      .replace(MODEL_ROOT_OPEN, '')
      .replace(ROOT_CLOSE, '');
  });
};

const getEnketoForm = doc => {
  const collect = doc.context && doc.context.collect;
  return !collect && formsService.getXFormAttachment(doc);
};

const generate = formXml => {
  return Promise.all([ generateForm(formXml), generateModel(formXml) ])
    .then(([ form, model ]) => ({ form, model }));
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
    return module.exports._generate(form.data.toString()).then(result => {
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

  _generate: generate

};
