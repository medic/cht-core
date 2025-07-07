module.exports = function(dependencies) {
  dependencies = dependencies || {};
  const Promise = dependencies.Promise;
  const dataContext = dependencies.dataContext;
  const { Contact, Qualifier } = require('@medic/cht-datasource');

  const getParent = (doc) => {
    const parentId = doc.parent && doc.parent._id;
    if (!parentId) {
      return Promise.resolve();
    }
    return dataContext.bind(Contact.v1.get)(Qualifier.byUuid(parentId))
      .then(parent => {
        if (!parent) {
          return;
        }
        return parent;
      });
  };

  return {
    updateParentContacts: function(docs) {
      const documentByParentId = {};
      return Promise.all(docs.map(function(doc) {
        return getParent(doc)
          .then(function(parent) {
            const shouldUpdateParentContact = parent && parent.contact &&
              parent.contact._id && parent.contact._id === doc._id;
            if (shouldUpdateParentContact) {
              parent.contact = null;
              documentByParentId[parent._id] = doc;
              return parent;
            }
          });
      }))
        .then(function(parents) {
          const docs = parents.filter(function(parent) {
            return parent;
          });
          return {
            docs: docs,
            documentByParentId: documentByParentId
          };
        });
    },

    getDuplicateErrors: function(docs) {
      const errors = [];
      const dedup = [];
      docs.forEach(function(doc) {
        if (dedup.indexOf(doc._id) !== -1) {
          errors.push({
            error: 'conflict',
            message: 'Duplicate documents to delete, with id ' + doc._id + '. Not deleting to avoid conflict.',
            id: doc._id
          });
        }
        dedup.push(doc._id);
      });
      return errors;
    }
  };
};
