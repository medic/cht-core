describe('DisplayTranslationsCtrl controller', function() {
  const { DOC_TYPES } = require('@medic/constants');
  'use strict';

  let rootScope;
  let scope;
  let createController;
  let queryStub;
  let modalStub;
  let logError;

  const translationsRows = [
    { doc: { code: 'en', generic: { hello: 'Hello', bye: 'Goodbye' }, custom: { bye: 'See ya' } } },
    { doc: { code: 'fr', generic: { hello: 'Bonjour', bye: 'Au revoir' } } },
  ];

  beforeEach(module('adminApp'));

  beforeEach(inject(function($rootScope, $controller) {
    rootScope = $rootScope;
    scope = $rootScope.$new();
    queryStub = sinon.stub().resolves({ rows: translationsRows });
    modalStub = sinon.stub().resolves();
    logError = sinon.stub();

    createController = function() {
      return $controller('DisplayTranslationsCtrl', {
        '$log': { error: logError },
        '$scope': scope,
        'DB': sinon.stub().returns({ query: queryStub }),
        'Modal': modalStub,
      });
    };
  }));

  it('initializes by fetching translations and building options and models', async() => {
    await createController();
    await scope.setupPromise;
    rootScope.$digest();

    // translations loaded
    chai.expect(scope.translations).to.deep.equal(translationsRows);
    // translation options begin with keys option and include rows
    chai.expect(scope.translationOptions[0].doc.code).to.equal('keys');
    chai.expect(scope.translationOptions[0].doc.name).to.equal('Translation Keys');

    // localeModel defaults lhs=en and rhs=the other language (fr)
    chai.expect(scope.localeModel.lhs).to.equal('en');
    chai.expect(scope.localeModel.rhs).to.equal('fr');

    // translationModels combines generic+custom for lhs and rhs
    // lhs=en => hello from generic, bye overridden by custom
    const modelByKey = {};
    scope.translationModels.forEach(m => modelByKey[m.key] = m);
    chai.expect(modelByKey.hello.lhs).to.equal('Hello');
    chai.expect(modelByKey.hello.rhs).to.equal('Bonjour');
    chai.expect(modelByKey.bye.lhs).to.equal('See ya');
    chai.expect(modelByKey.bye.rhs).to.equal('Au revoir');

    chai.expect(queryStub.callCount).to.equal(1);
    chai.expect(queryStub.firstCall.args).to.deep.equal([
      'medic-client/doc_by_type',
      {
        key: [DOC_TYPES.TRANSLATIONS],
        include_docs: true,
      }
    ]);
  });

  it('shows keys on lhs when lhs is set to keys option', async () => {
    await createController();
    await scope.setupPromise;
    rootScope.$digest();

    // switch lhs to keys option and trigger watch
    scope.localeModel.lhs = 'keys';
    rootScope.$digest();

    const helloModel = scope.translationModels.find(m => m.key === 'hello');
    chai.expect(helloModel.lhs).to.equal('hello');
    const byeModel = scope.translationModels.find(m => m.key === 'bye');
    chai.expect(byeModel.lhs).to.equal('bye');
  });

  it('updates models when rhs changes via watcher', async () => {
    await createController();
    await scope.setupPromise;
    rootScope.$digest();

    // Change rhs to en and expect rhs values to become en values
    scope.localeModel.rhs = 'en';
    rootScope.$digest();

    const helloModel = scope.translationModels.find(m => m.key === 'hello');
    chai.expect(helloModel.rhs).to.equal('Hello');
  });

  it('editTranslation launches Modal with locales and refreshes after resolve', async () => {
    await createController();
    await scope.setupPromise;
    rootScope.$digest();

    rootScope.$digest();
    // call editTranslation
    scope.editTranslation('hello');
    // ensure Modal was called with expected params
    const args = modalStub.args[0][0];
    chai.expect(args.templateUrl).to.equal('templates/edit_translation.html');
    chai.expect(args.controller).to.equal('EditTranslationCtrl');
    chai.expect(args.model.key).to.equal('hello');
    // Modal receives locales values array
    chai.expect(Array.isArray(args.model.locales)).to.equal(true);

    await Promise.resolve();
    // After modal resolves, updateTranslations should be called; our queryStub should be called again
    rootScope.$digest();
    // Called twice: initial load + refresh after modal
    chai.expect(queryStub.callCount).to.be.at.least(2);
  });

  it('logs error when fetching fails', async () => {
    // make first call reject
    queryStub.rejects(new Error('boom'));
    await createController();
    await scope.setupPromise;
    rootScope.$digest();

    chai.expect(logError.called).to.equal(true);
    chai.expect(logError.args[0][0]).to.equal('Error fetching translation documents');
  });
});
