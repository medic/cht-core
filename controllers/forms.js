var openrosaFormList = require('openrosa-formlist'),
    db = require('../db');

// removes form: prefix on form docs
function removePrefix(str) {
  return str.split(':').slice(1).join(':');
}

/**
 * Take view data and prepare forms list for openrosa lib call that generates
 * the OpenRosa xformsList compatible XML.  If no xml attachment is on the doc
 * then we skip because there is no xml format available for that form.
 *
 * The template parameter is a url string used to contruct the URL and fetch
 * the form.  Also used as the `downloadURL` property of the forms list so it
 * needs be a URL accessible from the external network since clients will
 * request it.  Note, the {{id}} placeholder string, this is not the FormID on
 * the XForm but the internal/medic unique identifier, these should typically
 * be the same but it is not currently enforced on the database level.
 *
 * Also return the headers for the OpenRosa client otherwise it won't parse the
 * XML (ODK Collect).
 *
 * @name listFormsXML(data, template, callback)
 * @param {Object} data - couchdb view data
 * @param {String} template - url string template
 * @param {Function} callback
 * @api private
 */
function listFormsXML(data, template, callback) {
  var ret = [];
  data.rows.forEach(function(row) {
    if (row.doc && row.doc._attachments && row.doc._attachments.xml) {
      ret.push(
        template.replace('{{id}}', removePrefix(row.doc._id))
      );
    }
  });
  openrosaFormList(ret, function(err, xml) {
    if (err) {
      return callback(err);
    }
    var headers = {
      'Content-Type': 'text/xml; charset=utf-8',
      'X-OpenRosa-Version': '1.0'
    };
    callback(null, xml, headers);
  });
}

/*
 *  Take view data and return simple list of forms in JSON format. The returned
 *  data should be enough information to construct the request for the full
 *  form. e.g. {{form_id}}.{{format}}
 *
 * @name listForms(data, callback)
 * @param {Object} data - couchdb view data
 * @param {Function} callback
 * @api private
 */
function listForms(data, callback) {
  var ret = [];
  data.rows.forEach(function(row) {
    if (row.doc && row.doc._attachments) {
      for (var fmt in row.doc._attachments) {
        ret.push(removePrefix(row.doc._id) + '.' + fmt);
      }
    }
  });
  var headers = {
    'Content-Type': 'application/json; charset=utf-8'
  };
  callback(null, JSON.stringify(ret), headers);
}

module.exports = {
  listForms: function(headers, callback) {
    var format = 'json',
        template;
    if (headers['x-openrosa-version']) {
      format = 'xml';
      template = 'http://%s/api/v1/forms/{{id}}.xml'.replace('%s', headers.host);
    }
    var opts = {
      include_docs: true
    };
    db.medic.view('medic', 'forms', opts, function(err, data) {
      if (err) {
        return callback(err);
      }
      if (format === 'xml') {
        listFormsXML(data, template, callback);
      } else {
        listForms(data, callback);
      }
    });
  },
  getForm: function(form, format, callback) {
    var opts = {
      key: form,
      include_docs: true,
      limit: 1
    };
    db.medic.view('medic', 'forms', opts, function(err, data) {
      if (err) {
        return callback(err);
      }
      if (data.rows.length === 0) {
        return callback(new Error('Form not found.'));
      }
      db.medic.attachment.get(data.rows[0].id, format, function(err, body, headers) {
        if (err) {
          return callback(err);
        }
        //'Content-Type': 'text/xml; charset=utf-8',
        //'Content-Disposition': 'attachment; filename="{{file}}";'
        //  .replace('{{file}}', req.params.form),
        callback(null, body, headers);
      });
    });
  }
};
