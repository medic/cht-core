var _ = require('underscore'),
    phoneNumber = require('phone-number'),
    format = require('../modules/format');

angular.module('inboxControllers').controller('SendMessageCtrl',
  function (
    $q,
    $scope,
    $translate,
    $uibModalInstance,
    ContactSchema,
    Select2Search,
    SendMessage,
    Settings
  ) {
    'ngInject';
    'use strict';

    $scope.error = {};

    var translateRequiredField = function(fieldKey) {
      return $translate(fieldKey).then(function(field) {
        return $translate('field is required', { field: field });
      });
    };

    var validateMessage = function(message) {
      if (message) {
        $scope.error.message = false;
      } else {
        return translateRequiredField('tasks.0.messages.0.message')
          .then(function(error) {
            $scope.error.message = error;
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
        return translateRequiredField('tasks.0.messages.0.to')
          .then(function(error) {
            $scope.error.phone = error;
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
            $scope.error.phone = error;
          });
      }

      $scope.error.phone = false;
    };

    var formatPlace = function(row) {
      return $translate.instant('Everyone at', {
        facility: row.doc.name,
        count: row.descendants && row.descendants.length
      });
    };

    var templateResult = function(row) {
      if (row.text) {
        // Either Select2 detritus such as 'Searching…', or any custom value
        // you enter, such as a raw phone number
        return row.text;
      }

      var type = row.doc.type;
      var icon = ContactSchema.get()[type].icon,
          contact;

      if (row.everyoneAt) {
        // TODO: maybe with everyone at we want to change the icon to something else?
        contact = format.sender({
          name: formatPlace(row),
          parent: row.doc.place
        });
      } else {
        contact = format.sender(row.doc);
      }

      return $('<span class="fa fa-fw ' + icon + '"></span>' + contact);
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
      return Settings().then(function(settings) {
        return Select2Search($phone, ContactSchema.getTypes(), {
          tags: true,
          templateResult: templateResult,
          templateSelection: templateSelection,
          initialValue: initialValue,
          sendMessageExtras: function(results) {
            return _.chain(results)
              .map(function (result) {
                if (result.doc.type === ContactSchema.get().person.type) {
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
              if (!$scope.error.message && !$scope.error.phone) {
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
