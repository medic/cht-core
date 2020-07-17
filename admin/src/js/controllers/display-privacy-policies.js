angular.module('controllers').controller('DisplayPrivacyPoliciesCtrl',
  function (
    $log,
    $scope,
    $translate,
    Blob,
    DB,
    Languages,
    Modal
  ) {
    'use strict';
    'ngInject';

    const PRIVACY_POLICIES_DOC_ID = 'privacy-policies';

    const getPrivacyPoliciesDoc = (attachments = false) => {
      return DB()
        .get(PRIVACY_POLICIES_DOC_ID, { attachments })
        .catch(err => {
          if (err.status === 404) {
            return { _id: PRIVACY_POLICIES_DOC_ID, _attachments: {}};
          }
          throw err;
        });
    };

    const loadPrivacyPolicies = () => {
      return getPrivacyPoliciesDoc().then(privacyPolicies => {
        $scope.privacyPolicies = {};
        $scope.languages.forEach(language => {
          $scope.privacyPolicies[language.code] = privacyPolicies._attachments[language.code] || {};
        });
      });
    };

    $(document).on('click', '#privacy-policy-upload .choose', function(e) {
      e.preventDefault();
      $(this).parent().find('.uploader').click();
    });

    const getLanguages = () => {
      return Languages().then(languages => $scope.languages = languages);
    };

    const init = () => {
      $scope.loading = true;
      $scope.updates = {};
      $scope.deletes = [];
      return getLanguages()
        .then(() => loadPrivacyPolicies())
        .catch(err => {
          $log.error('Error loading languages and privacy policies', err);
          $scope.error = true;
        })
        .finally(() => $scope.loading = false);
    };

    this.setupPromise = init();

    $scope.submit = () => {
      $scope.submitting = true;
      $scope.submitError = false;

      const updates = $scope.languages
        .filter(language => $scope.updates[language.code])
        .map(language => ({
          language: language.code,
          file: $scope.updates[language.code],
        }));

      if (!updates.length && !$scope.deletes.length) {
        // nothing to update
        $scope.submitting = false;
        return;
      }

      return getPrivacyPoliciesDoc()
        .then(doc => {
          $scope.deletes.forEach(languageCode => {
            delete doc._attachments[languageCode];
          });

          updates.forEach(update => {
            doc._attachments[update.language] = {
              content_type: update.file.type,
              data: update.file,
            };
          });

          return DB().put(doc);
        })
        .then(() => init())
        .then(() => $scope.submitted = true)
        .catch(err => {
          $log.error('Error while uploading privacy policies', err);
          $scope.submitError = true;
        })
        .finally(() => $scope.submitting = false);
    };

    $scope.preview = (language) => {
      return getPrivacyPoliciesDoc(true).then(doc => {
        Modal({
          templateUrl: 'templates/display_privacy_policies_preview.html',
          controller: 'DisplayPrivacyPoliciesPreview',
          model: {
            attachment: doc._attachments[language.code],
            language,
          }
        });
      });
    };

    $scope.previewUpdate = (language) => {
      if (!$scope.updates[language.code]) {
        return;
      }
      Modal({
        templateUrl: 'templates/display_privacy_policies_preview.html',
        controller: 'DisplayPrivacyPoliciesPreview',
        model: {
          file: $scope.updates[language.code],
          language,
        }
      });
    };

    $scope.delete = (language) => {
      delete $scope.privacyPolicies[language.code];
      $scope.deletes.push(language.code);
    };

    $scope.deleteUpdate = language => {
      delete $scope.updates[language.code];
    };

    $scope.$on('$destroy', () => {
      $(document).off('click', '#privacy-policy-upload .choose');
    });
  });
