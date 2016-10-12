angular.module('inboxFilters').filter('resourceIcon',
  function(ResourceIcons) {
    'use strict';
    'ng-inject';
    return function(name) {
      var src = ResourceIcons.getImg(name);
      if (src) {
        src = 'src="' + src + '"';
      } else {
        src = '';
      }
      return '<img class="resource-icon" title="' + name + '" ' + src + ' />';
    };
  }
);
