var _ = require('underscore');

exports.completed = function(doc, key) {
    var transitions = doc.transitions || [];

    return _.contains(transitions, key);
}
