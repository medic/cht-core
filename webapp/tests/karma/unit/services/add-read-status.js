describe('AddReadStatus service', () => {

  'use strict';

  let service;
  let allDocs;

  beforeEach(() => {
    module('inboxApp');
    allDocs = sinon.stub();
    module($provide => {
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.factory('DB', KarmaUtils.mockDB({ allDocs: allDocs }));
    });
    inject(_AddReadStatus_ => {
      service = _AddReadStatus_;
    });
  });

  describe('reports', () => {

    it('returns given when no models', () => {
      const given = [];
      return service.reports(given).then(actual => {
        chai.expect(actual).to.deep.equal(given);
        chai.expect(allDocs.callCount).to.equal(0);
      });
    });

    it('sets the read status', () => {
      allDocs.returns(Promise.resolve({
        rows: [
          { id: 'a', key: 'a', value: { rev: 'x' } },
          { key: 'b', error: 'not_found' }, // read doc never existed
          { id: 'c', key: 'c', value: { rev: 'y', deleted: true } }, // read doc has been deleted
          { id: 'd', key: 'd', value: { rev: 'z' } }
        ]
      }));
      const given = [
        { id: 'a' },  // supports no underscore prefix
        { _id: 'b' }, // AND works with underscore prefix
        { _id: 'c' },
        { _id: 'd' }
      ];
      const expected = [
        { id: 'a', read: true },
        { _id: 'b', read: false },
        { _id: 'c', read: false },
        { _id: 'd', read: true }
      ];
      return service.reports(given).then(actual => {
        chai.expect(actual).to.deep.equal(expected);
        chai.expect(allDocs.callCount).to.equal(1);
        chai.expect(allDocs.args[0][0].keys).to.deep.equal([
          'read:report:a',
          'read:report:b',
          'read:report:c',
          'read:report:d'
        ]);
      });
    });

  });

  describe('messages', () => {

    it('returns given when no models', () => {
      const given = [];
      return service.messages(given).then(actual => {
        chai.expect(actual).to.deep.equal(given);
        chai.expect(allDocs.callCount).to.equal(0);
      });
    });

    it('sets the read status', () => {
      allDocs.returns(Promise.resolve({
        rows: [
          { id: 'a', key: 'a', value: { rev: 'x' } },
          { key: 'b', error: 'not_found' },
          { id: 'c', key: 'c', value: { rev: 'y' } },
        ]
      }));
      const given = [
        { id: 'a' },  // supports no underscore prefix
        { _id: 'b' }, // AND works with underscore prefix
        { _id: 'c' }
      ];
      const expected = [
        { id: 'a', read: true },
        { _id: 'b', read: false },
        { _id: 'c', read: true }
      ];
      return service.messages(given).then(actual => {
        chai.expect(actual).to.deep.equal(expected);
        chai.expect(allDocs.callCount).to.equal(1);
        chai.expect(allDocs.args[0][0].keys).to.deep.equal([
          'read:message:a',
          'read:message:b',
          'read:message:c'
        ]);
      });
    });

  });

});
