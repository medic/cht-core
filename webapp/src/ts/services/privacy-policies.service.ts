import { Injectable, SecurityContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

import { DbService } from '@mm-services/db.service';
import { LanguageService } from '@mm-services/language.service';
import { UserSettingsService } from '@mm-services/user-settings.service';

@Injectable({
  providedIn: 'root'
})
export class PrivacyPoliciesService {

  PRIVACY_POLICY_DOC_ID = 'privacy-policies';
  ACCEPTED_CONTENT_TYPE = 'text/html';

  constructor(
    private dbService: DbService,
    private languageService: LanguageService,
    private userSettingsService: UserSettingsService,
    private sanitizer: DomSanitizer,
  ) { }

  /**
   * Updates the local privacy policy acceptance log.
   * @param language - the current user language
   * @param digest - the digest of the accepted privacy policy
   * @returns {Promise}
   */
  accept({ language, digest }) {
    return this.userSettingsService
      .get()
      .then((userSettings:any) => {
        const updatedUserSettings = {
          ...userSettings,
          privacy_policy_acceptance_log: userSettings.privacy_policy_acceptance_log || [],
        };
        updatedUserSettings.privacy_policy_acceptance_log.push({ language, digest, accepted_at: new Date().getTime() });
        return this.userSettingsService.put(updatedUserSettings);
      });
  }

  private getPrivacyPolicies(attachments = false) {
    return this.dbService
      .get() // Getting DB.
      .get(this.PRIVACY_POLICY_DOC_ID, { attachments }) // Querying.
      .catch(err => {
        if (err.status === 404) {
          return {};
        }
        console.error('Error retrieving privacy policies', err);
        throw err;
      });
  }

  private policyForLanguageExists(languageCode, privacyPolicies) {
    if (!privacyPolicies || !privacyPolicies.privacy_policies || !privacyPolicies.privacy_policies[languageCode]) {
      return false;
    }

    const attachmentName = privacyPolicies.privacy_policies[languageCode];

    if (!privacyPolicies._attachments || !privacyPolicies._attachments[attachmentName]) {
      return false;
    }

    return privacyPolicies._attachments[attachmentName].content_type === this.ACCEPTED_CONTENT_TYPE;
  }

  private checkAcceptanceLog(languageCode, privacyPolicies, userSettings) {
    if (!userSettings.privacy_policy_acceptance_log || !userSettings.privacy_policy_acceptance_log.length) {
      return false;
    }

    const attachmentName = privacyPolicies.privacy_policies[languageCode];
    const attachment = privacyPolicies._attachments[attachmentName];
    const entry = userSettings.privacy_policy_acceptance_log.find(entry => {
      return entry.language === languageCode && entry.digest === attachment.digest;
    });

    return !!entry;
  }

  /**
   * Checks remote and local meta databases to verify whether the current privacy policy has been accepted
   * Checking remote is required after an initial replication, as meta db sync begins late after app bootstrapping,
   * so the chances are high we have not downloaded the doc locally yet.
   * If any of the logs show the current privacy policy was accepted, returns { accepted: true }
   */
  hasAccepted() {
    return Promise
      .all([
        this.languageService.get(),
        this.getPrivacyPolicies(),
        this.userSettingsService.get(),
      ])
      .then(([ languageCode, privacyPolicies, userSettings ]) => {
        if (!this.policyForLanguageExists(languageCode, privacyPolicies)) {
          return { privacyPolicy: false, accepted: true };
        }

        if (this.checkAcceptanceLog(languageCode, privacyPolicies, userSettings)) {
          return { privacyPolicy: true, accepted: true };
        }

        return { privacyPolicy: true, accepted: false };
      });
  }

  decodeUnicode(string) {
    // atob doesn't handle unicode characters, solution from StackOverflow.
    // Going backwards: from byte stream, to percent-encoding, to original string.
    const unicodeCharArray = atob(string)
      .split('')
      .map(char => '%' + ('00' + char.charCodeAt(0).toString(16)).slice(-2))
      .join('');

    return decodeURIComponent(unicodeCharArray);
  }

  getPrivacyPolicy() {
    return Promise
      .all([
        this.languageService.get(),
        this.getPrivacyPolicies(true),
      ])
      .then(([languageCode, privacyPolicies]) => {
        const attachmentName =
          privacyPolicies &&
          privacyPolicies.privacy_policies &&
          privacyPolicies.privacy_policies[languageCode];
        if (!attachmentName || (!privacyPolicies._attachments || !privacyPolicies._attachments[attachmentName])) {
          return false;
        }

        const attachment = privacyPolicies._attachments[attachmentName];
        if (attachment.content_type !== this.ACCEPTED_CONTENT_TYPE) {
          return false;
        }

        const encodedContent = attachment.data;
        const decodedContent = this.decodeUnicode(encodedContent);
        return {
          language: languageCode,
          digest: attachment.digest,
          html: this.sanitizer.sanitize(SecurityContext.HTML, decodedContent),
        };
      })
      .catch(err => console.error('Error while fetching privacy policies', err));
  }
}
