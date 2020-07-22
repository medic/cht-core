angular.module('controllers').controller('DisplayPrivacyPoliciesCtrl',
  function (
    $log,
    $q,
    $scope,
    DB,
    Languages,
    Modal
  ) {
    'use strict';
    'ngInject';

    const PRIVACY_POLICIES_DOC_ID = 'privacy-policies';

    $scope.allowedContentType = 'text/html';

    const getPrivacyPoliciesDoc = (attachments = false) => {
      return DB()
        .get(PRIVACY_POLICIES_DOC_ID, { attachments })
        .catch(err => {
          if (err.status === 404) {
            return {
              _id: PRIVACY_POLICIES_DOC_ID,
              privacy_policies: {},
              _attachments: {}
            };
          }
          throw err;
        });
    };

    const loadPrivacyPolicies = () => {
      return getPrivacyPoliciesDoc(true).then(doc => {
        doc.privacy_policies = doc.privacy_policies || {};
        doc._attachments = doc._attachments || {};

        $scope.privacyPolicies = {};
        $scope.languages.forEach(({ code }) => {
          const attachmentName = doc.privacy_policies[code];
          $scope.privacyPolicies[code] = attachmentName && doc._attachments[attachmentName] || {};
        });
      });
    };

    $(document).on('click', '#privacy-policy-upload .choose', function(e) {
      e.preventDefault();
      $(this).parent().find('.uploader').click();
      $q.resolve().then(() => $scope.noChanges = false);
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
      $scope.noChanges = false;
      $scope.submitting = true;
      $scope.submitError = false;
      $scope.submitted = false;

      const updates = $scope.languages
        .filter(({ code }) => $scope.updates[code] && $scope.updates[code].type === $scope.allowedContentType)
        .map(({ code }) => ({
          language: code,
          file: $scope.updates[code],
          name: $scope.updates[code].name,
        }));

      if (!updates.length && !$scope.deletes.length) {
        // nothing to update
        $scope.noChanges = true;
        $scope.submitting = false;
        return $q.resolve();
      }

      return getPrivacyPoliciesDoc()
        .then(doc => {
          doc.privacy_policies = doc.privacy_policies || {};
          doc._attachments = doc._attachments || {};

          $scope.deletes.forEach(languageCode => {
            const attachmentName = doc.privacy_policies[languageCode];
            delete doc.privacy_policies[languageCode];
            delete doc._attachments[attachmentName];
          });

          updates.forEach(update => {
            const oldAttachment = doc.privacy_policies[update.language];
            delete doc._attachments[oldAttachment];

            doc.privacy_policies[update.language] = update.name;
            doc._attachments[update.name] = {
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

    $scope.preview = (language={}) => {
      Modal({
        templateUrl: 'templates/display_privacy_policies_preview.html',
        controller: 'DisplayPrivacyPoliciesPreview',
        model: {
          attachment: $scope.privacyPolicies[language.code],
          language,
        }
      });
    };

    $scope.previewUpdate = (language={}) => {
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

    $scope.delete = (language={}) => {
      $scope.privacyPolicies[language.code] = {};
      $scope.deletes.push(language.code);
      $scope.noChanges = false;
    };

    $scope.deleteUpdate = (language={}) => {
      delete $scope.updates[language.code];
    };

    $scope.$on('$destroy', () => {
      $(document).off('click', '#privacy-policy-upload .choose');
    });
  });
