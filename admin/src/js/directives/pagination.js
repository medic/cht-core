angular.module('directives').directive('mmPagination', function() {
  'use strict';

  return {
    templateUrl: 'templates/pagination.html',
    link: function(scope) {
      var paginate = function() {
        var maxPageLinks = 11,
            nbrPageLinks = Math.min(maxPageLinks, scope.pagination.pages);

        var firstPage = Math.min(
          Math.max(0, scope.pagination.page - Math.ceil(nbrPageLinks / 2)),
          scope.pagination.pages - nbrPageLinks
        );

        scope.pagination.pageLinks = Array(nbrPageLinks).fill().map(function(x, i) {
          return i + firstPage + 1;
        });

        scope.pagination.detail = {
          firstItem: (scope.pagination.page - 1) * scope.pagination.perPage + 1,
          lastItem: Math.min(scope.pagination.total, scope.pagination.page * scope.pagination.perPage),
          displayFirstLastLinks: scope.pagination.pages > maxPageLinks
        };
      };

      scope.$watch('pagination.pages', function() {
        paginate();
      });
      scope.$watch('pagination.page', function() {
        paginate();
      });

      paginate();
    }
  };
});
