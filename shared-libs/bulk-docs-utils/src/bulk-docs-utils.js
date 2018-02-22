module.exports = function(dependencies) {
  dependencies = dependencies || {};
  var Promise = dependencies.Promise;
  var DB = dependencies.DB;
  var log = dependencies.log;

  function getParent(doc) {
    if (doc.type === 'person' && doc.parent && doc.parent._id) {
      return DB.get(doc.parent._id);
    }
    return Promise.resolve();
  }

  return {
    updateParentContacts: function updateParentContacts(docs) {
      return Promise.all(docs.map(function(doc) {
        return getParent(Promise, DB, doc)
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

    checkForDuplicates: function checkForDuplicates(docs) {
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
      if (errors.length) {
        log.error('Deletion errors', errors);
        throw new Error('Deletion error');
      }
    }
  };
};
