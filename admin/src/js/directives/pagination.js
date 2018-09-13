angular.module('directives').directive('mmPagination', function() {
  'use strict';

  return {
    templateUrl: 'templates/pagination.html',
    link: function(scope) {
      var paginate = function() {
        var maxDisplayPages = 11,
            displayPages = Math.min(maxDisplayPages, scope.pagination.pages);

        var firstPage = Math.min(
          Math.max(0, scope.pagination.page - Math.ceil(displayPages / 2)),
          scope.pagination.pages - displayPages
        );

        scope.pagination.pagesList = Array(displayPages).fill().map(function(x, i) {
          return i + firstPage + 1;
        });

        scope.pagination.detail = {
          first: (scope.pagination.page - 1) * scope.pagination.perPage + 1,
          last: Math.min(scope.pagination.total, scope.pagination.page * scope.pagination.perPage),
          firstLast: scope.pagination.pages > maxDisplayPages
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
