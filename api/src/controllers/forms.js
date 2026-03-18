const { Readable } = require('stream');
const openrosaFormList = require('openrosa-formlist');
const auth = require('../auth');
const serverUtils = require('../server-utils');
const formsService = require('../services/forms');
const generateXform = require('../services/generate-xform');
const logger = require('@medic/logger');

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

/**
 * @openapi
 * tags:
 *   - name: Forms
 *     description: Operations for XForms
 */
module.exports = {
  /**
   * @openapi
   * /api/v1/forms:
   *   get:
   *     summary: List installed forms
   *     operationId: v1FormsGet
   *     description: >
   *       Returns a list of currently installed forms. By default returns a JSON array of form filenames. If the
   *       `X-OpenRosa-Version` header is set to `1.0`, returns an OpenRosa xformsList compatible XML response instead.
   *     tags:
   *       - Forms
   *     parameters:
   *       - in: header
   *         name: X-OpenRosa-Version
   *         schema:
   *           enum: ['1.0']
   *         description: If set to "1.0", returns XML formatted forms list compatible with the OpenRosa FormListAPI.
   *     responses:
   *       '200':
   *         description: List of installed forms
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: string
   *               example: ["anc_visit.xml", "anc_registration.xml"]
   *           text/xml:
   *             schema:
   *               type: string
   *               description: OpenRosa xformsList compatible XML.
   *               example: |
   *                 ```.xml
   *                 <?xml version="1.0" encoding="UTF-8"?>
   *                 <xforms xmlns="http://openrosa.org/xforms/xformsList">
   *                   <xform>
   *                     <name>Visit</name>
   *                     <formID>ANCVisit</formID>
   *                     <hash>md5:1f0f096602ed794a264ab67224608cf4</hash>
   *                     <downloadUrl>http://medic.local/api/v1/forms/anc_visit.xml</downloadUrl>
   *                   </xform>
   *                   <xform>
   *                     <name>Registration with LMP</name>
   *                     <formID>PregnancyRegistration</formID>
   *                     <hash>md5:1f0f096602ed794a264ab67224608cf4</hash>
   *                     <downloadUrl>http://medic.local/api/v1/forms/anc_registration.xml</downloadUrl>
   *                   </xform>
   *                   <xform>
   *                     <name>Stop</name>
   *                     <formID>Stop</formID>
   *                     <hash>md5:1f0f096602ed794a264ab67224608cf4</hash>
   *                     <downloadUrl>http://medic.local/api/v1/forms/off.xml</downloadUrl>
   *                   </xform>
   *                 </xforms>
   *                 ```
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   */
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

  /**
   * @openapi
   * /api/v1/forms/{form}:
   *   get:
   *     summary: Get a form definition
   *     operationId: v1FormsFormGet
   *     description: >
   *       Returns the form definition for a given form ID and format. The form parameter should
   *       include the format extension (e.g. `pregnancyregistration.xml`). Currently only `xml`
   *       format is supported.
   *     tags:
   *       - Forms
   *     parameters:
   *       - in: path
   *         name: form
   *         required: true
   *         schema:
   *           type: string
   *         description: "Form identifier with format extension (e.g. `pregnancyregistration.xml`)."
   *     responses:
   *       '200':
   *         description: The form definition
   *         content:
   *           text/xml:
   *             schema:
   *               type: string
   *       '400':
   *         $ref: '#/components/responses/BadRequest'
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '404':
   *         $ref: '#/components/responses/NotFound'
   */
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

  /**
   * @openapi
   * /api/v1/forms/validate:
   *   post:
   *     summary: Validate an XForm
   *     operationId: v1FormsValidatePost
   *     description: >
   *       Validates the XForm XML passed in the request body.
   *     tags:
   *       - Forms
   *     x-since: 3.12.0
   *     x-permissions:
   *       hasAll: [can_configure]
   *     requestBody:
   *       required: true
   *       content:
   *         application/xml:
   *           schema:
   *             type: string
   *             description: The XForm XML to validate.
   *     responses:
   *       '200':
   *         description: Form validation passed
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 ok:
   *                   type: boolean
   *       '400':
   *         description: Form validation failed
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   description: Description of the validation error.
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   */
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
