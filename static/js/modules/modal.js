(function () {

  'use strict';

  var setError = function(modal, message) {
    modal.find('.modal-footer .note').text(message || '');
  };

  var resetModal = function(modal, label, message) {
    modal.find('.submit').text(label);
    modal.find('.btn, [name]').attr('disabled', false);
    setError(modal, message);
  };

  exports.start = function(modal) {
    var submit = modal.find('.submit');
    var label = submit.text();
    var workingLabel = submit.attr('data-working-label');
    if (workingLabel) {
      submit.text(workingLabel);
    }
    modal.find('.btn, [name]').attr('disabled', true);
    setError(modal);
    modal.on('hidden.bs.modal', function () {
      resetModal(modal, label);
    });
    return {
      done: function(description, err) {
        var message = '';
        if (err) {
          console.error(description, err);
          message = description;
        } else {
          modal.modal('hide');
        }
        resetModal(modal, label, message);
      }
    };
  };
  
}());