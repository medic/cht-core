var utils = require('kujua-utils');

var isDbAdmin = function(userCtx, secObj) {
    if(~ userCtx.roles.indexOf('_admin')) {
        return true;
    }

    if (secObj.admins && secObj.admins.names
        && ~secObj.admins.names.indexOf(userCtx.name)) {
        return true;
    }

    if (secObj.admins && secObj.admins.roles) {
        for(var i = 0; i < userCtx.roles; i++) {
            if(~ secObj.admins.roles.indexOf(userCtx.roles[i])) {
                return true;
            }
        }
    }

    return false;
};

var allowed = function(newDoc, oldDoc, userCtx, secObj) {

    // ensure logged in
    if (userCtx.name === null) {
        return {
            allowed: false,
            message: 'You must be logged in to edit documents'
        };
    }

    // admins can do anything
    if (isDbAdmin(userCtx, secObj)
        || utils.isUserAdmin(userCtx)
        || utils.isUserDistrictAdmin(userCtx)) {
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
    if (utils.hasRole(userCtx, 'kujua_gateway')
        || utils.hasRole(userCtx, 'data_entry')) {
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

module.exports = function(newDoc, oldDoc, userCtx, secObj) {
    var result = allowed(newDoc, oldDoc, userCtx, secObj);
    if (result.allowed) {
        log("User '" + userCtx.name + "' changing document '" +  newDoc._id + "'");
    } else {
        throw { forbidden: result.message };
    }
};
