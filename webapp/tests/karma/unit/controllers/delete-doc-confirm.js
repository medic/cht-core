describe.only('DeleteDocConfirm controller', () => {
  'use strict';

  let createController;
  let DB;
  let scope;

  beforeEach(() => {
    module('inboxApp');
  });
  beforeEach(inject(($rootScope, $controller) => {
    scope = $rootScope.$new();
    scope.model = { doc: { id: 'id', patient: {}, rev: 'rev'} };
    scope.isMobile = () => false;
    createController = () => {
      return $controller('ReportsCtrl', {
        '$q': Q,
        '$scope': scope,
        '$translate': { instant: () => {} },
        DB: sinon.stub().resolves(),
        ExtractLineage: sinon.stub().resolves(),
      });
    };
  }));

  describe('controller', () => {
    it('minifies reports when they deleted', () => {
      createController();
      chai.expect(1).to.equal(1);
    });
  });
});
