var _ = require('underscore'),
    libphonenumber = require('libphonenumber/utils'),
    format = require('./format');

(function () {

  'use strict';

  var validateMessage = function(message) {
    return {
      valid: !!message,
      message: translateFn('field is required', {
        field: translateFn('tasks.0.messages.0.message')
      }),
      value: message,
    };
  };

  var validatePhoneNumber = function(data) {
    if (data.everyoneAt) {
      return true;
    }
    if (data.doc) {
      var contact = data.doc.contact || data.doc;
      return contact && libphonenumber.validate(settings, contact.phone);
    }
    return libphonenumber.validate(settings, data.id);
  };

  var validatePhoneNumbers = function(recipients) {

    // recipients is mandatory
    if (!recipients || recipients.length === 0) {
      return {
        valid: false,
        message: translateFn('field is required', {
          field: translateFn('tasks.0.messages.0.to')
        })
      };
    }

    // all recipients must have a valid phone number
    var errors = _.filter(recipients, function(data) {
      return !validatePhoneNumber(data);
    });
    if (errors.length > 0) {
      var errorRecipients = _.map(errors, function(error) {
        return templateSelection(error);
      }).join(', ');
      return {
        valid: false,
        message: translateFn('Invalid contact numbers', {
          recipients: errorRecipients
        })
      };
    }

    return {
      valid: true,
      message: '',
      value: recipients
    };
  };

  var updateValidation = function(fn, elem, value) {
    var result = fn.call(this, value);
    elem.closest('.form-group')
        .toggleClass('has-error', !result.valid)
        .find('.help-block')
        .text(result.valid ? '' : result.message);
    return result;
  };

  var formatPlace = function(row) {
    return translateFn('Everyone at', {
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
    var icon = CONTACT_SCHEMA[type].icon,
        contact;

    if (row.everyoneAt) {
      // TODO: maybe with everyone at we want to change the icon to something else?
      contact = format.sender({
        name: formatPlace(row),
        parent: row.doc.place
      });
    } else {
      contact = format.contact(row.doc);
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

  var initPhoneField = function($phone, initialValues) {
    return Select2Search($phone, CONTACT_TYPES, {
      tags: true,
      templateResult: templateResult,
      templateSelection: templateSelection,
      initialValues: initialValues,
      sendMessageExtras: function(results) {
        return _.chain(results)
          .map(function (result) {
            if (result.doc.type !== CONTACT_SCHEMA.person.type) {
              return [
                result,
                {
                  id: 'everyoneAt:'+result.id,
                  doc: result.doc,
                  everyoneAt: true
                }];
            } else {
              return result;
            }
          })
          .flatten()
          .filter(validatePhoneNumber)
          .value();
      }
    });
};

  exports.showModal = function(options) {
    options = options || {};


    var $modal = $('#send-message');
    $modal.find('.has-error').removeClass('has-error');
    $modal.find('.help-block').text('');

    var initialTo,
        to = options.to,
        message = options.message || '';

    if (to) {
      if (typeof to === 'string') {
        initialTo = [to];
      } else if (to) {
        initialTo = [to._id];
      }
    }

    var phoneField = $modal.find('[name=phone]');
    $modal.find('[name=message]').val(message);
    $modal.find('.count').text('');
    $modal.modal('show');

    // TODO: should we really be doing this multiple times? Every time show
    //       model is run we re-run the select2 stuff!
    return initPhoneField(phoneField, initialTo);
  };

  var recipients = [];
  var settings = {};
  var Promise;
  var translateFn;
  var Select2Search;
  var CONTACT_TYPES;
  var CONTACT_SCHEMA;
  var DB;

  exports.init = function($q, Settings, _select2Search, _translateFn, _contactTypes, _contactSchema, _db) {
    Promise = $q;
    Select2Search = _select2Search;
    CONTACT_TYPES = _contactTypes;
    translateFn = _translateFn;
    CONTACT_SCHEMA = _contactSchema.get();
    DB = _db;

    Settings()
      .then(function(_settings) {
        settings = _settings;
        $('body').on('click', '.send-message', function(event) {
          var target = $(event.target).closest('.send-message');
          if (target.hasClass('mm-icon-disabled')) {
            return;
          }
          event.preventDefault();
          exports.showModal();
        });
      })
      .catch(function(err) {
        console.error('Failed to retrieve settings', err);
      });
  };

  exports.setRecipients = function(_recipients) {
    recipients = _recipients;
  };

  var resolveRecipients = function(recipients) {
    return Promise.resolve(recipients);
  };

  var validateRecipients = function($modal) {
    var validated = recipients;

    if ($modal.is('.modal')) {
      var $phoneField = $modal.find('[name=phone]');
      var result = updateValidation(
        validatePhoneNumbers, $phoneField, $phoneField.select2('data')
      );
      if (!result.valid) {
        return Promise.resolve(result);
      }
      validated = result.value;
    }

    return resolveRecipients(validated)
      .then(function(recipients) {
        return {
          valid: true,
          value: recipients
        };
      });
  };

  exports.validate = function(target, callback) {

    var $modal = $(target).closest('.message-form');

    if ($modal.find('.submit [disabled]').length) {
      return;
    }

    var $messageField = $modal.find('[name=message]');

    var message = updateValidation(
      validateMessage, $messageField, $messageField.val().trim()
    );

    validateRecipients($modal)
      .then(function(validatedRecipients) {
        if (validatedRecipients.valid && message.valid) {
          callback(validatedRecipients.value, message.value);
        }
      });
  };

}());
