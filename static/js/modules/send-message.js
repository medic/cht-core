var _ = require('underscore'),
    libphonenumber = require('libphonenumber/utils'),
    format = require('./format');

(function () {

  'use strict';

  var validateMessage = function(message) {
    return {
      valid: !!message,
      message: 'Please include a message.',
      value: message,
    };
  };

  var validatePhoneNumber = function(data) {
    if (data.everyoneAt) {
      return true;
    }
    var contact = data.doc.contact;
    return contact && libphonenumber.validate(settings, contact.phone);
  };

  var validatePhoneNumbers = function(recipients) {

    // recipients is mandatory
    if (!recipients || recipients.length === 0) {
      return {
        valid: false,
        message: 'Please include a valid phone number'
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
        message: 'These recipients do not have a valid ' + 
                 'contact number: ' + errorRecipients
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
    elem.closest('.control-group')
        .toggleClass('has-error', !result.valid)
        .find('.help-block')
        .text(result.valid ? '' : result.message);
    return result;
  };

  var formatResult = function(row) {
    if (row.everyoneAt) {
      return 'Everyone at ' + row.doc.name;
    }
    return format.contact(row.doc);
  };

  var formatSelection = function(row) {
    if (row.everyoneAt) {
      return 'Everyone at ' + row.doc.name;
    }
    var contact = row.doc.contact;
    return (contact && contact.name) ||
           row.doc.name ||
           (contact && contact.phone);
  };

  var initPhoneField = function($phone) {
    if (!$phone) {
      return;
    }
    $phone.parent().show();
    $phone.select2({
      multiple: true,
      allowClear: true,
      formatResult: formatResult,
      formatSelection: formatSelection,
      query: function(options) {
        var vals = options.element.data('options');
        var terms = _.map(options.term.toLowerCase().split(/\s+/), function(term) {
          if (libphonenumber.validate(settings, term)) {
            return libphonenumber.format(settings, term);
          }
          return term;
        });
        var matches = _.filter(vals, function(val) {
          var contact = val.doc.contact;
          var name = contact && contact.name;
          var phone = contact && contact.phone;
          var tags = [ val.doc.name, name, phone ].join(' ').toLowerCase();
          return _.every(terms, function(term) {
            return tags.indexOf(term) > -1;
          });
        });
        matches.sort(function(a, b) {
          var aName = a.everyoneAt ? a.doc.name + 'z' : formatResult(a);
          var bName = b.everyoneAt ? b.doc.name + 'z' : formatResult(b);
          return aName.toLowerCase().localeCompare(bName.toLowerCase());
        });
        options.callback({ results: matches });
      },
      createSearchChoice: function(term, data) {
        if (/^\+?\d*$/.test(term) && data.length === 0) {
          return {
            id: term,
            doc: {
              contact: {
                phone: term
              }
            }
          };
        }
      }
    });
  };

  var initMessageField = function() {
    $('body').on('keyup', '[name=message]', function(e) {
      var target = $(e.target);
      var count = target.val().length;
      var msg = '';
      if (count > 50) {
          msg = count + '/160 characters';
      }
      target.closest('.message-form').find('.note').text(msg);
    });
  };

  var recipients = [];
  var settings = {};

  exports.init = function(_settings) {
    $('body').on('click', '.send-message', function(e) {
      e.preventDefault();
      var to = $(e.target).closest('.send-message').attr('data-send-to');
      var $modal = $('#send-message');
      $modal.find('.has-error').removeClass('has-error');
      $modal.find('.help-block').text('');
      var val = [];
      if (to) {
        var options = $modal.find('[name=phone]').data('options');
        var doc = _.find(options, function(option) {
          return option.doc.contact && option.doc.contact.phone === to;
        });
        if (doc) {
          val.push(doc);
        }
      }
      $modal.find('[name=phone]').select2('data', val);
      $modal.find('[name=message]').val('');
      $modal.modal('show');
    });
    initPhoneField($('#send-message [name=phone]'));
    initMessageField();
    settings = _settings;
  };

  exports.setRecipients = function(_recipients) {
    recipients = _recipients;
  };

  var resolveRecipients = function(recipients) {
    return _.map(recipients, function(recipient) {
      if (recipient.doc._id) {
        // already a facility object
        return recipient;
      } else {
        // see if we can resolve the facility
        var contacts = $('#send-message [name=phone]').data('options');
        var match = _.find(contacts, function(contact) {
          return contact.doc.contact &&
                 recipient.doc.contact &&
                 contact.doc.contact.phone === recipient.doc.contact.phone;
        });
        return match || recipient;
      }
    });
  };

  exports.validate = function(target, callback) {

    var $modal = $(target).closest('.message-form');

    if ($modal.find('.submit [disabled]').length) {
      return;
    }

    var $messageField = $modal.find('[name=message]');

    var phone;
    if ($modal.is('.modal')) {
      var $phoneField = $modal.find('[name=phone]');
      phone = updateValidation(
        validatePhoneNumbers, $phoneField, $phoneField.select2('data')
      );
    } else {
      phone = {
        valid: true,
        value: resolveRecipients(recipients)
      };
    }

    var message = updateValidation(
      validateMessage, $messageField, $messageField.val().trim()
    );

    if (phone.valid && message.valid) {
      callback(phone.value, message.value);
    }
  };

}());