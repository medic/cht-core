const _ = require('lodash/core');
const phoneNumber = require('@medic/phone-number');
const format = require('../modules/format');

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

    const validateMessage = function(message) {
      if (message) {
        ctrl.error.message = false;
      } else {
        return Translate.fieldIsRequired('tasks.0.messages.0.message')
          .then(function(error) {
            ctrl.error.message = error;
          });
      }
    };

    const validatePhoneNumber = function(settings, data) {
      if (data.everyoneAt) {
        return true;
      }
      if (data.doc) {
        const contact = data.doc.contact || data.doc;
        return contact && phoneNumber.validate(settings, contact.phone);
      }
      return phoneNumber.validate(settings, data.id);
    };

    const validatePhoneNumbers = function(settings, recipients) {

      // recipients is mandatory
      if (!recipients || recipients.length === 0) {
        return Translate.fieldIsRequired('tasks.0.messages.0.to')
          .then(function(error) {
            ctrl.error.phone = error;
          });
      }

      // all recipients must have a valid phone number
      const errors = _.filter(recipients, function(data) {
        return !validatePhoneNumber(settings, data);
      });
      if (errors.length > 0) {
        const errorRecipients = _.map(errors, function(error) {
          return templateSelection(error);
        }).join(', ');
        return $translate('Invalid contact numbers', { recipients: errorRecipients })
          .then(function(error) {
            ctrl.error.phone = error;
          });
      }

      ctrl.error.phone = false;
    };

    const formatPlace = function(row) {
      return $translate.instant('Everyone at', {
        facility: row.doc.name,
        count: row.descendants && row.descendants.length
      });
    };

    const templateResult = function(contactTypes, row) {
      if (row.text) {
        // Either Select2 detritus such as 'Searching…', or any custom value
        // you enter, such as a raw phone number
        return row.text;
      }

      const typeId = ContactTypes.getTypeId(row.doc);
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

    const templateSelection = function(row) {
      if (!row.doc) {
        return row.text;
      }

      if (row.everyoneAt) {
        return formatPlace(row);
      }

      // TODO: should this be first_name / last_name as well? How does this work?
      return row.doc.name || row.doc.phone;
    };

    const initPhoneField = function($phone, initialValue) {
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
              const messages = [...results];
              results.forEach(result => {
                if (personTypes.includes(ContactTypes.getTypeId(result.doc))) {
                  return;
                }
                messages.push({
                  id: 'everyoneAt:' + result.id,
                  doc: result.doc,
                  everyoneAt: true
                });
              });

              return messages.filter(message => validatePhoneNumber(settings, message));
            }
          });
        });
    };

    $uibModalInstance.rendered.then(function() {
      const to = $scope.model.to;
      const $modal = $('#send-message');
      const phoneField = $modal.find('[name=phone]');
      $modal.find('.count').text('');
      initPhoneField(phoneField, to);
    });

    ctrl.cancel = function() {
      $uibModalInstance.dismiss();
    };

    ctrl.submit = function() {
      $scope.setProcessing();
      Settings()
        .then(function(settings) {
          const message = $scope.model.message && $scope.model.message.trim();
          const recipients = $('#send-message [name=phone]').select2('data');
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
