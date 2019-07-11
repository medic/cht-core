/**
 * XForm generation service
 * @module generate-xform
 */
const childProcess = require('child_process');
const path = require('path');
const logger = require('../logger');

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
        console.error('xsltproc stderr output: ');
        console.error(stderr);
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

const getFormAttachment = form => {
  return getFormDocs()
    .then(docs => docs.find(doc => doc.internalId === form))
    .then(doc => {
      const attachments = (doc && doc._attachments) || {};
      const name = Object.keys(attachments)
        .find(name => name === 'xml' || name.endsWith('.xml'));
      return attachments[name];
    });
};


module.exports = {

  /**
   * Generates the xform form and model from the given xml definition.
   * @param {string} formXml - The xform.
   * @return {object} An object containing the generated `form` html as
   *  a string and the generated `model` xml as a string.
   */
  generate: formXml => {
    return Promise.all([ generateForm(formXml), generateModel(formXml) ])
      .then(([ form, model ]) => ({ form, model }));
  },

  update: docId => {
    return getFormAttachment...
  },

  updateAll: () => {
    
  }

};
