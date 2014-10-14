(function () {

  'use strict';

  var resetModal = function(modal, label, message) {
    modal.find('.submit').text(label);
    modal.find('.modal-footer .note').text(message || '');
    modal.find('.btn, [name]').attr('disabled', false);
  };

  exports.start = function(modal) {
    var submit = modal.find('.submit');
    var label = submit.text();
    submit.text(submit.attr('data-working-label') || 'Updating...');
    modal.find('.btn, [name]').attr('disabled', true);
    modal.on('hidden.bs.modal', function () {
      resetModal(modal, label);
    });
    return {
      done: function(description, err) {
        var message = '';
        if (err) {
          console.log(description, err);
          message = description + ': ' + err;
        } else {
          modal.modal('hide');
          modal.find('input[type=text], textarea').val('');
        }
        resetModal(modal, label, message);
      }
    };
  };
  
}());