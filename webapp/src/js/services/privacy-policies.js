angular.module('inboxServices').factory('PrivacyPolicies',
  function(
    $log,
    $q,
    $sce,
    DB,
    DBSync,
    Language
  ) {
    'use strict';
    'ngInject';

    const PRIVACY_POLICY_ACCEPTANCE_LOG = 'privacy-policy-acceptance';
    const PRIVACY_POLICY_DOC_ID = 'privacy-policies';
    const ACCEPTED_CONTENT_TYPE = 'text/html';

    const getAcceptanceLog = () => {
      return DB({ meta: true }).get(PRIVACY_POLICY_ACCEPTANCE_LOG).catch(err => {
        if (err.status === 404) {
          return {
            _id: PRIVACY_POLICY_ACCEPTANCE_LOG,
            accepted: {}
          };
        }
        $log.error('Error retrieving privacy policy acceptance log', err);
      });
    };

    /**
     * Updates the local privacy policy acceptance log.
     * @param language - the current user language
     * @param digest - the digest of the accepted privacy policy
     * @returns {Promise}
     */
    const accept = ({ language, digest }) => {
      const localDb = DB({ meta: true });

      return getAcceptanceLog()
        .then(doc => {
          doc.accepted = doc.accepted || {};
          doc.accepted[language] = {
            digest,
            accepted_at: new Date().getTime(),
          };
          return localDb.put(doc);
        })
        .catch(err => {
          $log.error('Error while accepting privacy policy', err);
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

    /**
     * Checks remote and local meta databases to verify whether the current privacy policy has been accepted
     * Checking remote is required after an initial replication, as meta db sync begins late after app bootstrapping,
     * so the chances are high we have not downloaded the doc locally yet.
     * If any of the logs show the current privacy policy was accepted, returns { accepted: true }
     */
    const hasAccepted = () => {
      return DBSync
        .syncMetaDoc([PRIVACY_POLICY_ACCEPTANCE_LOG])
        .catch(err => $log.error('Error while syncing meta dbs for policies', err))
        .then(() => $q.all([
          Language(),
          getPrivacyPolicies(),
          getAcceptanceLog(),
        ]))
        .then(([ languageCode, privacyPolicies, acceptanceLog ]) => {
          const privacyPolicyExists =
              privacyPolicies._attachments &&
              privacyPolicies._attachments[languageCode] &&
              privacyPolicies._attachments[languageCode].content_type === ACCEPTED_CONTENT_TYPE;
          if (!privacyPolicyExists) {
            return { privacyPolicy: false, accepted: true };
          }

          const isAccepted =
              acceptanceLog &&
              acceptanceLog.accepted &&
              acceptanceLog.accepted[languageCode] &&
              acceptanceLog.accepted[languageCode].digest === privacyPolicies._attachments[languageCode].digest;
          if (isAccepted) {
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

    const getTrustedHtml = string => {
      return $sce.trustAsHtml(decodeUnicode(string));
    };

    const getPrivacyPolicy = () => {
      return $q
        .all([
          Language(),
          getPrivacyPolicies(true),
        ])
        .then(([languageCode, privacyPolicies]) => {
          if (!privacyPolicies._attachments[languageCode]) {
            return false;
          }

          const encodedContent = privacyPolicies._attachments[languageCode].data;
          return {
            language: languageCode,
            digest: privacyPolicies._attachments[languageCode].digest,
            html: getTrustedHtml(encodedContent),
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
      getTrustedHtml,
    };
  }
);
