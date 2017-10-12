module.exports = {
  id: function(doc) {
    var type = doc.form ? 'report' : 'message';
    return [ 'read', type, doc._id ].join(':');
  }
};
