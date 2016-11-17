var utils = require('kujua-utils'),
    ADMIN_ONLY_TYPES = [ 'form', 'translations' ],
    ADMIN_ONLY_IDS = [ 'resources', 'appcache', 'zscore-charts' ];

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

var allowed = function(newDoc, oldDoc, userCtx, secObj) {

  // ensure logged in
  if (!userCtx.name) {
    return {
      allowed: false,
      message: 'You must be logged in to edit documents'
    };
  }

  // admins can do anything
  if (isDbAdmin(userCtx, secObj) || utils.isUserAdmin(userCtx)) {
    return {
      allowed: true
    };
  }

  if (isAdminOnlyDoc(newDoc)) {
    return {
      allowed: false,
      message: 'You are not authorized to edit admin only docs'
    };
  }

  if (userCtx.facility_id === newDoc._id) {
    return {
      allowed: false,
      message: 'You are not authorized to edit your own place'
    };
  }

  // district admins can do almost anything
  if (utils.isUserDistrictAdmin(userCtx)) {
    return {
      allowed: true
    };
  }

  // only admins can delete
  if (oldDoc && newDoc._deleted) {
    return {
      allowed: false,
      message: 'You must be an admin to delete docs'
    };
  }

  // gateway and data_entry users can update
  if (utils.hasRole(userCtx, 'kujua_gateway') ||
      utils.hasRole(userCtx, 'data_entry')) {
    return {
      allowed: true
    };
  }

  // none of the above
  return {
    allowed: false,
    message: 'You must be an admin, gateway, or data entry user to edit documents'
  };
};

/**
 * Ensure that type='form' documents are created with correctly formatted _id
 * property.
 */
var validateForm = function(newDoc) {
  var id_parts = newDoc._id.split(':'),
      prefix = id_parts[0],
      form_id = id_parts.slice(1).join(':');
  function _err(msg) {
    throw({ forbidden: msg + ' e.g. "form:registration"' });
  }
  if (prefix !== 'form') {
    _err('_id property must be prefixed with "form:".');
  }
  if (!form_id) {
    _err('_id property must define a value after "form:".');
  }
  if (newDoc._id !== newDoc._id.toLowerCase()) {
    _err('_id property must be lower case.');
  }
};

var validatePerson = function(newDoc) {
  if(!newDoc.reported_date) {
    throw({ forbidden:'reported_date property must be set.' });
  }
};

var validateUserSettings = function(newDoc) {
  var id_parts = newDoc._id.split(':'),
      prefix = id_parts[0],
      username = id_parts.slice(1).join(':'),
      idExample = ' e.g. "org.couchdb.user:sally"';
  function _err(msg) {
    throw({ forbidden: msg });
  }
  if (prefix !== 'org.couchdb.user') {
    _err('_id must be prefixed with "org.couchdb.user:".' + idExample);
  }
  if (!username) {
    _err('_id must define a value after "org.couchdb.user:".' + idExample);
  }
  if (newDoc._id !== newDoc._id.toLowerCase()) {
    _err('_id must be lower case.' + idExample);
  }
  if (typeof newDoc.name === 'undefined' || newDoc.name !== username) {
    _err('name property must be equivalent to username.' + idExample);
  }
  if (newDoc.name.toLowerCase() !== username.toLowerCase()) {
    _err('name must be equivalent to username');
  }
  if (typeof newDoc.known !== 'undefined' && typeof newDoc.known !== 'boolean') {
    _err('known is not a boolean.');
  }
  if (typeof newDoc.roles !== 'object') {
    _err('roles is a required array');
  }
};

module.exports = {
  _allowed: allowed,
  _validateForm: validateForm,
  _validatePerson: validatePerson,
  _validateUserSettings: validateUserSettings,
  validate_doc_update: function(newDoc, oldDoc, userCtx, secObj) {
    var self = module.exports,
        result = self._allowed(newDoc, oldDoc, userCtx, secObj);
    if (result.allowed) {
        log('User "' + userCtx.name + '" changing document "' +  newDoc._id + '"');
    } else {
        throw({ forbidden: result.message });
    }
    if (newDoc.type === 'person') {
        self._validatePerson(newDoc);
    }
    if (newDoc.type === 'form') {
        self._validateForm(newDoc);
    }
    if (newDoc.type === 'user-settings') {
        self._validateUserSettings(newDoc);
    }
  }
};
