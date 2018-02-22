module.exports = function(dependencies) {
  dependencies = dependencies || {};
  var Promise = dependencies.Promise;
  var DB = dependencies.DB;

  function getParent(doc) {
    if (doc.type === 'person' && doc.parent && doc.parent._id) {
      return DB.get(doc.parent._id);
    }
    return Promise.resolve();
  }

  return {
    updateParentContacts: function updateParentContacts(docs) {
      return Promise.all(docs.map(function(doc) {
        return getParent(doc)
          .then(function(parent) {
            var shouldUpdateParentContact = parent && parent.contact && parent.contact._id && parent.contact._id === doc._id;
            if (shouldUpdateParentContact) {
              parent.contact = null;
              return parent;
            }
          });
        }))
        .then(function(parents) {
          return parents.filter(function(parent) {
            return parent;
          });
        });
    },

    getDuplicateErrors: function getDuplicateErrors(docs) {
      var errors = [];
      var dedup = [];
      docs.forEach(function(doc) {
        if (dedup.indexOf(doc._id) !== -1) {
          errors.push({
            error: 'conflict',
            message : 'Duplicate documents to delete, with id ' + doc._id + '. Not deleting to avoid conflict.',
            id: doc._id
          });
        }
        dedup.push(doc._id);
      });
      return errors;
    }
  };
};
