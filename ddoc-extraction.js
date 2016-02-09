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

  console.log('Found ' + attachmentNames.length + ' attached ddocs');

  callback(null, ddoc._rev, attachmentNames);
};

var ddocNameFromAttachmentName = function(attachmentName) {
  var designDocNameFromFilePath = /ddocs\/compiled\/(.+)\.json/;
  return '_design/' + designDocNameFromFilePath.exec(attachmentName)[1];
};

var updateIfRequired = function(masterRevision, attachmentName, callback) {
  var ddocName = ddocNameFromAttachmentName(attachmentName);

  console.log('Looking at', attachmentName);

  db.medic.get(ddocName, function(ddocErr, ddoc) {
    if (ddocErr && ddocErr.error !== 'not_found') {
      callback(ddocErr);
    } else {
      db.medic.get('_design/medic/'+attachmentName, function(attachErr, attachedDdoc) {
        if (attachErr) {
          callback(attachErr);
        } {
          if (ddocErr && ddocErr.error === 'not_found') {
            console.log(ddocName + ' is new, uploading');

            attachedDdoc.parentRev = masterRevision;
            db.medic.insert(attachedDdoc, callback);
          } else if (ddoc && ddoc.parentRev !== masterRevision) {
            console.log(ddocName + ' may have changed, uploading');

            attachedDdoc._rev = ddoc._rev;
            attachedDdoc.parentRev = masterRevision;
            db.medic.insert(attachedDdoc, callback);
          } else {
            console.log(ddocName + ' has not changed');
            callback();
          }
        }
      });
    }
  });
};

module.exports = {
  run: function(runComplete) {
    console.log('Extracting ddocs…');

    async.waterfall([
        getMasterDdoc,
        extractDdocs,
        function(masterRevision, attachmentNames, callback) {
          async.each(
            attachmentNames,
            _.partial(updateIfRequired, masterRevision),
            callback);
        }
      ], function(err) {
        if (err) {
          console.log('Something went wrong trying to extract ddocs', err, console.trace());
        } else {
          console.log('…Done');
        }
        runComplete(err);
      });
  }
};

if (process.env.TEST_ENV) {
  _.extend(module.exports, {
    ddocNameFromAttachmentName: ddocNameFromAttachmentName,
    extractDdocs: extractDdocs,
  });
}
