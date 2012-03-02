/**
 * Permissions functions are used on both Fields and Types to check a given
 * user is authorized to make a change to a document.
 *
 * @module
 */


/**
 * Module dependencies
 */

var utils = require('couchtypes/utils'),
    _ = require('underscore')._;


/**
 * Field's new value should match current user's name
 *
 * @name matchUsername()
 * @returns {Function}
 * @api public
 */

exports.matchUsername = function () {
    return function (newDoc, oldDoc, newVal, oldVal, userCtx) {
        var name = userCtx.name;
        if (name !== newVal) {
            // if both are empty-like, then consider them the same
            if ((name !== null && name !== undefined && name !== '') ||
                (newVal !== null && newVal !== undefined && newVal !== '')) {
                throw new Error('Field does not match your username');
            }
        }
    };
};

/**
 * Checks if the user has a specific role
 *
 * @name hasRole(role)
 * @param {String} role
 * @returns {Function}
 * @api public
 */

exports.hasRole = function (role) {
    return function (newDoc, oldDoc, newVal, oldVal, userCtx) {
        var roles = userCtx ? (userCtx.roles || []): [];
        if (!_.include(roles, role)) {
            throw new Error('User must have "' + role + '" role.');
        }
    };
};

/**
 * Checks if the user has one of the given roles
 *
 * @name hasAnyOfTheRoles(roles)
 * @param {Array} roles
 * @returns {Function}
 * @api public
 */

exports.hasAnyOfTheRoles = function (expectedRoles) {
    return function (newDoc, oldDoc, newVal, oldVal, userCtx) {
        var actualRoles = userCtx ? (userCtx.roles || []): [];
        if (_.intersect(expectedRoles, actualRoles).length === 0) {
            throw new Error('You must have the appropriate roles.');
        }
    };
};


/**
 * The value of this field should never change after the document has been
 * created.
 *
 * @name fieldUneditable()
 * @param {Boolean} disallow_admin - whether users with _admin role should be
 *                                   also be prevented from editing the field
 * @returns {Function}
 * @api public
 */

exports.fieldUneditable = function (disallow_admin) {
    return function (newDoc, oldDoc, newValue, oldValue, userCtx) {
        if (oldDoc) {
            var roles = userCtx ? (userCtx.roles || []): [];
            if (_.include(roles, '_admin')) {
                if (!disallow_admin) {
                    return;
                }
            }
            if (newValue !== oldValue) {
                throw new Error('Field cannot be edited once created');
            }
        }
    };
};

/**
 * User's name should match the *old* value of the given field. A field can be
 * specified using a string or an array of strings (like a path).
 *
 * <pre>
 * eg: usernameMatchesField('creator')
 *     usernameMatchesField(['meta','creator'])
 *
 *     {
 *         creator: 'name',
 *         meta: {creator: 'name2'}
 *     }
 * </pre>
 *
 * @name usernameMatchesField(path)
 * @param {String | Array} path
 * @returns {Function}
 * @api public
 */

exports.usernameMatchesField = function (path) {
    if (!_.isArray(path)) {
        path = [path];
    }
    return function (newDoc, oldDoc, newValue, oldValue, userCtx) {
        var field = utils.getPropertyPath(oldDoc, path);
        if (userCtx.name !== field) {
            throw new Error('Username does not match field ' + path.join('.'));
        }
    };
};

/**
 * Checks that user's context has a username
 *
 * @name loggedIn()
 * @returns {Function}
 * @api public
 */

exports.loggedIn = function () {
    return function (newDoc, oldDoc, newValue, oldValue, userCtx) {
        if (!userCtx || !userCtx.name) {
            throw new Error('You must be logged in');
        }
    };
};

/**
 * Runs an array of permissions functions and checks that all of them pass,
 * returning all failures.
 *
 * @name all(perms)
 * @param {Array} perms
 * @returns {Function}
 * @api public
 */

exports.all = function (perms) {
    return function () {
        var args = arguments;
        return _.reduce(perms, function (errs, p) {
            return errs.concat(utils.getErrors(p, args));
        }, []);
    };
};

/**
 * Tests to see if any one permission function passes, returning on the
 * first success. If all permissions fail, then all errors are returned.
 *
 * @name any(perms)
 * @param {Array} perms
 * @api public
 */

exports.any = function (perms) {
    return function () {
        var errs = [];
        for (var i = 0, len = perms.length; i < len; i++) {
            try {
                var p_errs = (perms[i].apply(this, arguments) || []);
                errs = errs.concat(p_errs);
                if (!p_errs.length) {
                    // return as soon as one passes
                    return [];
                }
            }
            catch (e) {
                // store the first error to re-throw if none pass
                errs.push(e);
            }
        }
        return errs;
    };
};

/**
 * Treat new and old values like new documents of a given type, and attempt to
 * authorize the value against the type's permissions. Useful when handling
 * permissions for an embedded type.
 *
 * Can be combined with permissions.any or permissions.all to extend the
 * permissions for an embedded type field. For example, the following might
 * allow both the owner of the parent document and the owner of the comment
 * itself to remove it.
 *
 * <pre><code class="javascript">
 *     comment: fields.embed({
 *         type: types.comment,
 *         permissions: {
 *             remove: permissions.any([
 *                 permissions.usernameMatchesField('creator'),
 *                 permissions.inherit(types.comment)
 *             ])
 *         }
 *     });
 * </code></pre>
 *
 * @name inherit(type)
 * @param {Type} type
 * @api public
 */

exports.inherit = function (type) {
    return function (newDoc, oldDoc, newValue, oldValue, userCtx) {
        return type.authorize(newValue || {_deleted: true}, oldValue, userCtx);
    };
};
