(function () {

  'use strict';

  var calculate = function(message) {
    var maxCharacters = 160;
    return {
      messages: Math.ceil(message.length / maxCharacters),
      characters: maxCharacters - ((message.length - 1) % maxCharacters) - 1
    };
  };

  var translate = function($translate, count) {
    var key = count.messages <= 1 ?
                'message.characters.left' :
                'message.characters.left.multiple';
    return $translate.instant(key, count);
  };

  exports.init = function($translate) {
    $('body').on('keyup', '[name=message]', function(e) {
      var target = $(e.target);
      var count = calculate(target.val());
      target.closest('.message-form')
            .find('.count')
            .text(translate($translate, count));
    });
  };
  
}());