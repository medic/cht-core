module.exports = function(dependencies) {
  dependencies = dependencies || {};
  var Promise = dependencies.Promise;
  var DB = dependencies.DB;

  function getParent(doc) {
    if (doc.type === 'person' && doc.parent && doc.parent._id) {
      return DB.get(doc.parent._id)
        .catch(function(err) {
          if (err.status === 404) {
            return;
          }
          throw err;
        });
    }
    return Promise.resolve();
  }

  return {
    updateParentContacts: function(docs) {
      var documentByParentId = {};
      return Promise.all(docs.map(function(doc) {
        return getParent(doc)
          .then(function(parent) {
            var shouldUpdateParentContact = parent && parent.contact && parent.contact._id && parent.contact._id === doc._id;
            if (shouldUpdateParentContact) {
              parent.contact = null;
              documentByParentId[parent._id] = doc;
              return parent;
            }
          });
        }))
        .then(function(parents) {
          var docs = parents.filter(function(parent) {
            return parent;
          });
          return {
            docs: docs,
            documentByParentId: documentByParentId
          };
        });
    },

    getDuplicateErrors: function(docs) {
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
