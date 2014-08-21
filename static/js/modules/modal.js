(function () {

  'use strict';

  exports.start = function(modal) {
    modal.find('.submit').text('Updating...');
    modal.find('.btn, [name]').attr('disabled', true);
    return {
      done: function(description, err) {
        var message = '';
        if (err) {
          console.log(description, err);
          message = description + ': ' + err;
        } else {
          modal.modal('hide');
          modal.find('[name=message]').val('');
        }
        modal.find('.modal-footer .note').text(message);
        modal.find('.submit').text('Submit');
        modal.find('.btn, [name]').attr('disabled', false);
      }
    };
  };
  
}());