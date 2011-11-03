/*global $: false, kanso: true*/

/**
 * Widgets define the way a Field object is displayed when rendered as part of a
 * Form. Changing a Field's widget will be reflected in the admin app.
 *
 * @module
 */

var _ = require('underscore')._;

var modules = [
    './actions.core', './actions.dialog', './actions.embed'
];

_.reduce(modules, function (a, m) {
    return _.extend(a, require(m));
}, exports);

