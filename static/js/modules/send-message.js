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

  var formatEveryoneAt = function(row) {
    return translateFn('Everyone at', {
      facility: row.doc.name,
      count: row.descendants && row.descendants.length
    });
  };

  var formatResult = function(row) {
    var icon,
        contact;
    if (row.text) {
      return row.text;
    }
    if (row.everyoneAt) {
      icon = 'fa-hospital-o';
      contact = format.sender({
        name: formatEveryoneAt(row),
        parent: row.parent
      });
    } else if (row.freetext) {
      icon = 'fa-user';
      contact = '<span class="freetext">' + row.id + '</span>';
    } else {
      icon = 'fa-user';
      contact = format.contact(row.doc);
    }
    return $('<span class="fa fa-fw ' + icon + '"></span>' + contact);
  };

  var formatSelection = function(row) {
    if (row.everyoneAt) {
      return formatEveryoneAt(row);
    }
    if (row.doc) {
      return row.doc.name || row.doc.phone;
    }
    return row.id;
  };

  var createChoiceFromNumber = function(phone) {
    return {
      id: phone,
      freetext: true,
      phone: phone
    };
  };

  var filter = function(options, contacts) {
    var terms = options.term ?
      _.map(options.term.toLowerCase().split(/\s+/), function(term) {
        if (libphonenumber.validate(settings, term)) {
          return libphonenumber.format(settings, term);
        }
        return term;
      }) : [];
    var matches = _.filter(contacts, function(val) {
      var tags = [ val.name, val.phone ];
      var parent = val.parent;
      while (parent) {
        tags.push(parent.name);
        parent = parent.parent;
      }
      tags = tags.join(' ').toLowerCase();
      return _.every(terms, function(term) {
        return tags.indexOf(term) > -1;
      });
    });
    matches.sort(function(a, b) {
      return a.name.toLowerCase().localeCompare(
             b.name.toLowerCase());
    });
    var data = _.map(matches, function(doc) {
      return { id: doc._id, doc: doc, everyoneAt: doc.everyoneAt };
    });

    // if a valid phone number is entered, allow it to be selected as a recipient
    if (libphonenumber.validate(settings, options.term)) {
      var formatted = libphonenumber.format(settings, options.term);
      data.unshift(createChoiceFromNumber(formatted));
    }

    return data;
  };

  var initPhoneField = function($phone) {
    if (!$phone.length) {
      throw new Error('phone field not found');
    }
    $phone.parent().show();
    return contact()
      .then(function(data) {
        $phone.select2({
          ajax: {
            transport: function(params, successCb) {
              successCb({ results: filter({ term: params.data.q }, data)});
            }
          },
          allowClear: true,
          tags: true,
          createSearchChoice: createChoiceFromNumber,
          dropdownParent: $('#send-message'),
          templateResult: formatResult,
          templateSelection: formatSelection,
          width: '100%',
        });
      });
  };

  exports.showModal = function(options) {
    initPhoneField($('#send-message [name=phone]'))
      .then(function() {
        var $modal = $('#send-message');
        $modal.find('.has-error').removeClass('has-error');
        $modal.find('.help-block').text('');
        var val = [],
            to = options.to;
        if (to) {
          if (typeof to === 'string') {
            val.push(to);
          } else if (to) {
            val.push(to._id);
          }
        }
        $modal.find('[name=phone]').val(val).trigger('change');
        $modal.find('[name=message]').val(options.message || '');
        $modal.find('.count').text('');
        $modal.modal('show');
      })
      .catch(function(err) {
        console.error('Error initialising phone search', err);
      });
  };

  var contact;
  var recipients = [];
  var settings = {};
  var Promise;
  var translateFn;

  exports.init = function($q, Settings, Contact, _translateFn) {
    Promise = $q;
    contact = Contact;
    translateFn = _translateFn;
    Settings()
      .then(function(_settings) {
        settings = _settings;
        $('body').on('click', '.send-message', function(event) {
          var target = $(event.target).closest('.send-message');
          if (target.hasClass('mm-icon-disabled')) {
            return;
          }
          event.preventDefault();
          var to = target.attr('data-send-to');
          if (to) {
            try {
              to = JSON.parse(to);
            } catch(e) {}
          }
          if (to && to.type === 'data_record') {
            to = to.contact || to.from;
          }
          exports.showModal({
            to: to,
            everyoneAt: target.attr('data-everyone-at') === 'true'
          });
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
    return contact()
      .then(function(contacts) {
        return _.map(recipients, function(recipient) {
          // see if we can resolve the facility
          var phone = (recipient.doc && recipient.doc.phone) ||
                      (recipient.doc && recipient.doc.contact.phone) ||
                      (recipient.phone) ||
                      (recipient.contact && recipient.contact.phone);
          var match = _.find(contacts, function(contact) {
            return contact.phone === phone &&
                   contact.everyoneAt === recipient.everyoneAt;
          });
          return match || recipient;
        });
      });
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
      .then(function(phone) {
        if (phone.valid && message.valid) {
          callback(phone.value, message.value);
        }
      });
  };

}());
