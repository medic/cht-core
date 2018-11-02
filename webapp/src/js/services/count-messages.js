(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  var gsmChars = new RegExp('^[A-Za-z0-9 \\r\\n@£$¥èéùìòÇØøÅå\u0394_\u03A6\u0393\u039B\u03A9\u03A0\u03A8\u03A3\u0398\u039EÆæßÉ!\"#$%&\'()*+,\\-./:;<=>?¡ÄÖÑÜ§¿äöñüà^{}\\\\\\[~\\]|\u20AC]*$');

  var getMax = function(message) {
    return gsmChars.test(message) ? 160 : 70;
  };

  var calculate = function(message) {
    var max = getMax(message);
    return {
      messages: Math.ceil(message.length / max),
      characters: max - ((message.length - 1) % max) - 1
    };
  };

  var label = function(translate, value) {
    var count = calculate(value);
    var key = count.messages <= 1 ?
                'message.characters.left' :
                'message.characters.left.multiple';
    return translate.instant(key, count);
  };

  inboxServices.factory('CountMessages',
    function(
      $translate,
      Settings
    ) {
      return {
        label: label,
        init: function() {
          Settings().then(function(settings) {
            $('body').on('keyup', '[name=message]', function(e) {

              var target = $(e.target);
              var message = target.val();
              target.closest('.message-form')
                    .find('.count')
                    .text(label($translate, message));

              var count = calculate(message);
              var settingsMaximumSMSPart = settings.multipart_sms_limit || 10;

              if (count.messages > settingsMaximumSMSPart) {
                target.closest('.message-form')
                      .find('.count')
                      .addClass('alert-danger')
                      .closest('mm-modal')
                      .find('.btn.submit')
                      .addClass('disabled');
              } else {
                target.closest('.message-form')
                      .find('.count')
                      .removeClass('alert-danger')
                      .closest('mm-modal')
                      .find('.btn.submit')
                      .removeClass('disabled');

              }
            });
          });
        }
      };
    }
  );

}());