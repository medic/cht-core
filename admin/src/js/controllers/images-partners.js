angular.module('controllers').controller('ImagesPartnersCtrl',
  function(
    $log,
    $scope,
    $translate,
    DB,
    ResourceIcons
  ) {

    'ngInject';
    'use strict';

    const PARTNER_ID = 'partners';

    $('#partner-upload .choose').on('click', function(_ev) {
      _ev.preventDefault();
      $('#partner-upload .uploader').click();
    });

    $scope.error = null;
    $scope.loading = true;
    $scope.name = null;
    $scope.images = null;

    const renderResources = () => {
      ResourceIcons.getDocResources('partners').then(images => {
        $scope.images = images;
        $scope.loading = false;
      });
    };

    const getPartnersDoc = () => {
      return DB().get(PARTNER_ID, { attachments: true });
    };
    
    getPartnersDoc().then(doc => {
      $scope.doc = doc;
      renderResources();
    }).catch(err => {
      if (err.status === 404) {
        const doc = {
          _id: PARTNER_ID,
          resources: {}
        };
        DB().put(doc).then(() => {
          getPartnersDoc().then(doc => {
            $scope.doc = doc;
          });
        });
      }
      $scope.loading = false;
    });

    const addAttachment = file => {
      $scope.submitting = true;
      DB()
        .putAttachment(PARTNER_ID, file.name, $scope.doc._rev, file, file.type)
        .then(getPartnersDoc)
        .then(doc => {
          doc.resources[$scope.name] = file.name;
          $scope.doc = doc;
          return DB().put(doc);
        })
        .then(resp => {
          $scope.doc._rev = resp.rev;
          $scope.submitting = false;
          $scope.name = null;
          renderResources();
        })
        .catch(err => {
          $log.error('Error uploading image', err);
          $scope.submitting = false;
          $scope.error = $translate.instant('Error saving settings');
        });
    };

    $scope.submit = () => {
      $scope.error = null;
      if (!$scope.name) {
        $scope.error = $translate.instant('field is required', {
          field: $translate.instant('partner.name.field')
        });
        return;
      }

      const files = $('#partner-upload .uploader')[0].files;
      if (!files || files.length === 0) {
        $scope.error = $translate.instant('field is required', {
          field: $translate.instant('partner.logo.field')
        });
        return;
      }
      // File must be less than 1MB
      if (files[0].size > 1000000) {
        $scope.error = 'File must be less than 1MB';
      }
      if ($scope.error) {
        return;
      }
      addAttachment(files[0]);
      
    };
  });
