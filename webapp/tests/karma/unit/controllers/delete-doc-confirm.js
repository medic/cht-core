describe.only('DeleteDocConfirm controller', () => {
  'use strict';

  let createController;
  let scope;

  beforeEach(() => {
    module('inboxApp');
  });
  beforeEach(inject(($rootScope, $controller) => {
    scope = $rootScope.$new();
    scope.model = {
      doc: {
        id: 'id',
        patient: {},
        rev: 'rev',
        type: 'data_record',
        contact: {
          _id: 'id',
          parent: {
            _id: 'id123',
            name: 'name',
            parent: {
              _id: 'id456',
              name: 'another name'
            }
          }
        }
      }
    };
    createController = () => {
      return $controller('DeleteDocConfirm', {
        '$q': Q,
        '$scope': scope,
        '$translate': { instant: () => {} },
        '$uibModalInstance': { instant: () => {} },
        DB: () => {
          return {
            put: sinon.stub().resolves()
          };
        },
      });
    };
  }));

  describe('controller', () => {
    it('minifies reports when they deleted', () => {
      const ctrl = createController();
      const minifiedContact = {
        _id: 'id',
        parent: {
          _id: 'id123',
          parent: {
            _id: 'id456',
          }
        }
      };
      ctrl.submit();
      chai.expect(scope.model.doc).to.not.have.key('patient');
      chai.expect(scope.model.doc.contact).to.deep.equal(minifiedContact);
      chai.expect(scope.model.doc.contact.parent).to.not.have.key('name');
    });
  });
});
