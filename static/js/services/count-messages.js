(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  var calculate = function(message) {
    var maxCharacters = 160;
    return {
      messages: Math.ceil(message.length / maxCharacters),
      characters: maxCharacters - ((message.length - 1) % maxCharacters) - 1
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