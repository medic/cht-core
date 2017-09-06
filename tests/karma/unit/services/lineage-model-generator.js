describe('LineageModelGenerator service', () => {

  'use strict';

  let service,
      dbQuery,
      dbAllDocs;

  beforeEach(() => {
    module('inboxApp');
    module($provide => {
      dbQuery = sinon.stub();
      dbAllDocs = sinon.stub();
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.factory('DB', KarmaUtils.mockDB({ query: dbQuery, allDocs: dbAllDocs }));
    });
    inject(_LineageModelGenerator_ => service = _LineageModelGenerator_);
  });

  describe('contact', () => {

    it('handles not found', done => {
      dbQuery.returns(Promise.resolve({ rows: [] }));
      service.contact('a')
        .then(() => {
          done(new Error('expected error to be thrown'));
        })
        .catch(err => {
          chai.expect(err.message).to.equal('Document not found');
          chai.expect(err.code).to.equal(404);
          done();
        });
    });

    it('handles no lineage', () => {
      const contact = { _id: 'a', _rev: '1' };
      dbQuery.returns(Promise.resolve({ rows: [
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
      dbQuery.returns(Promise.resolve({ rows: [
        { doc: contact },
        { doc: parent },
        { doc: grandparent }
      ] }));
      return service.contact('a').then(model => {
        chai.expect(dbQuery.callCount).to.equal(1);
        chai.expect(dbQuery.args[0][0]).to.equal('medic-client/docs_by_id_lineage');
        chai.expect(dbQuery.args[0][1]).to.deep.equal({
          startkey: [ 'a' ],
          endkey: [ 'a', {} ],
          include_docs: true
        });
        chai.expect(model._id).to.equal('a');
        chai.expect(model.doc).to.deep.equal(contact);
        chai.expect(model.lineage).to.deep.equal([ parent, grandparent ]);
      });
    });

    it('hydrates lineage contacts - #3812', () => {
      const contact = { _id: 'a', _rev: '1', contact: { _id: 'x' } };
      const parent = { _id: 'b', _rev: '1', contact: { _id: 'd' } };
      const grandparent = { _id: 'c', _rev: '1', contact: { _id: 'e' } };
      const parentContact = { _id: 'd', name: 'donny' };
      const grandparentContact = { _id: 'e', name: 'erica' };
      dbQuery.returns(Promise.resolve({ rows: [
        { doc: contact },
        { doc: parent },
        { doc: grandparent }
      ] }));
      dbAllDocs.returns(Promise.resolve({ rows: [
        { doc: parentContact },
        { doc: grandparentContact }
      ] }));
      return service.contact('a').then(model => {
        chai.expect(dbAllDocs.callCount).to.equal(1);
        chai.expect(dbAllDocs.args[0][0]).to.deep.equal({
          keys: [ 'd', 'e' ],
          include_docs: true
        });
        chai.expect(model.lineage[0].contact).to.deep.equal(parentContact);
        chai.expect(model.lineage[1].contact).to.deep.equal(grandparentContact);
      });
    });
  });

  describe('report', () => {

    it('handles not found', done => {
      dbQuery.returns(Promise.resolve({ rows: [] }));
      service.report('a')
        .then(() => {
          done(new Error('expected error to be thrown'));
        })
        .catch(err => {
          chai.expect(err.message).to.equal('Document not found');
          chai.expect(err.code).to.equal(404);
          done();
        });
    });

    it('handles no lineage', () => {
      const report = { _id: 'a', _rev: '1' };
      dbQuery.returns(Promise.resolve({ rows: [
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
      dbQuery.returns(Promise.resolve({ rows: [
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

    it('hydrates lineage contacts - #3812', () => {
      const report = { _id: 'a', _rev: '1', contact: { _id: 'x' } };
      const contact = { _id: 'b', _rev: '1', contact: { _id: 'y' } };
      const parent = { _id: 'c', _rev: '1', contact: { _id: 'e' } };
      const grandparent = { _id: 'd', _rev: '1', contact: { _id: 'f' } };
      const parentContact = { _id: 'e', name: 'erica' };
      const grandparentContact = { _id: 'f', name: 'frank' };
      dbQuery.returns(Promise.resolve({ rows: [
        { doc: report },
        { doc: contact },
        { doc: parent },
        { doc: grandparent }
      ] }));
      dbAllDocs.returns(Promise.resolve({ rows: [
        { doc: parentContact },
        { doc: grandparentContact }
      ] }));
      return service.report('a').then(model => {
        chai.expect(dbAllDocs.callCount).to.equal(1);
        chai.expect(dbAllDocs.args[0][0]).to.deep.equal({
          keys: [ 'e', 'f' ],
          include_docs: true
        });
        chai.expect(model.lineage[0].contact).to.deep.equal(parentContact);
        chai.expect(model.lineage[1].contact).to.deep.equal(grandparentContact);
      });
    });

  });

});
