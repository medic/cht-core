var _ = require('underscore'),
    scrollLoader = require('../modules/scroll-loader');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ContactsCtrl', 
    ['$scope', 'db', 'Search', 'DbView',
    function ($scope, db, Search, DbView) {

      $scope.filterModel.type = 'contacts';
      $scope.loading = true;

      var _selected;

      $scope.query = function(options) {
        options = options || {};

        $scope.loading = true;
        $scope.appending = options.skip;
        $scope.error = false;

        _.defaults(options, {
          index: 'contacts',
          sort: 'name'
        });

        if (options.skip) {
          options.skip = $scope.contacts.length;
        }

        Search($scope, options, function(err, data) {
          $scope.loading = false;
          $scope.appending = false;
          if (err) {
            $scope.error = true;
            return console.log('Error searching for contacts', err);
          }
          $scope.totalContacts = data.total_rows;
          if (options.skip) {
            $scope.contacts.push.apply($scope.contacts, data.results);
          } else {
            $scope.contacts = data.results;
            if (!$scope.selected || _selected !== $scope.selected._id) {
              $scope.selectContact(_selected);
            }
            scrollLoader.init(function() {
              $scope.query({ skip: true });
            });
          }
        });
      };

      var getContact = function(id, callback) {
        var doc = _.findWhere($scope.contacts, { _id: id });
        if (doc) {
          return callback(null, doc);
        }
        db.getDoc(id, callback);
      };

      $scope.selectContact = function(id) {
        _selected = id;
        if (id) {
          getContact(id, function(err, doc) {
            if (err) {
              return console.log('Error fetching doc', err);
            }
            var options = {
              startkey: [ doc._id ],
              endkey: [ doc._id, {} ],
              include_docs: true
            };
            DbView('facility_by_parent', options, function(err, results) {
              doc.children = results;
              $scope.setSelected(doc);
              if (err) {
                return console.log('Error fetching doc', err);
              }
            });
          });
        } else {
          $scope.setSelected();
        }
      };

      $scope.$on('query', function() {
        $scope.query();
      });

      $scope.$on('filters-reset', function() {
        $('#contactTypeDropdown').multiDropdown().reset();
        $scope.query();
      });

      $scope.$on('ContactUpdated', function(e, contact) {
        if (!contact) {
          $scope.query();
          return;
        }
        var outdated = _.findWhere($scope.contacts, { _id: contact._id });
        if (outdated) {
          if (contact._deleted) {
            $scope.query();
          } else {
            var scope = angular.element($('body')).scope();
            if (scope) {
              scope.$apply(function() {
                _.extend(outdated, contact);
              });
            }
          }
        }
      });

    }
  ]);

}());