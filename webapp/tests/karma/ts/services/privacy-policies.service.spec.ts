import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { SecurityContext } from '@angular/core';
import sinon from 'sinon';
import { expect, assert } from 'chai';

import { PrivacyPoliciesService } from '@mm-services/privacy-policies.service';
import { DbService } from '@mm-services/db.service';
import { LanguageService } from '@mm-services/language.service';
import { UserSettingsService } from '@mm-services/user-settings.service';

describe('PrivacyPoliciesService', () => {
  let service: PrivacyPoliciesService;
  let dbService;
  let languageService;
  let userSettingsService;
  let localDb;
  let sanitizer;
  let clock;

  beforeEach(() => {
    localDb = { get: sinon.stub(), put: sinon.stub() };
    dbService = { get: () => localDb };
    languageService = { get: sinon.stub() };
    userSettingsService = { get: sinon.stub(), put: sinon.stub() };
    sanitizer = {
      sanitize: sinon.stub().callsFake((context, html) => html)
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: dbService },
        { provide: LanguageService, useValue: languageService },
        { provide: UserSettingsService, useValue: userSettingsService },
        { provide: DomSanitizer, useValue: sanitizer }
      ]
    });

    service = TestBed.inject(PrivacyPoliciesService);
  });

  afterEach(() => {
    clock && clock.restore();
    sinon.restore();
  });

  describe('hasAccepted', () => {
    it('should return false/true when no privacy polices doc', async () => {
      languageService.get.resolves('en');
      localDb.get.rejects({ status: 404 });
      userSettingsService.get.resolves({ _id: 'org.couchdb.user:user', known: true });

      const result = await service.hasAccepted();

      expect(result).to.deep.equal({ privacyPolicy: false, accepted: true });
      expect(languageService.get.callCount).to.equal(1);
      expect(localDb.get.callCount).to.equal(1);
      expect(localDb.get.args[0]).to.deep.equal([ 'privacy-policies', { attachments: false } ]);
      expect(userSettingsService.get.callCount).to.equal(1);
    });

    it('should return false/true when old privacy policies were accepted', async () => {
      languageService.get.resolves('en');
      localDb.get.rejects({ status: 404 });
      userSettingsService.get.resolves({
        _id: 'user',
        privacy_policy_acceptance_log: [ { language: 'en', digest: 'digest' } ],
      });

      const result = await service.hasAccepted();

      expect(result).to.deep.equal({ privacyPolicy: false, accepted: true });
    });

    it('should return false true when no privacy policy for current language', async () => {
      languageService.get.resolves('sw');
      const privacyPoliciesDoc = {
        _id: 'privacy-policies',
        privacy_policies: {
          en: 'the_en_a.html',
          fr: 'the_fr',
          r1: 'rand1',
          r2: 'rand2',
        },
        _attachments: {
          'the_en_a.html': { digest: 'digest' },
          the_fr: { digest: 'digest' },
          rand1: { digest: 'something' },
          rand3: { digst: 'other' },
        },
      };
      localDb.get.resolves(privacyPoliciesDoc);
      userSettingsService.get.resolves({ _id: 'org.couchdb.user:user', known: true });

      const result = await service.hasAccepted();

      expect(result).to.deep.equal({ privacyPolicy: false, accepted: true });
    });

    it('should return false when privacy policy attachment is missing', async () => {
      languageService.get.resolves('en');
      const privacyPoliciesDoc = {
        _id: 'privacy-policies',
        privacy_policies: {
          en: 'missing.html',
          fr: 'the_fr',
          r1: 'rand1',
          r2: 'rand2',
        },
        _attachments: {
          'the_en_a.html': { digest: 'digest' },
          the_fr: { digest: 'digest' },
          rand1: { digest: 'something' },
          rand3: { digst: 'other' },
        },
      };
      localDb.get.resolves(privacyPoliciesDoc);
      userSettingsService.get.resolves({ _id: 'org.couchdb.user:user', known: true });

      const result = await service.hasAccepted();

      expect(result).to.deep.equal({ privacyPolicy: false, accepted: true });
    });

    it('should return false/true when policy is of wrong type', async () => {
      languageService.get.resolves('en');
      const privacyPoliciesDoc = {
        _id: 'privacy-policies',
        privacy_policies: {
          en: 'en.jpg',
          fr: 'fr.html',
        },
        _attachments: {
          'en.jpg': { digest: 'digest', content_type: 'image/jpeg' },
          'fr.html': { digest: 'digest' },
        },
      };
      localDb.get.resolves(privacyPoliciesDoc);
      userSettingsService.get.resolves({ _id: 'org.couchdb.user:user', known: true });

      const result = await service.hasAccepted();

      expect(result).to.deep.equal({ privacyPolicy: false, accepted: true });
    });

    it('should return true/false when policies exist but were not accepted, with no log', async () => {
      languageService.get.resolves('fr');
      const privacyPoliciesDoc = {
        _id: 'privacy-policies',
        privacy_policies: {
          en: 'en.html',
          fr: 'fr_att.html',
        },
        _attachments: {
          'en.html': { digest: 'digest', content_type: 'text/html' },
          'fr_att.html': { digest: 'digest', content_type: 'text/html' },
        },
      };
      localDb.get.resolves(privacyPoliciesDoc);
      userSettingsService.get.resolves({ _id: 'org.couchdb.user:user', known: true });

      const result = await service.hasAccepted();

      expect(result).to.deep.equal({ privacyPolicy: true, accepted: false });
    });

    it('should return true/false when policies exist but were not accepted', async () => {
      languageService.get.resolves('fr');
      const privacyPoliciesDoc = {
        _id: 'privacy-policies',
        privacy_policies: {
          en: 'en.html',
          fr: 'fr_att.html',
        },
        _attachments: {
          'en.html': { digest: 'digest', content_type: 'text/html' },
          'fr_att.html': { digest: 'digest', content_type: 'text/html' },
        },
      };
      localDb.get.resolves(privacyPoliciesDoc);
      userSettingsService.get.resolves({
        _id: 'org.couchdb.user:user',
        known: true,
        privacy_policy_acceptance_log: [
          { language: 'en', digest: 'digest1' },
          { language: 'en', digest: 'digest2' },
          { language: 'fr', digest: 'digest1' },
          { language: 'fr', digest: 'digest2' },
        ]
      });

      const result = await service.hasAccepted();

      expect(result).to.deep.equal({ privacyPolicy: true, accepted: false });
    });

    it('should return true true when user has accepted', async () => {
      languageService.get.resolves('fr');
      const privacyPoliciesDoc = {
        _id: 'privacy-policies',
        privacy_policies: {
          en: 'eng.html',
          fr: 'fr.html',
        },
        _attachments: {
          'eng.html': { digest: 'digest', content_type: 'text/html' },
          'fr.html': { digest: 'digest1', content_type: 'text/html' },
        },
      };
      localDb.get.resolves(privacyPoliciesDoc);
      userSettingsService.get.resolves({
        _id: 'org.couchdb.user:user',
        known: true,
        privacy_policy_acceptance_log: [
          { language: 'en', digest: 'digest1' },
          { language: 'en', digest: 'digest2' },
          { language: 'fr', digest: 'digest1' },
          { language: 'fr', digest: 'digest2' },
        ]
      });

      const result = await service.hasAccepted();

      expect(result).to.deep.equal({ privacyPolicy: true, accepted: true });
    });

    it('should throw DB errors', () => {
      const consoleErrorMock = sinon.stub(console, 'error');
      languageService.get.resolves('fr');
      localDb.get.rejects({ some: 'err' });

      return service
        .hasAccepted()
        .then(() => assert.fail('should have thrown'))
        .catch(err => {
          expect(err).to.deep.equal({ some: 'err' });
          expect(consoleErrorMock.callCount).to.equal(1);
          expect(consoleErrorMock.args[0][0]).to.equal('Error retrieving privacy policies');
        });
    });
  });

  describe('accept', () => {
    it('should create acceptance log when it does not exist', async () => {
      userSettingsService.get.resolves({ _id: 'user_id', known: true });
      userSettingsService.put.resolves();
      clock = sinon.useFakeTimers(6000);

      await service.accept({ language: 'en', digest: 'the_digest' });

      expect(userSettingsService.get.callCount).to.equal(1);
      expect(userSettingsService.put.callCount).to.equal(1);
      expect(userSettingsService.put.args[0]).to.deep.equal([{
        _id: 'user_id',
        known: true,
        privacy_policy_acceptance_log: [{
          language: 'en',
          digest: 'the_digest',
          accepted_at: 6000,
        }],
      }]);
    });

    it('should update existing acceptance log', async () => {
      userSettingsService.get.resolves({
        _id: 'user_id',
        _rev: '223',
        known: true,
        privacy_policy_acceptance_log: [{
          language: 'fr',
          digest: 'frd',
          accepted_at: 1234,
        }],
      });
      userSettingsService.put.resolves();
      clock = sinon.useFakeTimers(9568);

      await service.accept({ language: 'en', digest: 'dig' });

      expect(userSettingsService.get.callCount).to.equal(1);
      expect(userSettingsService.put.callCount).to.equal(1);
      expect(userSettingsService.put.args[0]).to.deep.equal([{
        _id: 'user_id',
        _rev: '223',
        known: true,
        privacy_policy_acceptance_log: [
          {
            language: 'fr',
            digest: 'frd',
            accepted_at: 1234,
          },
          {
            language: 'en',
            digest: 'dig',
            accepted_at: 9568,
          },
        ],
      }]);
    });

    it('should update previous acceptance log', async () => {
      userSettingsService.get.resolves({
        _id: 'user_id',
        _rev: '223',
        known: true,
        privacy_policy_acceptance_log: [{
          language: 'en',
          digest: 'frd',
          accepted_at: 1234,
        }],
      });
      userSettingsService.put.resolves();
      clock = sinon.useFakeTimers(6987);

      await service.accept({ language: 'en', digest: 'my_digest' });

      expect(userSettingsService.get.callCount).to.equal(1);
      expect(userSettingsService.put.callCount).to.equal(1);
      expect(userSettingsService.put.args[0]).to.deep.equal([{
        _id: 'user_id',
        _rev: '223',
        known: true,
        privacy_policy_acceptance_log: [
          {
            language: 'en',
            digest: 'frd',
            accepted_at: 1234,
          },
          {
            language: 'en',
            digest: 'my_digest',
            accepted_at: 6987,
          },
        ],
      }]);
    });

    it('should throw errors', () => {
      userSettingsService.get.resolves({
        _id: 'user_id',
        _rev: '223',
        known: true,
        privacy_policy_acceptance_log: [{
          language: 'en',
          digest: 'frd',
          accepted_at: 1234,
        }],
      });
      userSettingsService.put.rejects({ my: 'err' });
      clock = sinon.useFakeTimers(6987);

      return service
        .accept({ language: 'en', digest: 'my_digest' })
        .then(() => assert.fail('Should hve thrown'))
        .catch(err => {
          expect(userSettingsService.put.callCount).to.equal(1);
          expect(err).to.deep.equal({ my: 'err' });
        });
    });
  });

  describe('getPrivacyPolicy', () => {
    it('should return nothing when no policy found', async () => {
      languageService.get.resolves('ne');
      localDb.get.resolves({
        _id: 'privacy-policies',
        privacy_policies: {
          en: 'en_html',
          fr: 'fr.html',
        },
        _attachments: {
          en_html: { data: 'aaaa' },
          'fr.html': { data: 'bbbb' },
        },
      });

      const result = await service.getPrivacyPolicy();

      expect(result).to.equal(false);
      expect(languageService.get.callCount).to.equal(1);
      expect(localDb.get.callCount).to.equal(1);
      expect(localDb.get.args[0]).to.deep.equal(['privacy-policies', { attachments: true }]);
      expect(sanitizer.sanitize.callCount).to.equal(0);
    });

    it('should return nothing when no attachment found', async () => {
      languageService.get.resolves('ne');
      localDb.get.resolves({
        _id: 'privacy-policies',
        privacy_policies: {
          en: 'en_html',
          fr: 'fr.html',
          ne: 'some_ne',
        },
        _attachments: {
          en_html: { data: 'aaaa' },
          'fr.html': { data: 'bbbb' },
          ne: { data: 'cccc' },
        },
      });

      const result = await service.getPrivacyPolicy();

      expect(result).to.equal(false);
      expect(languageService.get.callCount).to.equal(1);
      expect(localDb.get.callCount).to.equal(1);
      expect(localDb.get.args[0]).to.deep.equal(['privacy-policies', { attachments: true }]);
      expect(sanitizer.sanitize.callCount).to.equal(0);
    });

    it('should return nothing when attachment is wrong type', async () => {
      languageService.get.resolves('ne');
      localDb.get.resolves({
        _id: 'privacy-policies',
        privacy_policies: {
          en: 'en_html',
          fr: 'fr.html',
          ne: 'ne.json',
        },
        _attachments: {
          en_html: { data: 'aaaa' },
          'fr.html': { data: 'bbbb' },
          'ne.json': { data: 'bbbb', content_type: 'application/json' },
        },
      });

      const result = await service.getPrivacyPolicy();

      expect(result).to.equal(false);
      expect(languageService.get.callCount).to.equal(1);
      expect(localDb.get.callCount).to.equal(1);
      expect(localDb.get.args[0]).to.deep.equal(['privacy-policies', { attachments: true }]);
      expect(sanitizer.sanitize.callCount).to.equal(0);
    });

    it('should return decoded content when found', async () => {
      const html = '<div>this <span>is</span> my <strong>star</strong></div>';
      languageService.get.resolves('sw');
      localDb.get.resolves({
        _id: 'privacy-policies',
        privacy_policies: {
          en: 'en.h',
          fr: 'fr.d',
          sw: 'northwest',
        },
        _attachments: {
          'en.h': { data: 'aaaa' },
          'fr.d': { data: 'bbbb' },
          northwest: { data: btoa(html), digest: 'md5', content_type: 'text/html' },
        },
      });

      const result = await service.getPrivacyPolicy();

      expect(result).to.deep.equal({
        digest: 'md5',
        language: 'sw',
        html: html,
      });
      expect(languageService.get.callCount).to.equal(1);
      expect(localDb.get.callCount).to.equal(1);
      expect(localDb.get.args[0]).to.deep.equal(['privacy-policies', { attachments: true }]);
      expect(sanitizer.sanitize.callCount).to.equal(1);
      expect(sanitizer.sanitize.args[0]).to.deep.equal([SecurityContext.HTML, html]);
    });

    it('should handle utf8 characters', async () => {
      // this is also stolen from StackOverflow
      const b64EncodeUnicode = str => {
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
          function toSolidBytes(match, p1) {
            // @ts-ignore
            return String.fromCharCode('0x' + p1);
          }));
      };
      const html = 'Behold this list of emojis: 😂 😒 😔 😚 😠';
      languageService.get.resolves('hi');
      localDb.get.resolves({
        _id: 'privacy-policies',
        privacy_policies: {
          en: 'en.html',
          fr: 'fr.data',
          hi: 'hi.file',
        },
        _attachments: {
          'en.html': { data: 'aaaa' },
          'fr.data': { data: 'bbbb' },
          'hi.file': { data: b64EncodeUnicode(html), digest: 'md5', content_type: 'text/html' },
        },
      });

      const result = await service.getPrivacyPolicy();

      expect(result).to.deep.equal({
        digest: 'md5',
        language: 'hi',
        html: html,
      });
    });
  });

  describe('decodeUnicode', () => {
    it('should return decoded html', () => {
      const html = '<a>html</a>';

      const result = service.decodeUnicode(btoa(html));

      expect(result).to.equal(html);
    });
  });
});
