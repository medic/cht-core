describe('Display Privacy Policies controller', function() {

  'use strict';

  let createController;
  let scope;
  let db;
  let languages;
  let modal;

  beforeEach(module('adminApp'));

  beforeEach(inject(function($rootScope, $controller) {
    scope = $rootScope.$new();
    db = {
      get: sinon.stub(),
      put: sinon.stub(),
    };
    languages = sinon.stub().resolves([
      { code: 'en', name: 'English' },
      { code: 'sw', name: 'Swahili' }
    ]);
    modal = sinon.stub();

    createController = () => {
      return $controller('DisplayPrivacyPoliciesCtrl', {
        '$q': Q,
        '$log': { error: sinon.stub() },
        '$scope': scope,
        'DB': () => db,
        'Languages': languages,
        'Modal': modal,
      });
    };
  }));

  afterEach(() => sinon.restore());

  describe('loading', () => {
    it('should load privacy policy doc', () => {
      db.get.resolves({
        _id: 'privacy-policies',
        privacy_policies: {
          en: 'the_en_attachment'
        },
        _attachments: {
          the_en_attachment: {
            content_type: 'html',
            digest: 'somedigest',
            data: 'blablabla'
          }
        },
      });
      const controller = createController();
      return controller.setupPromise.then(() => {
        chai.expect(db.get.callCount).to.equal(1);
        chai.expect(db.get.args[0]).to.deep.equal(['privacy-policies', { attachments: true }]);
        chai.expect(scope.privacyPolicies).to.deep.equal({
          en: {
            content_type: 'html',
            digest: 'somedigest',
            data: 'blablabla'
          },
          sw: {},
        });
      });
    });

    it('should not crash if privacy policies doc does not exist', () => {
      db.get.rejects({ status: 404 });
      const controller = createController();
      return controller.setupPromise.then(() => {
        chai.expect(db.get.callCount).to.equal(1);
        chai.expect(db.get.args[0]).to.deep.equal(['privacy-policies', { attachments: true }]);
        chai.expect(scope.privacyPolicies).to.deep.equal({
          en: {},
          sw: {},
        });
      });
    });

    it('should handle missmatched attachments', () => {
      languages.resolves([
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Espanol' },
        { code: 'fr', name: 'French' },
      ]);
      db.get.resolves({
        _id: 'privacy-policies',
        privacy_policies: {
          en: 'not_en',
          fr: 'not_fr',
          es: 'yes_es',
          not_a_language: 'random',
          not_even_an_attachment: 'uber_random',
        },
        _attachments: {
          the_en_attachment: {
            content_type: 'html',
            digest: 'somedigest',
            data: 'blablabla',
          },
          the_fr_attachment: {
            content_type: 'html',
            digest: 'somedigest',
            data: 'blablablafr',
          },
          yes_es: {
            content_type: 'html',
            digest: 'somedigest',
            data: 'blablablaes',
          },
          random: {
            content_type: 'html',
            digest: 'random',
            data: 'blablablarandom',
          },
          random2: {
            content_type: 'html',
            digest: 'random',
            data: 'blablablarandom',
          },
        }
      });

      const controller = createController();
      return controller.setupPromise.then(() => {
        chai.expect(db.get.callCount).to.equal(1);
        chai.expect(db.get.args[0]).to.deep.equal(['privacy-policies', { attachments: true }]);
        chai.expect(scope.privacyPolicies).to.deep.equal({
          en: {},
          fr: {},
          es: {
            content_type: 'html',
            digest: 'somedigest',
            data: 'blablablaes',
          }
        });
      });
    });
  });

  describe('preview', () => {
    it('should preview the right attachment', () => {
      languages.resolves([
        { code: 'en', name: 'English' },
        { code: 'fr', name: 'Francais' },
        { code: 'es', name: 'Espanol' },
      ]);
      db.get.resolves({
        _id: 'privacy-policies',
        privacy_policies: {
          en: 'en.html',
          fr: 'the_fr',
          es: 'eshtml',
        },
        _attachments: {
          'en.html': {
            content_type: 'html',
            digest: 'digest_en',
            data: 'the english attachment'
          },
          'the_fr': {
            content_type: 'html',
            digest: 'digest_fr',
            data: 'l`attachement francais',
          },
          'eshtml': {
            content_type: 'html',
            digest: 'digest_es',
            data: 'el adjunto archivo espanol',
          }
        },
      });

      const controller = createController();
      return controller.setupPromise.then(() => {
        chai.expect(modal.callCount).to.equal(0);
        scope.preview({ code: 'fr', name: 'Francais' });
        chai.expect(modal.callCount).to.equal(1);
        chai.expect(modal.args[0][0].model).to.deep.equal({
          language: { code: 'fr', name: 'Francais' },
          attachment: {
            content_type: 'html',
            digest: 'digest_fr',
            data: 'l`attachement francais',
          },
        });

        scope.preview({ code: 'es', name: 'espanol' });
        chai.expect(modal.callCount).to.equal(2);
        chai.expect(modal.args[1][0].model).to.deep.equal({
          language: { code: 'es', name: 'espanol' },
          attachment: {
            content_type: 'html',
            digest: 'digest_es',
            data: 'el adjunto archivo espanol',
          },
        });
      });
    });
  });

  describe('update preview', () => {
    it('should do nothing for no update', () => {
      db.get.resolves({
        _id: 'privacy-policies',
        privacy_policies: {
          en: 'en.html',
        },
        _attachments: {
          'en.html': {
            content_type: 'html',
            digest: 'somedigest',
            data: 'blablabla'
          }
        },
      });

      const controller = createController();
      return controller.setupPromise.then(() => {
        scope.previewUpdate({ code: 'en' });
        chai.expect(modal.callCount).to.equal(0);
      });
    });

    it('should preview the right update', () => {
      languages.resolves([
        { code: 'en', name: 'English' },
        { code: 'fr', name: 'Francais' },
        { code: 'es', name: 'Espanol' },
      ]);

      db.get.resolves({
        _id: 'privacy-policies',
        privacy_policies: {
          en: 'en.html',
        },
        _attachments: {
          'en.html': {
            content_type: 'html',
            digest: 'somedigest',
            data: 'blablabla'
          }
        },
      });

      const controller = createController();
      return controller.setupPromise.then(() => {
        scope.updates = {
          en: 'the en file',
          es: 'the es file',
        };
        scope.previewUpdate({ code: 'en' });
        chai.expect(modal.callCount).to.equal(1);
        chai.expect(modal.args[0][0].model).to.deep.equal({
          language: { code: 'en' },
          file: 'the en file'
        });

        scope.previewUpdate({ code: 'fr' });
        chai.expect(modal.callCount).to.equal(1);

        scope.previewUpdate({ code: 'es' });
        chai.expect(modal.callCount).to.equal(2);
        chai.expect(modal.args[1][0].model).to.deep.equal({
          language: { code: 'es' },
          file: 'the es file'
        });
      });
    });
  });

  describe('delete', () => {
    it('should delete the attachment for the language code', () => {
      languages.resolves([
        { code: 'en', name: 'English' },
        { code: 'fr', name: 'Francais' },
        { code: 'es', name: 'Espanol' },
      ]);

      db.get.resolves({
        _id: 'privacy-policies',
        privacy_policies: {
          en: 'en.html',
          es: 'es.html',
        },
        _attachments: {
          'en.html': {
            content_type: 'html',
            digest: 'somedigest',
            data: 'blablabla'
          },
          'es.html': {
            content_type: 'html',
            digest: 'somedigest',
            data: 'olala'
          },
        },
      });

      const controller = createController();
      return controller.setupPromise.then(() => {
        chai.expect(scope.privacyPolicies).to.deep.equal({
          en: {
            content_type: 'html',
            digest: 'somedigest',
            data: 'blablabla'
          },
          es: {
            content_type: 'html',
            digest: 'somedigest',
            data: 'olala'
          },
          fr: {},
        });
        chai.expect(scope.deletes).to.deep.equal([]);
        scope.delete({ code: 'es' });
        chai.expect(scope.privacyPolicies).to.deep.equal({
          en: {
            content_type: 'html',
            digest: 'somedigest',
            data: 'blablabla'
          },
          es: {},
          fr: {},
        });
        chai.expect(scope.deletes).to.deep.equal(['es']);
      });
    });
  });

  describe('deleteUpdate', () => {
    it('should delete the requested update', () => {
      languages.resolves([
        { code: 'en', name: 'English' },
        { code: 'fr', name: 'Francais' },
        { code: 'es', name: 'Espanol' },
      ]);

      db.get.resolves({
        _id: 'privacy-policies',
        privacy_policies: {
          en: 'en.html',
          es: 'es.html',
        },
        _attachments: {
          'en.html': {
            content_type: 'html',
            digest: 'somedigest',
            data: 'blablabla'
          },
          'es.html': {
            content_type: 'html',
            digest: 'somedigest',
            data: 'olala'
          },
        },
      });

      const controller = createController();
      return controller.setupPromise.then(() => {
        scope.updates = {
          en: 'update en',
          es: 'update es',
        };

        scope.deleteUpdate({ code: 'es'});
        chai.expect(scope.updates).to.deep.equal({ en: 'update en' });
      });
    });
  });

  describe('submit', () => {
    it('should do nothing when no updates', () => {
      languages.resolves([
        { code: 'en', name: 'English' },
        { code: 'fr', name: 'Francais' },
        { code: 'es', name: 'Espanol' },
      ]);

      db.get
        .withArgs('privacy-policies', { attachments: true }).resolves({
          _id: 'privacy-policies',
          privacy_policies: {
            en: 'en',
            es: 'es',
          },
          _attachments: {
            en: {
              content_type: 'html',
              digest: 'somedigest',
              data: 'blablabla'
            },
            es: {
              content_type: 'html',
              digest: 'somedigest',
              data: 'olala'
            },
          },
        })
        .withArgs('privacy-policies', { attachments: false }).resolves({
          _id: 'privacy-policies',
          privacy_policies: {
            en: 'en',
            es: 'es',
          },
          _attachments: {
            en: {
              content_type: 'html',
              digest: 'somedigest',
              stub: true,
            },
            es: {
              content_type: 'html',
              digest: 'somedigest',
              stub: true,
            },
          },
        });

      const controller = createController();
      return controller.setupPromise
        .then(() => scope.submit())
        .then(() => {
          chai.expect(db.get.callCount).to.equal(1);
          chai.expect(db.put.callCount).to.equal(0);
        });
    });

    it('should do requested deletes and updates and skip non-html files', () => {
      languages.resolves([
        { code: 'en', name: 'English' }, // kept the same
        { code: 'fr', name: 'Francais' }, // updated
        { code: 'es', name: 'Espanol' }, // deleted and updated
        { code: 'hi', name: 'Hindi' }, // deleted
        { code: 'sw', name: 'Swahili' }, // new
        { code: 'ne', name: 'Nepali' }, // no change
        { code: 'nl', name: 'Dutch' }, // new non-html
      ]);

      db.get
        .withArgs('privacy-policies', { attachments: true }).onCall(0).resolves({
          _id: 'privacy-policies',
          privacy_policies: {
            en: 'en.htm',
            fr: 'fr.html',
            es: 'es',
            hi: 'hi.h',
          },
          _attachments: {
            'en.htm': {
              content_type: 'html',
              digest: 'digesten',
              data: 'dataen',
            },
            'fr.html': {
              content_type: 'html',
              digest: 'digestfr',
              data: 'datafr',
            },
            es: {
              content_type: 'html',
              digest: 'digestes',
              data: 'dataes',
            },
            'hi.h': {
              content_type: 'html',
              digest: 'digesthi',
              data: 'datahi',
            },
          },
        })
        .withArgs('privacy-policies', { attachments: true }).onCall(1).resolves({
          _id: 'privacy-policies',
          privacy_policies: {
            en: 'en.htm',
            fr: 'new_fr',
            es: 'new_es',
            sw: 'new_sw',
          },
          _attachments: {
            'en.htm': {
              content_type: 'html',
              digest: 'digesten',
              data: 'dataen',
            },
            'new_fr': {
              content_type: 'html',
              digest: 'digestfr',
              data: 'datafr-new',
            },
            'new_es': {
              content_type: 'html',
              digest: 'digestes',
              data: 'dataes-new',
            },
            'new_sw': {
              content_type: 'html',
              digest: 'digestsw',
              data: 'datasw',
            },
          },
        })
        .withArgs('privacy-policies', { attachments: false }).resolves({
          _id: 'privacy-policies',
          _rev: '3-lala',
          privacy_policies: {
            en: 'en.htm',
            fr: 'fr.html',
            es: 'es',
            hi: 'hi.h',
          },
          _attachments: {
            'en.htm': {
              content_type: 'html',
              digest: 'digesten',
              stub: true,
            },
            'fr.html': {
              content_type: 'html',
              digest: 'digestfr',
              stub: true,
            },
            es: {
              content_type: 'html',
              digest: 'digestes',
              stub: true,
            },
            'hi.h': {
              content_type: 'html',
              digest: 'digesthi',
              stub: true,
            },
          },
        });

      const controller = createController();
      return controller.setupPromise
        .then(() => {
          scope.updates = {
            fr: { type: 'text/html', some: 'other params', name: 'new_fr' },
            es: { type: 'text/html', name: 'new_es' },
            sw: { type: 'text/html', name: 'new_sw' },
            nl: { type: 'not-text/html', name: 'new_nl' },
          };
          scope.deletes = ['es', 'hi'];

          return scope.submit();
        })
        .then(() => {
          chai.expect(db.get.callCount).to.equal(3);
          chai.expect(db.get.args[1]).to.deep.equal(['privacy-policies', { attachments: false }]);
          chai.expect(db.get.args[2]).to.deep.equal(['privacy-policies', { attachments: true }]); // scope refreshed
          chai.expect(db.put.callCount).to.equal(1);
          chai.expect(db.put.args[0]).to.deep.equal([{
            _id: 'privacy-policies',
            _rev: '3-lala',
            privacy_policies: {
              en: 'en.htm',
              fr: 'new_fr',
              es: 'new_es',
              sw: 'new_sw',
            },
            _attachments: {
              'en.htm': {
                content_type: 'html',
                digest: 'digesten',
                stub: true,
              },
              'new_fr': {
                content_type: 'text/html',
                data: { type: 'text/html', some: 'other params', name: 'new_fr' },
              },
              'new_es': {
                content_type: 'text/html',
                data: { type: 'text/html', name: 'new_es' },
              },
              'new_sw': {
                content_type: 'text/html',
                data: { type: 'text/html', name: 'new_sw' },
              },
            },
          }]);

          chai.expect(scope.privacyPolicies).to.deep.equal({
            en: {
              content_type: 'html',
              digest: 'digesten',
              data: 'dataen',
            },
            fr: {
              content_type: 'html',
              digest: 'digestfr',
              data: 'datafr-new',
            },
            es: {
              content_type: 'html',
              digest: 'digestes',
              data: 'dataes-new',
            },
            sw: {
              content_type: 'html',
              digest: 'digestsw',
              data: 'datasw',
            },
            hi: {},
            ne: {},
            nl: {},
          });
        });
    });
  });
});

