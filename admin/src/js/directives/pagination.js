angular.module('directives').directive('mmPagination', function() {
  'use strict';

  return {
    templateUrl: 'templates/pagination.html',
    link: function(scope) {
      var generatePages = function() {
        var maxPages = 11;
        var firstPage = Math.min(Math.max(0, scope.pagination.page - Math.ceil(maxPages / 2)), scope.pagination.pages - maxPages);

        scope.pagesList = Array(Math.min(scope.pagination.pages, maxPages)).fill().map(function(x, i) {
          return i + firstPage + 1;
        });
      };

      scope.$watch('pagination.pages', function() {
        generatePages();
      });
      scope.$watch('pagination.page', function() {
        generatePages();
      });
    }
  };
});
