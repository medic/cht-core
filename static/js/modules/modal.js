(function () {

  'use strict';

  exports.start = function(modal) {
    var submit = modal.find('.submit');
    var label = submit.text();
    submit.text(submit.attr('data-working-label') || 'Updating...');
    modal.find('.btn, [name]').attr('disabled', true);
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
        modal.find('.modal-footer .note').text(message);
        modal.find('.submit').text(label);
        modal.find('.btn, [name]').attr('disabled', false);
      }
    };
  };
  
}());