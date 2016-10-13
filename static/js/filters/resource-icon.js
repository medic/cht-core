angular.module('inboxFilters').filter('resourceIcon',
  function(ResourceIcons) {
    'use strict';
    'ngInject';
    return function(name) {
      if (!name) {
        return '';
      }
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
