var permissions = require('couchtypes/permissions'),
    _ = require('underscore')._;

/**
 * Checks that the password is set if the new role is _admin
 * We need this check because we need to set the password 
 * in the admin database, and we cannot retrieve it from
 * the user's database because it's encrypted
 *
 * @name adminAndPasswordNotSet()
 * @returns {Function}
 * @api public
 */

exports.adminAndPasswordNotSet = function () {
    return function (newDoc, oldDoc, newValue, oldValue, userCtx) {
        if(newDoc.roles[0] == "_admin" && _.isEmpty(newDoc.password)) {
            throw new Error('Please enter a password when changing the role to Global Admin.');
        }
    };
};

/**
 * Checks if the user has one of the given roles or is the creator of the document
 *
 * @name hasAnyOfTheRolesOrIsCreator(roles)
 * @param {Array} roles
 * @returns {Function}
 * @api public
 */

exports.hasAnyOfTheRolesOrIsCreator = function (expectedRoles) {
    return permissions.any([
        permissions.hasAnyOfTheRoles(expectedRoles),
        permissions.usernameMatchesField('creator')
    ]);
};


/**
 * Checks if the user has one of the given roles and associated facility or is the creator of the document
 *
 * @name hasRolesAndParentFacilityOrIsCreator(roles)
 * @param {Array} roles
 * @returns {Function}
 * @api public
 */

exports.hasRolesAndParentFacilityOrIsCreator = function (expectedRoles) {
    return permissions.any([
        exports.hasRolesAndParentFacility(expectedRoles),
        permissions.usernameMatchesField('creator')
    ]);
};



/**
 * Checks if the user has one of the given roles and is associated with the facility or its parents
 *
 * @name hasRolesAndParentFacility(roles)
 * @param {Array} roles
 * @returns {Function}
 * @api public
 */
 
exports.hasRolesAndParentFacility = function (expectedRoles) {
    return function (newDoc, oldDoc, newValue, oldValue, userCtx) {
        var actualRoles = userCtx ? (userCtx.roles || []): [];
        
        if(actualRoles.indexOf('_admin') >= 0) { return []; }
        
        if(!newDoc) { newDoc = oldDoc; }
        
        if(_.intersect(expectedRoles, actualRoles).length === 0) {
            throw new Error('You must have the appropriate roles.');
        } else {
            var hasFacilityOrParent = false;
            
            _.each(['national_office', 'district_hospital', 'health_center', 'clinic'], function(facility_type) {
                var facility_type = 'kujua.' + facility_type,
                    roles = _.select(actualRoles, function(role) { return !!role[facility_type]; });
                
                if(roles.length) {
                    var role = roles[0][facility_type];
                    if(newDoc['_id'] === role['_id']) {
                        hasFacilityOrParent = true;
                    }
                    
                    var checkParents = function(parent) {
                      while(parent) {
                          if(parent['_id'] === role['_id']) {
                              hasFacilityOrParent = true;
                          }
                          parent = parent.parent;
                      }                      
                    };
                    
                    if(newDoc.related_entities) {
                      checkParents(newDoc.related_entities.clinic);
                    } else {
                      checkParents(newDoc.parent);
                    }
                }
            });

            if(!hasFacilityOrParent) {
                throw new Error('You must be associated with the facility or one of its parents.');
            }
        }
    };
};
