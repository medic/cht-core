const { Readable } = require('stream');
const openrosaFormList = require('openrosa-formlist');
const auth = require('../auth');
const serverUtils = require('../server-utils');
const formsService = require('../services/forms');
const generateXform = require('../services/generate-xform');
const logger = require('../logger');

const XML_RESPONSE_HEADERS = {
  'Content-Type': 'text/xml; charset=utf-8',
  'X-OpenRosa-Version': '1.0',
};

const JSON_RESPONSE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
};

const isCollectForm = doc => doc && doc.context && doc.context.collect;

// Take view data and prepare forms list for openrosa lib call that generates
// the OpenRosa xformsList compatible XML.
//
// Forms are skipped if:
// - no xml attachment is on the doc (presumably it's a JSON form)
// - the doc does not have the `context.collect` property set - presumably it's
//   an in-app form rather than one designed for medic-collect.
//
// @param {Object} data - couchdb view data
// @param {Object} req - the request object
const listFormsXML = (forms, req) => {
  const downloadUrl = `${req.protocol}://${req.headers.host}/api/v1/forms/` + '${formId}.xml'; // formId is replaced by openrosaFormList
  const xmls = forms
    .filter(form => isCollectForm(form))
    .map(form => formsService.getXFormAttachment(form))
    .filter(attachment => !!attachment)
    .map(attachment => Readable.from(attachment.data));

  return new Promise((resolve, reject) => {
    openrosaFormList(xmls, { downloadUrl }, (err, xml) => {
      if (err) {
        return reject(err);
      }
      resolve(xml);
    });
  });
};

// Take view data and return simple list of forms in JSON format. The returned
// data should be enough information to construct the request for the full
// form. e.g. {{form_id}}.{{format}}
//
// @param {Object} data - couchdb view data
const listFormsJSON = forms => {
  return JSON.stringify(forms.map(form => form.internalId + '.xml'));
};

module.exports = {
  list: (req, res) => {
    if (!req.userCtx) {
      return serverUtils.notLoggedIn(req, res);
    }
    return formsService.getFormDocs()
      .then(forms => {
        if (req.headers['x-openrosa-version']) {
          return listFormsXML(forms, req).then(xml => {
            res.writeHead(200, XML_RESPONSE_HEADERS);
            res.end(xml);
          });
        }
        res.writeHead(200, JSON_RESPONSE_HEADERS);
        res.end(listFormsJSON(forms));
      })
      .catch(err => serverUtils.error(err, req, res));
  },
  get: (req, res) => {
    if (!req.userCtx) {
      return serverUtils.notLoggedIn(req, res);
    }

    const parts = req.params.form.split('.');
    const form = parts.slice(0, -1).join('.');
    const format = parts.slice(-1)[0];
    if (!form) {
      const error = {
        code: 400,
        message: `Invalid form name (form="${form}", format="${format}")`,
      };
      return serverUtils.error(error, req, res);
    }
    if (format !== 'xml') {
      const error = {
        code: 400,
        message: `Invalid file format (format="${format}")`,
      };
      return serverUtils.error(error, req, res);
    }
    return formsService
      .getFormDocs()
      .then(docs => docs.find(doc => doc.internalId === form))
      .then(doc => formsService.getXFormAttachment(doc))
      .then(attachment => {
        if (!attachment) {
          return Promise.reject({
            code: 404,
            message: `Form not found: ${form} (${format})`,
          });
        }
        res.writeHead(200, { 'Content-Type': attachment.content_type });
        res.end(attachment.data);
      })
      .catch(err => serverUtils.error(err, req, res));
  },
  validate: (req, res) => {
    return auth
      .check(req, 'can_configure')
      .then(() => generateXform.generate(req.body))
      .then(() => res.json({ok: true}))
      .catch(err => {
        logger.error('Error validating XForm - ' + err.message);
        res.status(err.code || 400).json({error: err.message});
      });
  },
};
