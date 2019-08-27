var _ = require('underscore'),
    phoneNumber = require('@medic/phone-number'),
    format = require('../modules/format');

angular.module('inboxControllers').controller('SendMessageCtrl',
  function (
    $q,
    $scope,
    $translate,
    $uibModalInstance,
    ContactTypes,
    Select2Search,
    SendMessage,
    Settings,
    Translate
  ) {
    'ngInject';
    'use strict';

    const ctrl = this;
    ctrl.error = {};

    var validateMessage = function(message) {
      if (message) {
        ctrl.error.message = false;
      } else {
        return Translate.fieldIsRequired('tasks.0.messages.0.message')
          .then(function(error) {
            ctrl.error.message = error;
          });
      }
    };

    var validatePhoneNumber = function(settings, data) {
      if (data.everyoneAt) {
        return true;
      }
      if (data.doc) {
        var contact = data.doc.contact || data.doc;
        return contact && phoneNumber.validate(settings, contact.phone);
      }
      return phoneNumber.validate(settings, data.id);
    };

    var validatePhoneNumbers = function(settings, recipients) {

      // recipients is mandatory
      if (!recipients || recipients.length === 0) {
        return Translate.fieldIsRequired('tasks.0.messages.0.to')
          .then(function(error) {
            ctrl.error.phone = error;
          });
      }

      // all recipients must have a valid phone number
      var errors = _.filter(recipients, function(data) {
        return !validatePhoneNumber(settings, data);
      });
      if (errors.length > 0) {
        var errorRecipients = _.map(errors, function(error) {
          return templateSelection(error);
        }).join(', ');
        return $translate('Invalid contact numbers', { recipients: errorRecipients })
          .then(function(error) {
            ctrl.error.phone = error;
          });
      }

      ctrl.error.phone = false;
    };

    var formatPlace = function(row) {
      return $translate.instant('Everyone at', {
        facility: row.doc.name,
        count: row.descendants && row.descendants.length
      });
    };

    var templateResult = function(contactTypes, row) {
      if (row.text) {
        // Either Select2 detritus such as 'Searching…', or any custom value
        // you enter, such as a raw phone number
        return row.text;
      }

      const typeId = row.doc.contact_type || row.doc.type;
      const type = contactTypes.find(type => type.id === typeId);

      let contact;
      if (row.everyoneAt) {
        // TODO: maybe with everyone at we want to change the icon to something else?
        contact = format.sender({
          name: formatPlace(row),
          parent: row.doc.place
        });
      } else {
        contact = format.sender(row.doc);
      }

      return $('<span class="fa fa-fw ' + type.icon + '"></span>' + contact);
    };

    var templateSelection = function(row) {
      if (!row.doc) {
        return row.text;
      }

      if (row.everyoneAt) {
        return formatPlace(row);
      }

      // TODO: should this be first_name / last_name as well? How does this work?
      return row.doc.name || row.doc.phone;
    };

    var initPhoneField = function($phone, initialValue) {
      return $q.all([
        Settings(),
        ContactTypes.getAll()
      ])
        .then(results => {
          const settings = results[0];
          const contactTypes = results[1];
          const personTypes = contactTypes
            .filter(type => type.person)
            .map(type => type.id);
          const searchIds = contactTypes.map(type => type.id);
          return Select2Search($phone, searchIds, {
            tags: true,
            templateResult: _.partial(templateResult, contactTypes),
            templateSelection: templateSelection,
            initialValue: initialValue,
            sendMessageExtras: function(results) {
              return _.chain(results)
                .map(function (result) {
                  if (personTypes.includes(result.doc.contact_type || result.doc.type)) {
                    return result;
                  }
                  return [
                    result,
                    {
                      id: 'everyoneAt:' + result.id,
                      doc: result.doc,
                      everyoneAt: true
                    }
                  ];
                })
                .flatten()
                .filter(function(result) {
                  return validatePhoneNumber(settings, result);
                })
                .value();
            }
          });
        });
    };

    $uibModalInstance.rendered.then(function() {
      var to = $scope.model.to;
      var $modal = $('#send-message');
      var phoneField = $modal.find('[name=phone]');
      $modal.find('.count').text('');
      initPhoneField(phoneField, to);
    });

    $scope.cancel = function() {
      $uibModalInstance.dismiss();
    };

    $scope.submit = function() {
      $scope.setProcessing();
      Settings()
        .then(function(settings) {
          var message = $scope.model.message && $scope.model.message.trim();
          var recipients = $('#send-message [name=phone]').select2('data');
          $q.all([
            validateMessage(message),
            validatePhoneNumbers(settings, recipients)
          ])
            .then(function() {
              if (!ctrl.error.message && !ctrl.error.phone) {
                return SendMessage(recipients, message).then(function() {
                  $uibModalInstance.close();
                });
              }
            })
            .then(function() {
              $scope.setFinished();
            });
        })
        .catch(function(err) {
          $scope.setError(err, 'Error sending message');
        });
    };

  }
);
