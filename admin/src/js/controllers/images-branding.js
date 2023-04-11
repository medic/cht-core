angular.module('controllers').controller('ImagesBrandingCtrl',
  function(
    $log,
    $scope,
    $translate,
    AddAttachment,
    DB,
    Translate
  ) {

    'ngInject';
    'use strict';

    const DOC_ID = 'branding';
    const MAX_FILE_SIZE = 100000; // 100KB

    $('#images-branding .choose').on('click', ev => {
      ev.preventDefault();
      $(ev.target).closest('.form-group').find('.uploader').click();
    });

    $scope.loading = true;

    const getResourcesDoc = () => {
      return DB().get(DOC_ID, { attachments: true })
        .then(doc => {
          $scope.doc = doc;
          $scope.favicon = doc._attachments[doc.resources.favicon];
          $scope.icon = doc._attachments[doc.resources.icon];
        })
        .catch(err => {
          $log.error('Error fetching resources file', err);
        })
        .then(() => {
          $scope.loading = false;
        });
    };

    getResourcesDoc();

    const validateTitle = () => {
      if (!$scope.doc.title) {
        Translate.fieldIsRequired('branding.title.field').then(msg => {
          $scope.error = msg;
        });
        return false;
      }
      return true;
    };

    const validateFile = file => {
      if (file.size > MAX_FILE_SIZE) {
        const readable = (MAX_FILE_SIZE / 1000) + 'KB';
        $translate('error.file.size', { size: readable }).then(msg => {
          $scope.error = msg;
        });
        return false;
      }
      return true;
    };

    const getFile = selector => {
      const files = $(`${selector} .uploader`)[0].files;
      return files && files.length && files[0];
    };

    const updateImage = (file, id) => {
      if (!file) {
        // valid but null op
        return true;
      }
      if (!validateFile(file)) {
        return false;
      }
      AddAttachment($scope.doc, file.name, file, file.type);
      $scope.doc.resources[id] = file.name;
      return true;
    };

    const updateLogo = () => updateImage(getFile('#logo-upload'), 'logo');

    const updateFavicon = () => updateImage(getFile('#favicon-upload'), 'favicon');

    const updateIcon = () => updateImage(getFile('#icon-upload'), 'icon');

    const removeObsoleteAttachments = () => {
      const current = $scope.doc._attachments;
      const updated = {};
      ['logo', 'favicon', 'icon'].forEach(key => {
        const name = $scope.doc.resources[key];
        if (name) {
          updated[name] = current[name];
        }
      });
      $scope.doc._attachments = updated;
    };

    $scope.submit = () => {
      $scope.error = null;

      if (!$scope.doc) {
        $log.error('Doc not found on scope when saving branding images');
        $translate('Error saving settings').then(msg => $scope.error = msg);
        return;
      }

      if (!validateTitle() ||
          !updateLogo() ||
          !updateFavicon() ||
          !updateIcon()) {
        return;
      }

      removeObsoleteAttachments();

      $scope.submitting = true;
      return DB().put($scope.doc)
        .then(() => getResourcesDoc())
        .catch(err => {
          $log.error('Error saving branding doc', err);
          $translate('Error saving settings').then(msg => {
            $scope.error = msg;
          });
        })
        .then(() => {
          $scope.submitting = false;
        });
    };
  }
);
