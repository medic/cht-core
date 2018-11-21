angular.module('controllers').controller('BrandingCtrl',
  function(
    $log,
    $scope,
    $translate,
    DB,
    Changes,
    BrandingImages
  ) {

    'ngInject';
    'use strict';

    const BRANDING_ID = 'branding';

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
    $scope.favicon = null;

    var renderResources = function() {
      var fav = $scope.doc._attachments[$scope.doc.resources.favicon];
      $scope.favicon = '<img src="data:' + fav.content_type + ';base64,' + fav.data + '" />';
      $scope.loading = false;
    };

    var getResourcesDoc = function() {
      return DB().get(BRANDING_ID, { attachments: true });
    };

    getResourcesDoc()
      .then(function(doc) {
        $scope.doc = doc;
        renderResources();
      })
      .catch(function(err) {
        $log.error('Error fetching resources file', err);
      });

    var addAttachment = function(file, resource) {
      $scope.submitting = true;
      DB()
        .putAttachment(BRANDING_ID, file.name, $scope.doc._rev, file, file.type)
        .then(getResourcesDoc)
        .then(doc => {
          doc.resources[resource] = file.name;
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
      addAttachment(files[0], $scope.name);
    };

    $scope.submitFav = function() {
      $scope.error = null;
      if (!$scope.doc) {
        $scope.error = $translate.instant('Error saving settings');
        return;
      }
      var files = $('#favicon-upload .uploader')[0].files;
      if (!files || files.length === 0) {
        $scope.error = $translate.instant('field is required', {
          field: $translate.instant('image')
        });
      }
      // File must be less than 10KB
      if (files[0].size > 10000) {
        $scope.error = 'File must be less than 10KB';
      }
      if ($scope.error) {
        return;
      }
      addAttachment(files[0], 'favicon');
    };

    $scope.submitTitle = function() {
      $scope.error = null;
      if (!$scope.doc.title) {
        $scope.error = $translate.instant('field is required', {
          field: $translate.instant('Title')
        });
      }
      if ($scope.error) {
        return;
      }
      DB().get($scope.doc._id).then(function(doc) {
        doc.title = $scope.doc.title;
        DB().put(doc)
          .catch(function (err) {
            $scope.error = err;
          });
      });
    };

    const updateDOM = () => {
      BrandingImages.getAppTitle();
    };

    Changes({
      key: 'branding-changes',
      callback: updateDOM
    });
  }
);
