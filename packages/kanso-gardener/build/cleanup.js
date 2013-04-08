var fs = fs = require('fs');
var path = require('path');

module.exports = {
    after: 'modules/attachment',
    run: function (root, path_stuff, settings, doc, callback) {

        return callback(null, doc);

    }
};