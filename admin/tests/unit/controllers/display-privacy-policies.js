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
        _attachments: {
          en: {
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
        _attachments: {
          en: {
            content_type: 'html',
            digest: 'digest_en',
            data: 'the english attachment'
          },
          fr: {
            content_type: 'html',
            digest: 'digest_fr',
            data: 'l`attachement francais',
          },
          es: {
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
        _attachments: {
          en: {
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
        _attachments: {
          en: {
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

    it('should do requested deletes and updates', () => {
      languages.resolves([
        { code: 'en', name: 'English' }, // kept the same
        { code: 'fr', name: 'Francais' }, // updated
        { code: 'es', name: 'Espanol' }, // deleted and updated
        { code: 'hi', name: 'Hindi' }, // deleted
        { code: 'sw', name: 'Swahili' }, // new
        { code: 'ne', name: 'Nepali' }, // no change
      ]);

      db.get
        .withArgs('privacy-policies', { attachments: true }).onCall(0).resolves({
          _id: 'privacy-policies',
          _attachments: {
            en: {
              content_type: 'html',
              digest: 'digesten',
              data: 'dataen',
            },
            fr: {
              content_type: 'html',
              digest: 'digestfr',
              data: 'datafr',
            },
            es: {
              content_type: 'html',
              digest: 'digestes',
              data: 'dataes',
            },
            hi: {
              content_type: 'html',
              digest: 'digesthi',
              data: 'datahi',
            },
          },
        })
        .withArgs('privacy-policies', { attachments: true }).onCall(1).resolves({
          _id: 'privacy-policies',
          _attachments: {
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
          },
        })
        .withArgs('privacy-policies', { attachments: false }).resolves({
          _id: 'privacy-policies',
          _rev: '3-lala',
          _attachments: {
            en: {
              content_type: 'html',
              digest: 'digesten',
              stub: true,
            },
            fr: {
              content_type: 'html',
              digest: 'digestfr',
              stub: true,
            },
            es: {
              content_type: 'html',
              digest: 'digestes',
              stub: true,
            },
            hi: {
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
            fr: { type: 'text/html', some: 'other params', fr: true },
            es: { type: 'text/html', es: true },
            sw: { type: 'text/html', sw: true },
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
            _attachments: {
              en: {
                content_type: 'html',
                digest: 'digesten',
                stub: true,
              },
              fr: {
                content_type: 'text/html',
                data: { type: 'text/html', some: 'other params', fr: true },
              },
              es: {
                content_type: 'text/html',
                data: { type: 'text/html', es: true },
              },
              sw: {
                content_type: 'text/html',
                data: { type: 'text/html', sw: true },
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
          });
        });
    });
  });
});

