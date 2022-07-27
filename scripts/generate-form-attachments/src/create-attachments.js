const rpn = require('request-promise-native');
const xmlJs = require('xml-js');


const getUrl = (couchUrl, path) => {
  return `${couchUrl.protocol}//${couchUrl.auth}@${couchUrl.host}/${couchUrl.path.substring(1)}/${path}`;
};

const getReports = async (uri, opts) => {
  const result = await rpn.get({ uri, json: true, qs: opts });

  const startKeyDocId = opts.start_key_doc_id || (opts.start_key && JSON.parse(opts.start_key));

  if (!result.rows.length || result.rows.length === 1 && result.rows[0].id === startKeyDocId) {
    return {};
  }

  const reports = result.rows.map(row => row.doc);
  const { key: nextKey, id: nextKeyDocId } = result.rows.slice(-1)[0];

  return { nextKey, nextKeyDocId, reports };
};

const getReportsByForm = async (couchUrl, startKey = '', startKeyDocId = '') => {
  const opts = {
    limit: 1000,
    include_docs: true,
    reduce: false,
  };

  if (startKey) {
    opts.start_key = JSON.stringify(startKey);
    opts.start_key_doc_id = startKeyDocId;
  }

  const uri = getUrl(couchUrl, '_design/medic-client/_view/reports_by_form');
  return getReports(uri, opts, startKeyDocId);
};

const getReportsByAllDocs = async (couchUrl, startKey = '') => {
  const opts = {
    limit: 1000,
    include_docs: true,
    start_key: JSON.stringify(startKey),
  };
  const uri = getUrl(couchUrl, '_all_docs');
  return getReports(uri, opts);
};

const populateXmlFields = (attachmentObj, fieldName, fieldValue, path, hiddenFields = []) => {
  let thisFieldPath = path;
  if (fieldName) {
    thisFieldPath = path ? `${path}.${fieldName}` : fieldName;
  }

  const isHidden = hiddenFields && hiddenFields.includes(thisFieldPath);

  const field = Array.isArray(fieldValue) ? [] : {};

  if (isHidden) {
    field._attributes = { tag: 'hidden' };
  }

  if (Array.isArray(attachmentObj)) {
    attachmentObj.push(field);
  } else {
    attachmentObj[fieldName] = field;
  }

  if (!fieldValue || typeof fieldValue !== 'object') {
    field._text = fieldValue;
    return;
  }

  if (Array.isArray(fieldValue)) {
    fieldValue.forEach(value => {
      populateXmlFields(field, undefined, value, thisFieldPath, hiddenFields);
    });
    return;
  }

  Object.keys(fieldValue).forEach(key => {
    populateXmlFields(field, key, fieldValue[key], thisFieldPath, hiddenFields);
  });
};

const jsonToXml = (doc) => {
  const attachmentJson = {
    [doc.form]: {
      _attributes: {
        'xmlns:jr': 'http://openrosa.org/javarosa',
        'xmlns:orx': 'http://openrosa.org/xforms',
        delimiter: '#',
        id: doc.form,
      }
    }
  };

  Object.keys(doc.fields).forEach(field => {
    populateXmlFields(attachmentJson[doc.form], field, doc.fields[field], '', doc.hidden_fields);
  });

  return xmlJs.js2xml(attachmentJson, { compact: true });
};

const createAttachments = async (couchUrl, reports) => {
  if (!reports || !reports.length) {
    return;
  }

  const updates = reports
    .map(report => {
      if (!report || report.type !== 'data_record' || !report.form) {
        // skip non-reports
        return;
      }
      if (!report.content_type || report.content_type !== 'xml') {
        // skip non-xform reports
        return;
      }
      if (report._attachments && report._attachments.content) {
        // skip reports that already have attachments
        return;
      }
      console.log('generating attachment for', report._id);
      const attachment = jsonToXml(report);
      report._attachments = report._attachments || {};
      report._attachments.content = {
        content_type: 'application/xml',
        data: new Buffer.from(attachment).toString('base64')
      };

      return report;
    })
    .filter(doc => doc);

  if (!updates.length) {
    return;
  }

  await rpn.post({ uri: getUrl(couchUrl, '_bulk_docs'), json: true, body: { docs: updates } });
};

const create = async (couchUrl, allDocs = false) => {
  let startKey;
  let startKeyDocId;
  do {
    let result;
    if (!allDocs) {
      console.debug('requesting reports by view with startkey', startKey, startKeyDocId);
      result = await getReportsByForm(couchUrl, startKey, startKeyDocId);
    } else {
      console.debug('requesting reports by _all_docs with startkey', startKey);
      result = await getReportsByAllDocs(couchUrl, startKey);
    }

    ({ nextKey: startKey, nextKeyDocId: startKeyDocId } = result);

    await createAttachments(couchUrl, result.reports);
  } while (startKey && startKeyDocId);
};

module.exports = { create };
