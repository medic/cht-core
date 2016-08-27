(function () {

  'use strict';

  var module = angular.module('inboxFilters');

  module.filter('resourceIcon', [
    'ResourceIcons',
    function(ResourceIcons) {
      return function(name) {
        var src = ResourceIcons.getImg(name);
        if (src) {
          src = 'src="' + src + '"';
        } else {
          src = '';
        }
        return '<img class="resource-icon" name="' + name + '" ' + src + ' />';
      };
    }
  ]);


}());
