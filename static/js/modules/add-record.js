(function () {

  'use strict';

  exports.init = function(src) {
    if (src) {
      $.ajax({
        type: 'head',
        url: '/api/auth/' + encodeURIComponent(src),
        success: function() {
          var btn;

          // enable old-style form submission
          btn = $('#send-record-button');
          btn.closest('li').removeClass('disabled');
          btn.on('click', function(e) {
            e.preventDefault();
            $('#add-record-panel .dropdown-menu').show();
            var iframe = $('#add-record-panel iframe');
            iframe.attr('src', src);
          });

          // enable enketo form submission
          btn = $('#launch-enketo-composer');
          btn.closest('li').removeClass('disabled');
          btn.on('click', function(e) {
            e.preventDefault();
            $('#create-report').modal('show');
            /* globals loadComposer */
            loadComposer();
          });

          // enable close button
          $('#add-record-panel .close').on('click', function() {
            $('#add-record-panel .dropdown-menu').hide();
          });
        }
      });
    }
  };
  
}());
