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
    var phoneValidationRegex = /.*?(\+?[\d]{5,15}).*/;
    var contact = data.doc.contact;
    return data.everyoneAt || (
      contact && phoneValidationRegex.test(contact.phone)
    );
  };

  var validatePhoneNumbers = function(recipients) {

    // recipients is mandatory
    if (!recipients || recipients.length === 0) {
      return {
        valid: false,
        message: 'Please include a valid phone number, ' +
                 'e.g. +9779875432123'
      };
    }

    // all recipients must have a valid phone number
    var errors = _.filter(recipients, function(data) {
      return !validatePhoneNumber(data);
    });
    if (errors.length > 0) {
      var errorRecipients = _.map(errors, function(error) {
        return formatContact(error);
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
        .toggleClass('error', !result.valid)
        .find('.help-block')
        .text(result.valid ? '' : result.message);
    return result;
  };

  var formatContact = function(row) {
    if (row.everyoneAt) {
      return 'Everyone at ' + row.doc.name;
    }
    var name = row.doc.name,
        contact = row.doc.contact,
        contactName = contact && contact.name,
        code = contact && contact.rc_code,
        phone = contact && contact.phone;
    return _.compact([name, contactName, code, phone]).join(', ');
  };

  var initListeners = function() {
    $('body').on('click', '.send-message', function(e) {
      e.preventDefault();
      var to = $(e.target).closest('.send-message').attr('data-send-to');
      var $modal = $('#send-message');
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
  };

  var initPhoneField = function($phone) {
    if (!$phone) {
      return;
    }
    $phone.parent().show();
    $phone.select2({
      multiple: true,
      allowClear: true,
      formatResult: formatContact,
      formatSelection: formatContact,
      query: function(options) {
        var vals = options.element.data('options');
        var terms = options.term.toLowerCase().split(/w+/);
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
          var aName = a.everyoneAt ? a.doc.name + 'z' : formatContact(a);
          var bName = b.everyoneAt ? b.doc.name + 'z' : formatContact(b);
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

  var initMessageField = function($message) {
    $message.on('keyup', function(e) {
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

  exports.init = function() {
    var $modal = $('.message-form');
    initListeners();
    var $phone = $modal.find('[name=phone]');
    if (!$phone.is('[type=hidden]')) {
      initPhoneField($phone);
    }
    initMessageField($modal.find('[name=message]'));
  };

  exports.setRecipients = function(_recipients) {
    recipients = _recipients;
  };

  exports.validate = function(target, callback) {

    var $modal = $(target).closest('.message-form');

    if ($modal.find('.submit [disabled]').length) {
      return;
    }

    var $phoneField = $modal.find('[name=phone]');
    var $messageField = $modal.find('[name=message]');

    var phone;
    if ($modal.is('.modal')) {
      phone = updateValidation(
        validatePhoneNumbers, $phoneField, $phoneField.select2('data')
      );
    } else {
      phone = {
        valid: true,
        value: recipients
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