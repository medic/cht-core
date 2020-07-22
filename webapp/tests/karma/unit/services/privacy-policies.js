describe('PrivacyPolicies Service', () => {
  let service;
  let localMetaDb;
  let localMedicDb;
  let db;
  let dbSync;
  let Language;
  let clock;
  let sce;

  beforeEach(() => {
    module('inboxApp');
    module($provide => {
      localMetaDb = { get: sinon.stub(), put: sinon.stub() };
      localMedicDb = { get: sinon.stub() };
      db = sinon.stub();
      db.withArgs({ meta: true }).returns(localMetaDb);
      db.withArgs().returns(localMedicDb);
      Language = sinon.stub();
      dbSync = { syncMetaDoc: sinon.stub() };
      sce = { trustAsHtml: sinon.stub().callsFake(i => i) };

      $provide.value('Language', Language);
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.value('$sce', sce);
      $provide.value('DB', db);
      $provide.value('DBSync', dbSync);
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
      localMetaDb.get.rejects({ status: 404 });
      dbSync.syncMetaDoc.resolves();

      return service.hasAccepted().then(result => {
        chai.expect(result).to.deep.equal({ privacyPolicy: false, accepted: true });
        chai.expect(Language.callCount).to.equal(1);
        chai.expect(localMedicDb.get.callCount).to.equal(1);
        chai.expect(localMedicDb.get.args[0]).to.deep.equal(['privacy-policies', { attachments: false }]);
        chai.expect(localMetaDb.get.callCount).to.equal(1);
        chai.expect(localMetaDb.get.args[0]).to.deep.equal(['privacy-policy-acceptance']);
        chai.expect(dbSync.syncMetaDoc.callCount).to.equal(1);
        chai.expect(dbSync.syncMetaDoc.args[0]).to.deep.equal([['privacy-policy-acceptance']]);
      });
    });

    it('should return false/true when old privacy policies were accepted', () => {
      Language.resolves('en');
      localMedicDb.get.rejects({ status: 404 });
      localMetaDb.get.resolves({ _id: 'privacy-policy-acceptance', accepted: { en: 'digest' } });
      dbSync.syncMetaDoc.resolves();

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
      localMetaDb.get.resolves({ _id: 'privacy-policy-acceptance', accepted: { en: 'digest' } });
      dbSync.syncMetaDoc.resolves();

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
      localMetaDb.get.resolves({ _id: 'privacy-policy-acceptance', accepted: { en: 'digest' } });
      dbSync.syncMetaDoc.resolves();

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
      localMetaDb.get.resolves({ _id: 'privacy-policy-acceptance', accepted: { } });
      dbSync.syncMetaDoc.resolves();

      return service.hasAccepted().then(result => {
        chai.expect(result).to.deep.equal({ privacyPolicy: false, accepted: true });
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
      localMetaDb.get.resolves({ _id: 'privacy-policy-acceptance', accepted: { en: { digest: 'digest' } } });
      dbSync.syncMetaDoc.resolves();

      return service.hasAccepted().then(result => {
        chai.expect(result).to.deep.equal({ privacyPolicy: true, accepted: false });
      });
    });

    it('should return true false when policies exist and have different digest', () => {
      Language.resolves('fr');
      const privacyPoliciesDoc = {
        _id: 'privacy-policies',
        privacy_policies: {
          en: 'en.html',
          fr: 'fra.html',
        },
        _attachments: {
          'en.html': { digest: 'digest', content_type: 'text/html' },
          'fra.html': { digest: 'newdigest', content_type: 'text/html' },
        },
      };
      localMedicDb.get.resolves(privacyPoliciesDoc);
      localMetaDb.get.resolves({ _id: 'privacy-policy-acceptance', accepted: { fr: { digest: 'olddigest' } } });
      dbSync.syncMetaDoc.resolves();

      return service.hasAccepted().then(result => {
        chai.expect(result).to.deep.equal({ privacyPolicy: true, accepted: false });
      });
    });

    it('should return true true when local meta doc has acceptance', () => {
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
      localMetaDb.get.resolves({ _id: 'privacy-policy-acceptance', accepted: { fr: { digest: 'digest1' } } });
      dbSync.syncMetaDoc.resolves();

      return service.hasAccepted().then(result => {
        chai.expect(result).to.deep.equal({ privacyPolicy: true, accepted: true });
      });
    });

    it('should throw DB errors', () => {
      Language.resolves('fr');
      localMedicDb.get.rejects({ some: 'err' });
      localMetaDb.get.rejects();
      dbSync.syncMetaDoc.resolves();

      return service
        .hasAccepted()
        .then(() => chai.assert.fail('should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ some: 'err' });
        });
    });

    it('should catch sync errors', () => {
      Language.resolves('fr');
      const privacyPoliciesDoc = {
        _id: 'privacy-policies',
        privacy_policies: {
          en: 'en',
          fr: 'fr',
        },
        _attachments: {
          en: { digest: 'digest', content_type: 'text/html' },
          fr: { digest: 'digest1', content_type: 'text/html' },
        },
      };
      localMedicDb.get.resolves(privacyPoliciesDoc);
      localMetaDb.get.resolves({ _id: 'privacy-policy-acceptance', accepted: { fr: { digest: 'digest1' } } });
      dbSync.syncMetaDoc.rejects();

      return service.hasAccepted().then(result => {
        chai.expect(result).to.deep.equal({ privacyPolicy: true, accepted: true });
      });
    });
  });

  describe('accept', () => {
    it('should create acceptance log when it does not exist', () => {
      localMetaDb.get.rejects({ status: 404 });
      localMetaDb.put.resolves();
      clock = sinon.useFakeTimers(6000);

      return service.accept({ language: 'en', digest: 'the_digest' }).then(() => {
        chai.expect(localMetaDb.get.callCount).to.equal(1);
        chai.expect(localMetaDb.get.args[0]).to.deep.equal(['privacy-policy-acceptance']);
        chai.expect(localMetaDb.put.callCount).to.equal(1);
        chai.expect(localMetaDb.put.args[0]).to.deep.equal([{
          _id: 'privacy-policy-acceptance',
          accepted: {
            en: {
              digest: 'the_digest',
              accepted_at: 6000,
            }
          }
        }]);
      });
    });

    it('should update previous acceptance log', () => {
      localMetaDb.get.resolves({ _id: 'privacy-policy-acceptance', accepted: { fr: { digest: 'frd' } }, _rev: 1 });
      localMetaDb.put.resolves();
      clock = sinon.useFakeTimers(988);

      return service.accept({ language: 'en', digest: 'dig' }).then(() => {
        chai.expect(localMetaDb.get.callCount).to.equal(1);
        chai.expect(localMetaDb.get.args[0]).to.deep.equal(['privacy-policy-acceptance']);
        chai.expect(localMetaDb.put.callCount).to.equal(1);
        chai.expect(localMetaDb.put.args[0]).to.deep.equal([{
          _id: 'privacy-policy-acceptance',
          _rev: 1,
          accepted: {
            fr: { digest: 'frd' },
            en: {
              digest: 'dig',
              accepted_at: 988,
            }
          }
        }]);
      });
    });

    it('should update previous acceptance log and overwrite', () => {
      localMetaDb.get.resolves({ _id: 'privacy-policy-acceptance', accepted: { en: { digest: 'frd' } }, _rev: 2 });
      localMetaDb.put.resolves();
      clock = sinon.useFakeTimers(6987);

      return service.accept({ language: 'en', digest: 'my_digest' }).then(() => {
        chai.expect(localMetaDb.get.callCount).to.equal(1);
        chai.expect(localMetaDb.get.args[0]).to.deep.equal(['privacy-policy-acceptance']);
        chai.expect(localMetaDb.put.callCount).to.equal(1);
        chai.expect(localMetaDb.put.args[0]).to.deep.equal([{
          _id: 'privacy-policy-acceptance',
          _rev: 2,
          accepted: {
            en: {
              digest: 'my_digest',
              accepted_at: 6987,
            }
          }
        }]);
      });
    });

    it('should catch errors', () => {
      localMetaDb.get.resolves({ _id: 'privacy-policy-acceptance', accepted: { en: { digest: 'frd' } }, _rev: 2 });
      localMetaDb.put.rejects({ my: 'err' });
      clock = sinon.useFakeTimers(6987);

      return service.accept({ language: 'en', digest: 'my_digest' }).then(() => {
        chai.expect(localMetaDb.put.callCount).to.equal(1);
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
        chai.expect(sce.trustAsHtml.callCount).to.equal(0);
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
        chai.expect(sce.trustAsHtml.callCount).to.equal(0);
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
        chai.expect(sce.trustAsHtml.callCount).to.equal(0);
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
        chai.expect(sce.trustAsHtml.callCount).to.equal(1);
        chai.expect(sce.trustAsHtml.args[0]).to.deep.equal([html]);
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

  describe('getTrustedHtml', () => {
    it('should return trusted decoded html', () => {
      const html = '<a>html</a>';
      const result = service.getTrustedHtml(btoa(html));
      chai.expect(result).to.equal(html);
      chai.expect(sce.trustAsHtml.callCount).to.equal(1);
      chai.expect(sce.trustAsHtml.args[0]).to.deep.equal([html]);
    });
  });

});
