angular.module('inboxServices').factory('PrivacyPolicies',
  function(
    $log,
    $q,
    $sanitize,
    DB,
    Language,
    UserSettings
  ) {
    'use strict';
    'ngInject';

    const PRIVACY_POLICY_DOC_ID = 'privacy-policies';
    const ACCEPTED_CONTENT_TYPE = 'text/html';

    /**
     * Updates the local privacy policy acceptance log.
     * @param language - the current user language
     * @param digest - the digest of the accepted privacy policy
     * @returns {Promise}
     */
    const accept = ({ language, digest }) => {
      return UserSettings().then(userSettings => {
        userSettings.privacy_policy_acceptance_log = userSettings.privacy_policy_acceptance_log || [];

        userSettings.privacy_policy_acceptance_log.push({
          language,
          digest,
          accepted_at: new Date().getTime(),
        });

        return DB().put(userSettings);
      });
    };

    const getPrivacyPolicies = (attachments = false) => {
      return DB()
        .get(PRIVACY_POLICY_DOC_ID, { attachments })
        .catch(err => {
          if (err.status === 404) {
            return {};
          }
          $log.error('Error retrieving privacy policies', err);
          throw err;
        });
    };

    const policyForLanguageExists = (languageCode, privacyPolicies) => {
      if (!privacyPolicies || !privacyPolicies.privacy_policies || !privacyPolicies.privacy_policies[languageCode]) {
        return false;
      }
      const attachmentName = privacyPolicies.privacy_policies[languageCode];
      if (!privacyPolicies._attachments || !privacyPolicies._attachments[attachmentName]) {
        return false;
      }

      return privacyPolicies._attachments[attachmentName].content_type === ACCEPTED_CONTENT_TYPE;
    };

    const checkAcceptanceLog = (languageCode, privacyPolicies, userSettings) => {
      if (!userSettings.privacy_policy_acceptance_log || !userSettings.privacy_policy_acceptance_log.length) {
        return false;
      }

      const attachmentName = privacyPolicies.privacy_policies[languageCode];
      const attachment = privacyPolicies._attachments[attachmentName];
      const entry = userSettings.privacy_policy_acceptance_log.find(entry => {
        return entry.language === languageCode && entry.digest === attachment.digest;
      });

      return !!entry;
    };

    /**
     * Checks remote and local meta databases to verify whether the current privacy policy has been accepted
     * Checking remote is required after an initial replication, as meta db sync begins late after app bootstrapping,
     * so the chances are high we have not downloaded the doc locally yet.
     * If any of the logs show the current privacy policy was accepted, returns { accepted: true }
     */
    const hasAccepted = () => {
      return $q
        .all([
          Language(),
          getPrivacyPolicies(),
          UserSettings(),
        ])
        .then(([ languageCode, privacyPolicies, userSettings ]) => {
          if (!policyForLanguageExists(languageCode, privacyPolicies)) {
            return { privacyPolicy: false, accepted: true };
          }

          if (checkAcceptanceLog(languageCode, privacyPolicies, userSettings)) {
            return { privacyPolicy: true, accepted: true };
          }

          return { privacyPolicy: true, accepted: false };
        });
    };

    // atob doesn't handle unicode characters
    // stolen from StackOverflow
    const decodeUnicode = string => {
      // Going backwards: from byte stream, to percent-encoding, to original string.
      const unicodeCharArray = atob(string)
        .split('')
        .map(char => '%' + ('00' + char.charCodeAt(0).toString(16)).slice(-2))
        .join('');
      return decodeURIComponent(unicodeCharArray);
    };

    const getPrivacyPolicy = () => {
      return $q
        .all([
          Language(),
          getPrivacyPolicies(true),
        ])
        .then(([languageCode, privacyPolicies]) => {
          const attachmentName = privacyPolicies && privacyPolicies.privacy_policies[languageCode];
          if (!attachmentName || !privacyPolicies._attachments[attachmentName]) {
            return false;
          }

          const attachment = privacyPolicies._attachments[attachmentName];
          if (attachment.content_type !== ACCEPTED_CONTENT_TYPE) {
            return false;
          }

          const encodedContent = attachment.data;
          const decodedContent = decodeUnicode(encodedContent);
          return {
            language: languageCode,
            digest: attachment.digest,
            html: $sanitize(decodedContent),
          };
        })
        .catch(err => {
          $log.error('Error while fetching privacy policies', err);
        });
    };

    return {
      hasAccepted,
      accept,
      getPrivacyPolicy,
      decodeUnicode,
    };
  });
