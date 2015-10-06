angular.module('inboxServices').service('ContactForm', [
  '$q', 'ContactSchema', 'DB', 'EnketoTranslation', 'FileReader',
  function($q, ContactSchema, DB, EnketoTranslation, FileReader) {
    var db = DB.get();

    var withAvailableForms = db.query('medic/forms')
      .then(function(res) {
        return _.pluck(res.rows, 'id');
      });

    function getXmlAttachment(doc) {
      return db.getAttachment(doc._id, 'xml')
        .then(FileReader);
    }

    function getFormById(availableForms, id) {
      if (_.contains(availableForms, id)) {
        return db.get(id)
          .then(getXmlAttachment);
      }
    }

    function getFormFor(type, mode, extras) {
      return withAvailableForms
        .then(function(availableForms) {
          return getFormById(availableForms, 'form:contact:' + type + ':' + mode) ||
            getFormById(availableForms, 'form:contact:' + type) ||
            $q.resolve(
              EnketoTranslation.generateXform(ContactSchema.get(type), extras));
        });
    }

    return {
      forCreate: function(type, extras) {
        return getFormFor(type, 'create', extras);
      },
      forEdit: function(type, extras) {
        return getFormFor(type, 'edit', extras);
      },
    };
  }
]);
