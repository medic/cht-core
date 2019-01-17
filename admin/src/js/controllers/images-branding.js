angular.module('controllers').controller('ImagesBrandingCtrl',
  function(
    $log,
    $scope,
    $translate,
    DB
  ) {

    'ngInject';
    'use strict';

    const BRANDING_ID = 'branding';

    $('#image-upload .choose').on('click', _ev => {
      _ev.preventDefault();
      $('#image-upload .uploader').click();
    });

    $('#favicon-upload .choose').on('click', _ev => {
      _ev.preventDefault();
      $('#favicon-upload .uploader').click();
    });

    $scope.error = null;
    $scope.loading = true;
    $scope.favicon = null;
    $scope.logo = 'logo';

    const renderResources = () => {
      const fav = $scope.doc._attachments[$scope.doc.resources.favicon];
      $scope.favicon = `<img src="data:${fav.content_type};base64,${fav.data}" />`;
      $scope.loading = false;
    };

    const getResourcesDoc = () => {
      return DB().get(BRANDING_ID, { attachments: true });
    };

    getResourcesDoc()
      .then(doc => {
        $scope.doc = doc;
        renderResources();
      })
      .catch(err => {
        $log.error('Error fetching resources file', err);
      });

    const addAttachment = (file, resource) => {
      $scope.submitting = true;
      DB()
        .putAttachment(BRANDING_ID, file.name, $scope.doc._rev, file, file.type)
        .then(getResourcesDoc)
        .then(doc => {
          doc.resources[resource] = file.name;
          $scope.doc = doc;
          return DB().put(doc);
        })
        .then(response => {
          $scope.doc._rev = response.rev;
          $scope.submitting = false;
          renderResources();
        })
        .catch(err => {
          $log.error('Error uploading image', err);
          $scope.submitting = false;
          $scope.error = $translate.instant('Error saving settings');
        });
    };

    $scope.submit = (name) => {
      $scope.error = null;
      if (!$scope.doc) {
        $scope.error = $translate.instant('Error saving settings');
        return;
      }

      var files = null;
      if (name === 'logo') {
        files = $('#image-upload .uploader')[0].files;
      } else {
        files = $('#favicon-upload .uploader')[0].files;
      }
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
      addAttachment(files[0], name);
      
    };

    $scope.submitTitle = () => {
      $scope.error = null;
      if (!$scope.doc.title) {
        $scope.error = $translate.instant('field is required', {
          field: $translate.instant('Title')
        });
        return;
      }
      DB().put($scope.doc)
        .catch(err => {
          $log.error(err);
          $scope.error = $translate.instant('Error saving settings');
        });
    };
  }
);
