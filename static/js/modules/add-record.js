(function () {

  'use strict';

  exports.init = function() {

    var iframe = $('#add-record-panel iframe');
    var src = iframe.data('src');
    if (src) {
      $.ajax({
        type: 'head',
        url: '/api/auth/' + encodeURIComponent(src),
        success: function() {
          var btn = $('#send-record-button');
          btn.closest('li').removeClass('disabled');
          btn.on('click', function(e) {
            e.preventDefault();
            $('#add-record-panel .dropdown-menu').toggle();
            if (!iframe.attr('src')) {
              iframe.attr('src', src);
            }
          });
          $('#add-record-panel .close').on('click', function() {
            $('#add-record-panel .dropdown-menu').toggle();
          });
        }
      });
    }
  };
  
}());