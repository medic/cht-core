// Bootstrap pagination with
// - a maximum number of 11 page links, surrounding currently selected page.
// - next & prev links
// - first & last links - only displayed when nbr of pages > 11
// - a pagination summary (`Showing a - b of c items`)
// - no isolated scope

angular.module('directives').directive('mmPagination', function() {
  'use strict';

  return {
    templateUrl: 'templates/pagination.html',
    link: function(scope) {
      const paginate = function() {
        const maxPageLinks = 11;
        const nbrPageLinks = Math.min(maxPageLinks, scope.pagination.pages);

        const firstPage = Math.min(
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
