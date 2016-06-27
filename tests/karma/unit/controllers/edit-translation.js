describe('EditTranslationCtrl controller', function() {

  'use strict';

  var createController,
      rootScope,
      scope,
      translateFilter,
      Settings,
      uibModalInstance,
      UpdateSettings,
      bulkDocs,
      model;

  beforeEach(module('inboxApp'));

  beforeEach(inject(function($rootScope, $controller) {
    scope = $rootScope.$new();
    rootScope = $rootScope;
    translateFilter = sinon.stub();
    uibModalInstance = sinon.stub();
    Settings = sinon.stub();
    UpdateSettings = sinon.stub();
    bulkDocs = sinon.stub();
    model = {};
    createController = function() {
      return $controller('EditTranslationCtrl', {
        '$scope': scope,
        '$uibModalInstance': uibModalInstance,
        'DB': function() { return { bulkDocs: bulkDocs }; },
        'model': model
      });
    };
  }));

  it('render', function() {
    model = {
      key: 'title.key',
      locales: [
        { doc: { code: 'en', values: { 'title.key': 'Welcome', 'bye': 'Goodbye' } } },
        { doc: { code: 'fr', values: { 'title.key': 'Bonjour', 'bye': 'Au revoir' } } }
      ]
    };
    createController();
    chai.expect(scope.translationModel).to.deep.equal({
      key: 'title.key',
      locales: [
        { code: 'en', values: { 'title.key': 'Welcome', 'bye': 'Goodbye' } },
        { code: 'fr', values: { 'title.key': 'Bonjour', 'bye': 'Au revoir' } }
      ]
    });
  });

  it('save', function(done) {
    model = {
      key: 'title.key',
      locales: [
        { doc: { code: 'en', values: { 'title.key': 'Welcome', 'bye': 'Goodbye' } } },
        { doc: { code: 'fr', values: { 'title.key': 'Bonjour', 'bye': 'Au revoir' } } },
        { doc: { code: 'es', values: { 'title.key': 'Hola', 'bye': 'Hasta luego' } } }
      ]
    };
    bulkDocs.returns(KarmaUtils.mockPromise());
    createController();
    scope.translationModel.locales[0].values['title.key'] = 'Hello';
    scope.translationModel.locales[1].values['title.key'] = 'Bienvenue';
    scope.submit();
    setTimeout(function() {
      rootScope.$digest();
      var updated = bulkDocs.args[0][0];
      chai.expect(updated.length).to.equal(2); // spanish not saved as not updated
      chai.expect(updated[0].code).to.equal('en');
      chai.expect(updated[0].values['title.key']).to.equal('Hello');
      chai.expect(updated[0].values.bye).to.equal('Goodbye');
      chai.expect(updated[1].code).to.equal('fr');
      chai.expect(updated[1].values['title.key']).to.equal('Bienvenue');
      chai.expect(updated[1].values.bye).to.equal('Au revoir');
      done();
    });
  });

});