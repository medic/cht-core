const openrosaFormList = require('openrosa-formlist'),
  serverUtils = require('../server-utils'),
  db = require('../db-pouch');

const XML_RESPONSE_HEADERS = {
  'Content-Type': 'text/xml; charset=utf-8',
  'X-OpenRosa-Version': '1.0',
};

const JSON_RESPONSE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
};

// removes "form:" prefix on form docs
const removePrefix = str => str.replace(/^form:/, '');

const isXMLForm = doc => doc && doc._attachments && doc._attachments.xml;

const isCollectForm = doc => doc && doc.context && doc.context.collect;

/**
 * Take view data and prepare forms list for openrosa lib call that generates
 * the OpenRosa xformsList compatible XML.
 *
 * Forms are skipped if:
 * - no xml attachment is on the doc (presumably it's a JSON form)
 * - the doc does not have the `context.collect` property set - presumably it's
 *   an in-app form rather than one designed for medic-collect.
 *
 * @param {Object} data - couchdb view data
 * @param {Object} req - the request object
 * @api private
 */
const listFormsXML = (data, req) => {
  const urls = data.rows
    .filter(row => isXMLForm(row.doc) && isCollectForm(row.doc))
    .map(
      row =>
        `${req.protocol}://${req.headers.host}/api/v1/forms/${
          row.doc.internalId
        }.xml`
    );
  return new Promise((resolve, reject) => {
    openrosaFormList(urls, (err, xml) => {
      if (err) {
        return reject(err);
      }
      resolve(xml);
    });
  });
};

/*
 * Take view data and return simple list of forms in JSON format. The returned
 * data should be enough information to construct the request for the full
 * form. e.g. {{form_id}}.{{format}}
 *
 * @param {Object} data - couchdb view data
 * @api private
 */
const listFormsJSON = data => {
  const forms = data.rows
    .filter(row => isXMLForm(row.doc))
    .map(row => removePrefix(row.doc._id) + '.xml');
  return JSON.stringify(forms);
};

const getFormAttachment = (form, format) => {
  const opts = {
    key: form,
    limit: 1,
    include_docs: true,
    attachments: true,
    binary: true,
  };
  return db.medic.query('medic-client/forms', opts).then(data => {
    return (
      data.rows.length &&
      data.rows[0].doc &&
      data.rows[0].doc._attachments &&
      data.rows[0].doc._attachments[format]
    );
  });
};

module.exports = {
  list: (req, res) => {
    return db.medic
      .query('medic-client/forms', { include_docs: true })
      .then(data => {
        if (req.headers['x-openrosa-version']) {
          return listFormsXML(data, req).then(xml => {
            res.writeHead(200, XML_RESPONSE_HEADERS);
            res.end(xml);
          });
        } else {
          res.writeHead(200, JSON_RESPONSE_HEADERS);
          res.end(listFormsJSON(data));
        }
      })
      .catch(err => serverUtils.error(err, req, res));
  },
  get: (req, res) => {
    const parts = req.params.form.split('.'),
      form = parts.slice(0, -1).join('.'),
      format = parts.slice(-1)[0];
    if (!form || !format) {
      const error = {
        code: 400,
        message: `Invalid form parameter (form="${form}", format="${format}")`,
      };
      return serverUtils.error(error, req, res);
    }
    return getFormAttachment(form, format)
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
};
