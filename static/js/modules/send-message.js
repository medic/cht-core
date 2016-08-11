var _ = require('underscore'),
    libphonenumber = require('libphonenumber/utils'),
    format = require('./format');

// TODO: move this to a controller, see:
//   - confirm-modal.js
//   - user-language-modal.js
// For ideas.
// TODO: Split out validation logic so that messages-content can get all that
//       just from the service
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
    // TODO: intergate correct with everyoneAt
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
        return formatSelection(error);
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

  // var formatPlace = function(row) {
  //   // TODO: we have lost count because it's no longer calculated. This currently
  //   // comes back as name - All Contacts. This looks OK, but it may be that
  //   // it's important to know how many people you're sending SMS to. This could
  //   // be hard to fix since we need to essentially check the DB in a blocking
  //   // fashion (no promises for us) but it could be achieved
  //   return translateFn('Everyone at', {
  //     facility: row.doc.name,
  //     count: row.descendants && row.descendants.length
  //   });
  // };

  var formatResult = function(row) {
    if (row.text) {
      return row.text;
    }

    var icon, contact;

    if (!row.doc) {
      icon = CONTACT_SCHEMA.person.icon;
      contact = '<span class="freetext">' + row.id + '</span>';
    } else {
      var type = row.doc.type;
      icon = CONTACT_SCHEMA[type].icon;

      contact = format.contact(row.doc);
      // TODO: detect if this is "everyone at" and display something different maybe?
      // } else {
      //   contact = format.sender({
      //     name: formatPlace(row),
      //     parent: row.parent
      //   });
      // }
    }

    return $('<span class="fa fa-fw ' + icon + '"></span>' +  contact);
  };

  var formatSelection = function(row) {
    if (row.doc) {
      // TODO detect if this is "everyone at" and display something different maybe?
      // if (row.doc.type !== 'person') {
      //   return formatPlace(row);
      // } else {
        return row.doc.name || row.doc.phone;
      // }
    } else {
      return row.id;
    }
  };

  var initPhoneField = function($phone) {
    // TODO reinstate a lost feature whereby entering in freetext is validated
    // and once it's a valid phone number it appears as its own entry in the
    // dropdown with an iuc
    // TODO consider hooking into this to detect "everyone at" contacts and injecting
    // that option in
    return Select2Search($phone, CONTACT_TYPES, {
      tags: true,
      templateResult: formatResult,
      templateSelection: formatSelection,
    });
};

  exports.showModal = function(options) {
    options = options || {};


    var $modal = $('#send-message');
    $modal.find('.has-error').removeClass('has-error');
    $modal.find('.help-block').text('');

    var val = [],
        to = options.to,
        message = options.message || '';

    if (to) {
      if (typeof to === 'string') {
        val.push(to);
      } else if (to) {
        val.push(to._id);
      }
    }

    $modal.find('[name=phone]').val(val).trigger('change');
    $modal.find('[name=message]').val(message);
    $modal.find('.count').text('');
    $modal.modal('show');

    // TODO: should we really be doing this multiple times? Every time show
    //       model is run we re-run the select2 stuff!
    return initPhoneField($('#send-message [name=phone]'));
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
    // TODO potentially use DB.allDocs to resolve pure phone numbers into
    //      real contacts?
    return Promise.resolve(recipients);
  };

  //TODO: this takes data from either a recipient set elsewhere, or from the model
  // passed in. Refactor so that both are passed in
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
