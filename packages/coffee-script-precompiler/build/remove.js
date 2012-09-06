(function() {
  module.exports = {
    after: "attachments",
    run: function(root, path, settings, doc, callback) {
      var k;
      for (k in doc._attachments || {}) {
        if (/\.coffee$/.test(k)) {
          delete doc._attachments[k];
        }
      }
      return callback(null, doc);
    }
  };
}).call(this);
