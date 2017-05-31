describe('LineageModelGenerator service', () => {

  'use strict';

  let service,
      dbQuery;

  beforeEach(() => {
    module('inboxApp');
    module($provide => {
      dbQuery = sinon.stub();
      $provide.factory('DB', KarmaUtils.mockDB({ query: dbQuery }));
    });
    inject(_LineageModelGenerator_ => service = _LineageModelGenerator_);
  });

  describe('contact', () => {

    it('handles not found', () => {
      dbQuery.returns(KarmaUtils.mockPromise(null, { rows: [] }));
      return service.contact('a').then(model => {
        chai.expect(model._id).to.equal('a');
        chai.expect(model.doc).to.equal(undefined);
      });
    });

    it('handles no lineage', () => {
      const contact = { _id: 'a', _rev: '1' };
      dbQuery.returns(KarmaUtils.mockPromise(null, { rows: [
        { doc: contact }
      ] }));
      return service.contact('a').then(model => {
        chai.expect(model._id).to.equal('a');
        chai.expect(model.doc).to.deep.equal(contact);
      });
    });

    it('binds lineage', () => {
      const contact = { _id: 'a', _rev: '1' };
      const parent = { _id: 'b', _rev: '1' };
      const grandparent = { _id: 'c', _rev: '1' };
      dbQuery.returns(KarmaUtils.mockPromise(null, { rows: [
        { doc: contact },
        { doc: parent },
        { doc: grandparent }
      ] }));
      return service.contact('a').then(model => {
        chai.expect(model._id).to.equal('a');
        chai.expect(model.doc).to.deep.equal(contact);
        chai.expect(model.lineage).to.deep.equal([ parent, grandparent ]);
      });
    });

  });

  describe('report', () => {

    it('handles not found', () => {
      dbQuery.returns(KarmaUtils.mockPromise(null, { rows: [] }));
      return service.report('a').then(model => {
        chai.expect(model._id).to.equal('a');
        chai.expect(model.doc).to.equal(undefined);
      });
    });

    it('handles no lineage', () => {
      const report = { _id: 'a', _rev: '1' };
      dbQuery.returns(KarmaUtils.mockPromise(null, { rows: [
        { doc: report }
      ] }));
      return service.report('a').then(model => {
        chai.expect(model._id).to.equal('a');
        chai.expect(model.doc).to.deep.equal(report);
      });
    });

    it('binds lineage and contact', () => {
      const report = { _id: 'a', _rev: '1' };
      const contact = { _id: 'b', _rev: '1' };
      const parent = { _id: 'c', _rev: '1' };
      const grandparent = { _id: 'd', _rev: '1' };
      dbQuery.returns(KarmaUtils.mockPromise(null, { rows: [
        { doc: report },
        { doc: contact },
        { doc: parent },
        { doc: grandparent }
      ] }));
      return service.report('a').then(model => {
        chai.expect(model._id).to.equal('a');
        chai.expect(model.doc).to.deep.equal(report);
        chai.expect(model.contact).to.deep.equal(contact);
        chai.expect(model.lineage).to.deep.equal([ parent, grandparent ]);
      });
    });

  });

});
