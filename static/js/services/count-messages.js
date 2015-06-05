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

  inboxServices.factory('CountMessages', ['$translate',
    function($translate) {
      return {
        label: label,
        init: function() {
          $('body').on('keyup', '[name=message]', function(e) {
            var target = $(e.target);
            target.closest('.message-form')
                  .find('.count')
                  .text(label($translate, target.val()));
          });
        }
      };
    }
  ]);

}());