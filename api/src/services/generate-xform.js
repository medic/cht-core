const childProcess = require('child_process');
const path = require('path');
const logger = require('../logger');

const STYLESHEET_DIR = path.join(__dirname, '../../node_modules/enketo-xslt/xsl');
const FORM_STYLESHEET = path.join(STYLESHEET_DIR, 'openrosa2html5form.xsl');
const MODEL_STYLESHEET = path.join(STYLESHEET_DIR, 'openrosa2xmlmodel.xsl');

const ROOT_OPEN = '<root xmlns:xf="http://www.w3.org/2002/xforms" xmlns:orx="http://openrosa.org/xforms" xmlns:enk="http://enketo.org/xforms" xmlns:kb="http://kobotoolbox.org/xforms" xmlns:esri="http://esri.com/xforms" xmlns:oc="http://openclinica.org/xforms" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:jr="http://openrosa.org/javarosa">';
const MODEL_ROOT_OPEN = '<root xmlns="http://www.w3.org/2002/xforms" xmlns:xf="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:xsd="http://www.w3.org/2001/XMLSchema">';
const ROOT_CLOSE = '</root>';

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

const removeRootNode = xml => xml.replace(ROOT_OPEN, '').replace(ROOT_CLOSE, '').replace(MODEL_ROOT_OPEN, '');

const generateAll = formXml => {
  return Promise.all([
    transform(formXml, FORM_STYLESHEET),
    transform(formXml, MODEL_STYLESHEET),
  ])
    .then(([ form, model ]) => ({
      form: removeRootNode(form),
      model: removeRootNode(model),
    }));
};

module.exports = {
  generate: formXml => {
    return generateAll(formXml);
  }
};
