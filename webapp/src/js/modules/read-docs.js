module.exports = {
  id: function(doc) {
    const type = doc.form ? 'report' : 'message';
    return [ 'read', type, doc._id ].join(':');
  }
};
