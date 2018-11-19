var _ = require('underscore');

angular.module('controllers').controller('HeaderLogoCtrl',
  function(
    $log,
    $scope,
    $translate,
    DB
  ) {

    'ngInject';
    'use strict';

    $('#header-upload .choose').on('click', function(_ev) {
      _ev.preventDefault();
      $('#header-upload .uploader').click();
    });

    $('#favicon-upload .choose').on('click', function(_ev) {
      _ev.preventDefault();
      $('#favicon-upload .uploader').click();
    });

    $scope.name = 'logo';
    $scope.error = null;
    $scope.images = null;
    $scope.loading = true;

    var renderResources = function() {
      var allowed = ['logo'];
      Object.keys($scope.doc.resources)
      .filter(key => !allowed.includes(key))
      .forEach(key => delete $scope.doc.resources[key]);
      $scope.images = _.map(_.pairs($scope.doc.resources), function(pair) {
        var image = $scope.doc._attachments[pair[1]];
        return {
          title: pair[0],
          name: pair[1],
          data: image.data,
          type: image.content_type
        };
      });
      $scope.loading = false;
    };

    var getResourcesDoc = function() {
      return DB().get('logo', { attachments: true });
    };

    getResourcesDoc()
      .then(function(doc) {
        $scope.doc = doc;
        renderResources();
      })
      .catch(function(err) {
        $log.error('Error fetching resources file', err);
      });

    var addAttachment = function(file) {
      $scope.submitting = true;
      DB()
        .putAttachment('logo', file.name, $scope.doc._rev, file, file.type)
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
      var files = $('#header-upload .uploader')[0].files;
      if (!files || files.length === 0) {
        $scope.error = $translate.instant('field is required', {
          field: $translate.instant('image')
        });
      }
      // File must be less than 100KB
      if (files[0].size > 100000) {
        $scope.error = 'File must be less than 100KB';
      }
      if ($scope.error) {
        return;
      }
      addAttachment(files[0]);
    };

    $scope.submitFav = function() {
      $scope.error = null;
      if (!$scope.doc) {
        $scope.error = $translate.instant('Error saving settings');
        return;
      }
      $scope.name = 'favicon';
      var files = $('#favicon-upload .uploader')[0].files;
      if (!files || files.length === 0) {
        $scope.error = $translate.instant('field is required', {
          field: $translate.instant('image')
        });
      }
      // File must be less than 100KB
      if (files[0].size > 10000) {
        $scope.error = 'File must be less than 10KB';
      }
      if ($scope.error) {
        return;
      }
      addAttachment(files[0]);
    };

  }
);
