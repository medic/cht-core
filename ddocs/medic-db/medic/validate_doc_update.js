/*
  SERVER DOCUMENT VALIDATION

  This is for validating authority. It is against the medic ddoc because it can
  only usefully be run against couchdb.

  For validations around document structure (and for a validate_doc_update script
  that runs on PouchDB) check ddocs/medic-client/validate_doc_update.js.
*/
function(newDoc, oldDoc, userCtx, secObj) {

  var ADMIN_ONLY_TYPES = [ 'form', 'translations', 'token_login' ];
  var ADMIN_ONLY_IDS = [
    'resources',
    'service-worker-meta',
    'zscore-charts',
    'settings',
    'branding',
    'partners',
    'privacy-policies',
    'extension-libs',
  ];

  var _err = function(msg) {
    throw({ forbidden: msg });
  };

  var hasRole = function(userCtx, role) {
    if (userCtx.roles) {
      for (var i = 0; i < userCtx.roles.length; i++) {
        if (userCtx.roles[i] === role) {
          return true;
        }
      }
    }
    return false;
  };

  var isDbAdmin = function(userCtx, secObj) {
    if (hasRole(userCtx, '_admin')) {
      return true;
    }

    if (secObj.admins && secObj.admins.names &&
        secObj.admins.names.indexOf(userCtx.name) !== -1) {
      return true;
    }

    if (secObj.admins && secObj.admins.roles) {
      for (var i = 0; i < userCtx.roles; i++) {
        if (hasRole(secObj.admins, userCtx.roles[i])) {
          return true;
        }
      }
    }

    return false;
  };

  var isAdminOnlyDoc = function(doc) {
    return (doc._id && doc._id.indexOf('_design/') === 0) ||
           (doc._id && ADMIN_ONLY_IDS.indexOf(doc._id) !== -1) ||
           (doc.type && ADMIN_ONLY_TYPES.indexOf(doc.type) !== -1);
  };

  var checkAuthority = function(newDoc, oldDoc, userCtx, secObj) {

    // ensure logged in
    if (!userCtx.name) {
      _err('You must be logged in to edit documents');
    }

    // admins can do anything
    if (isDbAdmin(userCtx, secObj)) {
      return;
    }

    if (isAdminOnlyDoc(newDoc)) {
      _err('You are not authorized to edit admin only docs');
    }

    if (userCtx.facility_id === newDoc._id) {
      _err('You are not authorized to edit your own place');
    }
  };

  if (newDoc.purged) {
    // Remove this once we move purging to the server side, for now it is to
    // prevent *client-side* purging from leaking into the server side
    return _err('Purged documents should not be written to CouchDB!');
  }

  checkAuthority(newDoc, oldDoc, userCtx, secObj);
  log('medic validate_doc_update passed for User "' + userCtx.name + '" changing document "' +  newDoc._id + '"');
}
