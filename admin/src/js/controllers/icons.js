const _ = require('lodash/core');
_.toPairs = require('lodash/toPairs');


angular.module('controllers').controller('IconsCtrl',
  function(
    $log,
    $scope,
    $translate,
    DB
  ) {

    'ngInject';
    'use strict';

    $('#icon-upload .choose').on('click', function(_ev) {
      _ev.preventDefault();
      $('#icon-upload .uploader').click();
    });

    $scope.name = null;
    $scope.error = null;
    $scope.icons = null;
    $scope.loading = true;

    const renderResources = function() {
      $scope.icons = _.map(_.toPairs($scope.doc.resources), function(pair) {
        const icon = $scope.doc._attachments[pair[1]];
        return {
          name: pair[0],
          data: icon.data,
          type: icon.content_type
        };
      });
      $scope.loading = false;
    };

    const getResourcesDoc = function() {
      return DB().get('resources', { attachments: true });
    };

    getResourcesDoc()
      .then(function(doc) {
        $scope.doc = doc;
        renderResources();
      })
      .catch(function(err) {
        $log.error('Error fetching resources file', err);
      });

    const addAttachment = function(file) {
      $scope.submitting = true;
      DB()
        .putAttachment('resources', file.name, $scope.doc._rev, file, file.type)
        .then(getResourcesDoc)
        .then(function(doc) {
          doc.resources[$scope.name] = file.name;
          $scope.doc = doc;
          return DB().put(doc);
        })
        .then(function(response) {
          $scope.doc._rev = response.rev;
          $scope.submitting = false;
          renderResources();
        })
        .catch(function(err) {
          $log.error('Error uploading image', err);
          $scope.submitting = false;
          $scope.error = $translate.instant('Error saving settings');
        });
    };

    $scope.submit = function() {
      $scope.error = null;
      if (!$scope.doc) {
        $scope.error = $translate.instant('Error saving settings');
        return;
      }
      if (!$scope.name) {
        $scope.error = $translate.instant('field is required', {
          field: $translate.instant('Name')
        });
      }
      const files = $('#icon-upload .uploader')[0].files;
      if (!files || files.length === 0) {
        $scope.error = $translate.instant('field is required', {
          field: $translate.instant('icon')
        });
      }
      if ($scope.error) {
        return;
      }
      addAttachment(files[0]);
    };

  });
