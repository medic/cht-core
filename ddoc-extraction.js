var db = require('./db'),
    async = require('async'),
    _ = require('underscore');

var getMasterDdoc = function(callback) {
  db.medic.get('_design/medic', function(err, ddoc) {
    // explitly call the callback with just these two params. Couch passes more
    // params to the callback, and we don't want those feeding into async.waterfall
    callback(err, ddoc);
  });
};

var extractDdocs = function(ddoc, callback) {
  var attachmentNames = Object.keys(ddoc._attachments).filter(function(name) {
    // return name.startsWith('ddocs/compiled/'); // for nodejs > 0.12
    return name.indexOf('ddocs/compiled/') === 0;
  });

  callback(null, ddoc._rev, attachmentNames);
};

var ddocNameFromAttachmentName = function(attachmentName) {
  var designDocNameFromFilePath = /ddocs\/compiled\/(.+)\.json/;
  return '_design/' + designDocNameFromFilePath.exec(attachmentName)[1];
};

var updateIfRequired = function(masterRevision, attachmentName, callback) {
  var ddocName = ddocNameFromAttachmentName(attachmentName);

  db.medic.get(ddocName, function(ddocErr, ddoc) {
    if (ddocErr && ddocErr.error !== 'not_found') {
      return callback(ddocErr);
    }

    db.medic.get('_design/medic/'+attachmentName, function(attachErr, attachedDdoc) {
      if (attachErr) {
        return callback(attachErr);
      }

      if (ddoc && ddoc.parentRev === masterRevision) {
        // already up to date
        return callback();
      }

      if (ddoc) {
        // update
        console.log(ddocName + ' may have changed, re-uploading');
        attachedDdoc._rev = ddoc._rev;
      } else {
        // insert
        console.log(ddocName + ' is new, uploading');
      }

      attachedDdoc.parentRev = masterRevision;
      db.medic.insert(attachedDdoc, callback);
    });
  });
};

var updateAll = function(masterRevision, attachmentNames, callback) {
  async.each(attachmentNames, _.partial(updateIfRequired, masterRevision), callback);
};

module.exports = {
  run: function(callback) {
    async.waterfall([ getMasterDdoc, extractDdocs, updateAll ], callback);
  }
};

if (process.env.TEST_ENV) {
  _.extend(module.exports, {
    ddocNameFromAttachmentName: ddocNameFromAttachmentName,
    extractDdocs: extractDdocs,
  });
}
