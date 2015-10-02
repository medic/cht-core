angular.module('inboxServices').service('ContactForm', [
  'ContactSchema', 'DB', 'EnketoTranslation', 'FileReader',
  function(ContactSchema, DB, EnketoTranslation, FileReader) {
    var db = DB.get();

    function getXmlAttachment(doc) {
      return db.getAttachment(doc._id, 'xml')
        .then(FileReader);
    }

    function getForm(type, mode, extras) {
      return db.get('form:contact:' + type + ':' + mode)
        .then(getXmlAttachment)
        .catch(function(err) {
          if(err.status === 404) {
            // Couldn't find a specific form for this action, so check for a
            // generic one
            return db.get('form:contact:' + type)
              .then(getXmlAttachment)
              .catch(function(err) {
                if(err.status === 404) {
                  // Couldn't find generic form for this contact type, so generate one
                  return EnketoTranslation.generateXform(ContactSchema.get(type), extras);
                }
                throw err;
              });
          }
          throw err;
        });
    }
    
    // EnketoTranslation.generateXform($scope.unmodifiedSchema[type], { contact:$scope.dependentPersonSchema })

    return {
      forCreate: function(type, extras) {
        return getForm(type, 'create', extras);
      },
      forEdit: function(type, extras) {
        return getForm(type, 'edit', extras);
      },
    };
  }
]);
