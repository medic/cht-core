describe('PrivacyPolicies Service', () => {
  let service;
  let localMedicDb;
  let db;
  let Language;
  let userSettings;
  let clock;
  let sanitize;

  beforeEach(() => {
    module('adminApp');
    module($provide => {
      localMedicDb = { get: sinon.stub(), put: sinon.stub() };
      db = sinon.stub();
      db.withArgs().returns(localMedicDb);
      Language = sinon.stub();
      sanitize = sinon.stub().callsFake(i => i);
      userSettings = sinon.stub();

      $provide.value('Language', Language);
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.value('$sanitize', sanitize);
      $provide.value('DB', db);
      $provide.value('UserSettings', userSettings);
    });
    inject(_PrivacyPolicies_ => service = _PrivacyPolicies_);
  });

  afterEach(() => {
    clock && clock.restore();
    sinon.restore();
  });

  describe('hasAccepted', () => {
    it('should return false/true when no privacy polices doc', () => {
      Language.resolves('en');
      localMedicDb.get.rejects({ status: 404 });
      userSettings.resolves({ _id: 'org.couchdb.user:user', known: true });

      return service.hasAccepted().then(result => {
        chai.expect(result).to.deep.equal({ privacyPolicy: false, accepted: true });
        chai.expect(Language.callCount).to.equal(1);
        chai.expect(localMedicDb.get.callCount).to.equal(1);
        chai.expect(localMedicDb.get.args[0]).to.deep.equal(['privacy-policies', { attachments: false }]);
        chai.expect(userSettings.callCount).to.equal(1);
      });
    });

    it('should return false/true when old privacy policies were accepted', () => {
      Language.resolves('en');
      localMedicDb.get.rejects({ status: 404 });
      userSettings.resolves({
        _id: 'user',
        privacy_policy_acceptance_log: [{ language: 'en', digest: 'digest' }],
      });

      return service.hasAccepted().then(result => {
        chai.expect(result).to.deep.equal({ privacyPolicy: false, accepted: true });
      });
    });

    it('should return false true when no privacy policy for current language', () => {
      Language.resolves('sw');
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
          'the_fr': { digest: 'digest' },
          rand1: { digest: 'something' },
          rand3: { digst: 'other' },
        },
      };
      localMedicDb.get.resolves(privacyPoliciesDoc);
      userSettings.resolves({ _id: 'org.couchdb.user:user', known: true });

      return service.hasAccepted().then(result => {
        chai.expect(result).to.deep.equal({ privacyPolicy: false, accepted: true });
      });
    });

    it('should return false when privacy policy attachment is missing', () => {
      Language.resolves('en');
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
          'the_fr': { digest: 'digest' },
          rand1: { digest: 'something' },
          rand3: { digst: 'other' },
        },
      };
      localMedicDb.get.resolves(privacyPoliciesDoc);
      userSettings.resolves({ _id: 'org.couchdb.user:user', known: true });

      return service.hasAccepted().then(result => {
        chai.expect(result).to.deep.equal({ privacyPolicy: false, accepted: true });
      });
    });

    it('should return false/true when policy is of wrong type', () => {
      Language.resolves('en');
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
      localMedicDb.get.resolves(privacyPoliciesDoc);
      userSettings.resolves({ _id: 'org.couchdb.user:user', known: true });

      return service.hasAccepted().then(result => {
        chai.expect(result).to.deep.equal({ privacyPolicy: false, accepted: true });
      });
    });

    it('should return true/false when policies exist but were not accepted, with no log', () => {
      Language.resolves('fr');
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
      localMedicDb.get.resolves(privacyPoliciesDoc);
      userSettings.resolves({ _id: 'org.couchdb.user:user', known: true });

      return service.hasAccepted().then(result => {
        chai.expect(result).to.deep.equal({ privacyPolicy: true, accepted: false });
      });
    });

    it('should return true/false when policies exist but were not accepted', () => {
      Language.resolves('fr');
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
      localMedicDb.get.resolves(privacyPoliciesDoc);
      userSettings.resolves({
        _id: 'org.couchdb.user:user',
        known: true,
        privacy_policy_acceptance_log: [
          { language: 'en', digest: 'digest1' },
          { language: 'en', digest: 'digest2' },
          { language: 'fr', digest: 'digest1' },
          { language: 'fr', digest: 'digest2' },
        ]
      });

      return service.hasAccepted().then(result => {
        chai.expect(result).to.deep.equal({ privacyPolicy: true, accepted: false });
      });
    });

    it('should return true true when user has accepted', () => {
      Language.resolves('fr');
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
      localMedicDb.get.resolves(privacyPoliciesDoc);
      userSettings.resolves({
        _id: 'org.couchdb.user:user',
        known: true,
        privacy_policy_acceptance_log: [
          { language: 'en', digest: 'digest1' },
          { language: 'en', digest: 'digest2' },
          { language: 'fr', digest: 'digest1' },
          { language: 'fr', digest: 'digest2' },
        ]
      });

      return service.hasAccepted().then(result => {
        chai.expect(result).to.deep.equal({ privacyPolicy: true, accepted: true });
      });
    });

    it('should throw DB errors', () => {
      Language.resolves('fr');
      localMedicDb.get.rejects({ some: 'err' });

      return service
        .hasAccepted()
        .then(() => chai.assert.fail('should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ some: 'err' });
        });
    });
  });

  describe('accept', () => {
    it('should create acceptance log when it does not exist', () => {
      userSettings.resolves({ _id: 'user_id', known: true });
      localMedicDb.put.resolves();
      clock = sinon.useFakeTimers(6000);

      return service.accept({ language: 'en', digest: 'the_digest' }).then(() => {
        chai.expect(userSettings.callCount).to.equal(1);
        chai.expect(localMedicDb.put.callCount).to.equal(1);
        chai.expect(localMedicDb.put.args[0]).to.deep.equal([{
          _id: 'user_id',
          known: true,
          privacy_policy_acceptance_log: [{
            language: 'en',
            digest: 'the_digest',
            accepted_at: 6000,
          }],
        }]);
      });
    });

    it('should update existing acceptance log', () => {
      userSettings.resolves({
        _id: 'user_id',
        _rev: '223',
        known: true,
        privacy_policy_acceptance_log: [{
          language: 'fr',
          digest: 'frd',
          accepted_at: 1234,
        }],
      });
      localMedicDb.put.resolves();
      clock = sinon.useFakeTimers(9568);

      return service.accept({ language: 'en', digest: 'dig' }).then(() => {
        chai.expect(userSettings.callCount).to.equal(1);
        chai.expect(localMedicDb.put.callCount).to.equal(1);
        chai.expect(localMedicDb.put.args[0]).to.deep.equal([{
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
    });

    it('should update previous acceptance log', () => {
      userSettings.resolves({
        _id: 'user_id',
        _rev: '223',
        known: true,
        privacy_policy_acceptance_log: [{
          language: 'en',
          digest: 'frd',
          accepted_at: 1234,
        }],
      });

      clock = sinon.useFakeTimers(6987);

      return service.accept({ language: 'en', digest: 'my_digest' }).then(() => {
        chai.expect(userSettings.callCount).to.equal(1);
        chai.expect(localMedicDb.put.callCount).to.equal(1);
        chai.expect(localMedicDb.put.args[0]).to.deep.equal([{
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
    });

    it('should throw errors', () => {
      userSettings.resolves({
        _id: 'user_id',
        _rev: '223',
        known: true,
        privacy_policy_acceptance_log: [{
          language: 'en',
          digest: 'frd',
          accepted_at: 1234,
        }],
      });
      localMedicDb.put.rejects({ my: 'err' });
      clock = sinon.useFakeTimers(6987);

      return service.accept({ language: 'en', digest: 'my_digest' })
        .then(() => chai.assert.fail('Should hve thrown'))
        .catch(err => {
          chai.expect(localMedicDb.put.callCount).to.equal(1);
          chai.expect(err).to.deep.equal({ my: 'err' });
        });
    });
  });

  describe('getPrivacyPolicy', () => {
    it('should return nothing when no policy found', () => {
      Language.resolves('ne');
      localMedicDb.get.resolves({
        _id: 'privacy-policies',
        privacy_policies: {
          en: 'en_html',
          fr: 'fr.html',
        },
        _attachments: {
          'en_html': { data: 'aaaa' },
          'fr.html': { data: 'bbbb' },
        },
      });

      return service.getPrivacyPolicy().then(result => {
        chai.expect(result).to.equal(false);
        chai.expect(Language.callCount).to.equal(1);
        chai.expect(localMedicDb.get.callCount).to.equal(1);
        chai.expect(localMedicDb.get.args[0]).to.deep.equal(['privacy-policies', { attachments: true }]);
        chai.expect(sanitize.callCount).to.equal(0);
      });
    });

    it('should return nothing when no attachment found', () => {
      Language.resolves('ne');
      localMedicDb.get.resolves({
        _id: 'privacy-policies',
        privacy_policies: {
          en: 'en_html',
          fr: 'fr.html',
          ne: 'some_ne',
        },
        _attachments: {
          'en_html': { data: 'aaaa' },
          'fr.html': { data: 'bbbb' },
          'ne': { data: 'cccc' },
        },
      });

      return service.getPrivacyPolicy().then(result => {
        chai.expect(result).to.equal(false);
        chai.expect(Language.callCount).to.equal(1);
        chai.expect(localMedicDb.get.callCount).to.equal(1);
        chai.expect(localMedicDb.get.args[0]).to.deep.equal(['privacy-policies', { attachments: true }]);
        chai.expect(sanitize.callCount).to.equal(0);
      });
    });

    it('should return nothing when attachment is wrong type', () => {
      Language.resolves('ne');
      localMedicDb.get.resolves({
        _id: 'privacy-policies',
        privacy_policies: {
          en: 'en_html',
          fr: 'fr.html',
          ne: 'ne.json',
        },
        _attachments: {
          'en_html': { data: 'aaaa' },
          'fr.html': { data: 'bbbb' },
          'ne.json': { data: 'bbbb', content_type: 'application/json' },
        },
      });

      return service.getPrivacyPolicy().then(result => {
        chai.expect(result).to.equal(false);
        chai.expect(Language.callCount).to.equal(1);
        chai.expect(localMedicDb.get.callCount).to.equal(1);
        chai.expect(localMedicDb.get.args[0]).to.deep.equal(['privacy-policies', { attachments: true }]);
        chai.expect(sanitize.callCount).to.equal(0);
      });
    });

    it('should return decoded content when found', () => {
      const html = '<div>this <span>is</span> my <strong>star</strong></div>';
      Language.resolves('sw');
      localMedicDb.get.resolves({
        _id: 'privacy-policies',
        privacy_policies: {
          en: 'en.h',
          fr: 'fr.d',
          sw: 'northwest',
        },
        _attachments: {
          'en.h': { data: 'aaaa' },
          'fr.d': { data: 'bbbb' },
          'northwest': { data: btoa(html), digest: 'md5', content_type: 'text/html' },
        },
      });

      return service.getPrivacyPolicy().then(result => {
        chai.expect(result).to.deep.equal({
          digest: 'md5',
          language: 'sw',
          html: html,
        });
        chai.expect(Language.callCount).to.equal(1);
        chai.expect(localMedicDb.get.callCount).to.equal(1);
        chai.expect(localMedicDb.get.args[0]).to.deep.equal(['privacy-policies', { attachments: true }]);
        chai.expect(sanitize.callCount).to.equal(1);
        chai.expect(sanitize.args[0]).to.deep.equal([html]);
      });
    });

    it('should handle utf8 characters', () => {
      // this is also stolen from StackOverflow
      const b64EncodeUnicode = str => {
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
          function toSolidBytes(match, p1) {
            return String.fromCharCode('0x' + p1);
          }));
      };
      const html = 'Behold this list of emojis: 😂 😒 😔 😚 😠';
      Language.resolves('hi');
      localMedicDb.get.resolves({
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

      return service.getPrivacyPolicy().then(result => {
        chai.expect(result).to.deep.equal({
          digest: 'md5',
          language: 'hi',
          html: html,
        });
      });
    });
  });

  describe('decodeUnicode', () => {
    it('should return decoded html', () => {
      const html = '<a>html</a>';
      const result = service.decodeUnicode(btoa(html));
      chai.expect(result).to.equal(html);
    });
  });

});
