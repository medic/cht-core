/*
  SERVER DOCUMENT VALIDATION

  This is for validating authority. It is against the medic ddoc because it can
  only usefully be run against couchdb.

  For validations around document structure (and for a validate_doc_update script
  that runs on PouchDB) check ddocs/medic-client/validate_doc_update.js.
*/

var utils = require('kujua-utils'),
    ADMIN_ONLY_TYPES = [ 'form', 'translations' ],
    ADMIN_ONLY_IDS = [ 'resources', 'appcache', 'zscore-charts' ];

var _err = function(msg) {
    throw({ forbidden: msg });
};

var isDbAdmin = function(userCtx, secObj) {
  if (userCtx.roles.indexOf('_admin') !== -1) {
    return true;
  }

  if (secObj.admins && secObj.admins.names &&
      secObj.admins.names.indexOf(userCtx.name) !== -1) {
    return true;
  }

  if (secObj.admins && secObj.admins.roles) {
    for (var i = 0; i < userCtx.roles; i++) {
      if (secObj.admins.roles.indexOf(userCtx.roles[i]) !== -1) {
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
  if (isDbAdmin(userCtx, secObj) || utils.isUserAdmin(userCtx)) {
    return;
  }

  if (isAdminOnlyDoc(newDoc)) {
    _err('You are not authorized to edit admin only docs');
  }

  if (userCtx.facility_id === newDoc._id) {
    _err('You are not authorized to edit your own place');
  }

  // district admins can do almost anything
  if (utils.isUserDistrictAdmin(userCtx)) {
    return;
  }

  // only admins can delete
  if (oldDoc && newDoc._deleted) {
      _err('You must be an admin to delete docs');
  }

  // gateway and data_entry users can update
  if (utils.hasRole(userCtx, 'kujua_gateway') ||
      utils.hasRole(userCtx, 'data_entry')) {
    return;
  }

  // none of the above
  _err('You must be an admin, gateway, or data entry user to edit documents');
};

module.exports = {
  validate_doc_update: function(newDoc, oldDoc, userCtx, secObj) {

    checkAuthority(newDoc, oldDoc, userCtx, secObj);

    log('medic validate_doc_update passed for User "' + userCtx.name + '" changing document "' +  newDoc._id + '"');
  }
};
