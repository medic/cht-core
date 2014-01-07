var utils = require('kujua-utils');

module.exports = function(newDoc, oldDoc, userCtx, secObj) {
    var ddoc = this;

    secObj.admins = secObj.admins || {};
    secObj.admins.names = secObj.admins.names || [];
    secObj.admins.roles = secObj.admins.roles || [];

    var IS_DB_ADMIN = false;

    if(~ userCtx.roles.indexOf('_admin')) {
        IS_DB_ADMIN = true;
    }
    if(~ secObj.admins.names.indexOf(userCtx.name)) {
        IS_DB_ADMIN = true;
    }
    for(var i = 0; i < userCtx.roles; i++) {
        if(~ secObj.admins.roles.indexOf(userCtx.roles[i])) {
            IS_DB_ADMIN = true;
        }
    }

    var IS_LOGGED_IN_USER = false;
    if (userCtx.name !== null) {
        IS_LOGGED_IN_USER = true;
    }


    var IS_GATEWAY = userCtx.roles.indexOf('kujua_gateway') !== -1;

    if (IS_GATEWAY && oldDoc && newDoc._deleted) {
        // A gateway user is trying to delete an existing doc. we dont allow this
        throw {'forbidden':'kujua_gateway users are prohibited from deleting docs'};
    }


    var IS_DATAENTRY = userCtx.roles.indexOf('data_entry') !== -1;

    if (IS_DATAENTRY && oldDoc && newDoc._deleted) {
        // A gateway user is trying to delete an existing doc. we dont allow this
        throw {'forbidden':'data_entry users are prohibited from deleting docs'};
    }


    var HAS_APP_ROLE = utils.isUserAdmin(userCtx) || utils.isUserDistrictAdmin(userCtx) || IS_GATEWAY || IS_DATAENTRY;


    if(IS_DB_ADMIN || (IS_LOGGED_IN_USER && HAS_APP_ROLE))
        log('User : ' + userCtx.name + ' changing document: ' +  newDoc._id);
    else
        throw {'forbidden':'Only admins and users with valid roles (national_admin,district_admin or kujua_gateway) can alter documents'};
};
