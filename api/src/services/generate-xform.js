/**
 * XForm generation service
 * @module generate-xform
 */
const childProcess = require('child_process');
const path = require('path');
const logger = require('../logger');
const db = require('../db');

const FORM_ROOT_OPEN = '<root xmlns:xf="http://www.w3.org/2002/xforms" xmlns:orx="http://openrosa.org/xforms" xmlns:enk="http://enketo.org/xforms" xmlns:kb="http://kobotoolbox.org/xforms" xmlns:esri="http://esri.com/xforms" xmlns:oc="http://openclinica.org/xforms" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:jr="http://openrosa.org/javarosa">';
const MODEL_ROOT_OPEN = '<root xmlns="http://www.w3.org/2002/xforms" xmlns:xf="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:xsd="http://www.w3.org/2001/XMLSchema">';
const ROOT_CLOSE = '</root>';
const JAVAROSA_SRC = / src="jr:\/\//gi;

const getStylesheetPath = filename => path.join(__dirname, '../../node_modules/enketo-xslt/xsl', filename);
const FORM_STYLESHEET = getStylesheetPath('openrosa2html5form.xsl');
const MODEL_STYLESHEET = getStylesheetPath('openrosa2xmlmodel.xsl');

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
    xsltproc.on('close', code => {
      if (code !== 0 || stderr.length) {
        logger.error('xsltproc stderr output: ');
        logger.error(stderr);
        return reject(new Error(`Error transforming xml, xsltproc returned code "${code}"`));
      }
      resolve(stdout);
    });
  });
};

const generateForm = formXml => {
  return transform(formXml, FORM_STYLESHEET).then(form => {
    return form.replace(FORM_ROOT_OPEN, '')
               .replace(ROOT_CLOSE, '')
               .replace(JAVAROSA_SRC, ' data-media-src="');
  });
};

const generateModel = formXml => {
  return transform(formXml, MODEL_STYLESHEET).then(model => {
    return model.replace(MODEL_ROOT_OPEN, '')
                .replace(ROOT_CLOSE, '');
  });
};

// TODO pull out parts of forms controller as forms service and reuse here
//    once this is merged: https://github.com/medic/medic/pull/5656
const isXMLForm = doc => {
  return Object.keys(doc && doc._attachments || {})
         .some(name => name === 'xml' || name.endsWith('.xml'));
};

const getFormDocs = () => {
  const options = {
    key: ['form'],
    include_docs: true,
    attachments: true,
    binary: true,
  };
  return db.medic.query('medic-client/doc_by_type', options)
    .then(response => response.rows.filter(row => isXMLForm(row.doc)))
    .then(rows => rows.map(row => row.doc));
};

const getXFormAttachment = doc => {
  const attachments = (doc && doc._attachments) || {};
  const name = Object.keys(attachments)
    .find(name => name === 'xml' || name.endsWith('.xml'));
  return attachments[name];
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

module.exports = {

  /**
   * Updates the model and form attachments of the given form if necessary. 
   * @param {string} docId - The db id of the doc defining the form.
   */
  update: docId => {
    return db.medic.get(docId, { attachments: true, binary: true }).then(doc => {
      const xform = getXFormAttachment(doc);
      if (!xform) {
        return Promise.reject({ message: `Form "${docId}" not found`, code: 404 });
      }
      return module.exports._generate(xform.data.toString()).then(updated => {
        if (updateAttachmentsIfRequired(doc, updated)) {
          return db.medic.put(doc);
        }
      });
    });
  },

  updateAll: () => {
    
  },

  _generate: generate

};
