const { Contact, Qualifier } = require('@medic/cht-datasource');

module.exports = function(dependencies) {
  dependencies = dependencies || {};
  const Promise = dependencies.Promise;

  const getParent = (doc) => {
    const parentId = doc.parent && doc.parent._id;
    if (!parentId) {
      return Promise.resolve();
    }
    const getContact = dependencies.dataContext.bind(Contact.v1.get);
    return getContact(Qualifier.byUuid(parentId));
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
