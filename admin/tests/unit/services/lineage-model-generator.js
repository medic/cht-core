describe('LineageModelGenerator service', () => {

  'use strict';

  let service;
  let dbQuery;
  let dbAllDocs;

  beforeEach(() => {
    module('adminApp');
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
          chai.expect(err.message).to.equal('Document not found: a');
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

    it('binds contacts', () => {
      const contact = { _id: 'a', _rev: '1', contact: { _id: 'd' } };
      const contactsContact = { _id: 'd', name: 'dave' };
      const parent = { _id: 'b', _rev: '1', contact: { _id: 'e' } };
      const parentsContact = { _id: 'e', name: 'eliza' };
      const grandparent = { _id: 'c', _rev: '1' };
      dbQuery.returns(Promise.resolve({ rows: [
        { doc: contact },
        { doc: parent },
        { doc: grandparent }
      ] }));
      dbAllDocs.returns(Promise.resolve({ rows: [
        { doc: contactsContact },
        { doc: parentsContact }
      ] }));
      return service.contact('a', { merge: true }).then(model => {
        chai.expect(model._id).to.equal('a');
        chai.expect(model.doc.contact.name).to.equal('dave');
        chai.expect(model.lineage[0].contact.name).to.equal('eliza');
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
          keys: [ 'x', 'd', 'e' ],
          include_docs: true
        });
        chai.expect(model.lineage[0].contact).to.deep.equal(parentContact);
        chai.expect(model.lineage[1].contact).to.deep.equal(grandparentContact);
      });
    });

    it('merges lineage when merge passed', () => {
      const contact = { _id: 'a', name: '1', parent: { _id: 'b', parent: { _id: 'c' } } };
      const parent = { _id: 'b', name: '2' };
      const grandparent = { _id: 'c', name: '3' };
      const expected = {
        _id: 'a',
        doc: {
          _id: 'a',
          name: '1',
          parent: {
            _id: 'b',
            name: '2',
            parent: {
              _id: 'c',
              name: '3'
            }
          }
        },
        lineage: [
          {
            _id: 'b',
            name: '2',
            parent: {
              _id: 'c',
              name: '3'
            }
          },
          {
            _id: 'c',
            name: '3'
          }
        ]
      };
      dbQuery.returns(Promise.resolve({ rows: [
        { doc: contact },
        { doc: parent },
        { doc: grandparent }
      ] }));
      return service.contact('a', { merge: true }).then(actual => {
        chai.expect(actual).to.deep.equal(expected);
      });
    });

    it('should merge lineage with undefined members', () => {
      const contact = { _id: 'a', name: '1', parent: { _id: 'b', parent: { _id: 'c', parent: { _id: 'd' } } } };
      const parent = { _id: 'b', name: '2', parent: { _id: 'c', parent: { _id: 'd' } } };
      dbQuery.resolves({ rows:
        [{ doc: contact, key: ['a', 0] }, { doc: parent,  key: ['a', 1] }, { key: ['a', 2] }, { key: ['a', 3] }]
      });
      const expected = {
        _id: 'a',
        doc: {
          _id: 'a',
          name: '1',
          parent: { _id: 'b', name: '2', parent: { _id: 'c', parent: { _id: 'd' } } }
        },
        lineage: [{ _id: 'b', name: '2', parent: { _id: 'c', parent: { _id: 'd' } } }, undefined, undefined]
      };
      return service.contact('a', { merge: true }).then(actual => {
        chai.expect(actual).to.deep.equal(expected);
      });
    });

    it('should merge lineage with undefined members v2', () => {
      const contact = { _id: 'a', name: '1', parent: { _id: 'b', parent: { _id: 'c', parent: { _id: 'd' } } } };
      const parent = { _id: 'b', name: '2', parent: { _id: 'c', parent: { _id: 'd' } } };
      dbQuery.resolves({ rows: [
        { doc: contact, key: ['a', 0] },
        { doc: parent,  key: ['a', 1] },
        { key: ['a', 2] },
        { key: ['a', 3], doc: { _id: 'd', name: '4' } }
      ] });
      const expected = {
        _id: 'a',
        doc: {
          _id: 'a',
          name: '1',
          parent: { _id: 'b', name: '2', parent: { _id: 'c', parent: { _id: 'd', name: '4' } } },
        },
        lineage: [
          { _id: 'b', name: '2', parent: { _id: 'c', parent: { _id: 'd' } } }, undefined, { _id: 'd', name: '4' }
        ]
      };
      return service.contact('a', { merge: true }).then(actual => {
        chai.expect(actual).to.deep.equal(expected);
      });
    });

    it('does not merge lineage without merge', () => {
      const contact = { _id: 'a', name: '1', parent: { _id: 'b', parent: { _id: 'c' } } };
      const parent = { _id: 'b', name: '2' };
      const grandparent = { _id: 'c', name: '3' };
      const expected = {
        _id: 'a',
        doc: {
          _id: 'a',
          name: '1',
          parent: {
            _id: 'b',
            parent: {
              _id: 'c',
            },
          }
        },
        lineage: [
          {
            _id: 'b',
            name: '2'
          },
          {
            _id: 'c',
            name: '3'
          }
        ]
      };
      dbQuery.returns(Promise.resolve({ rows: [
        { doc: contact },
        { doc: parent },
        { doc: grandparent }
      ] }));
      return service.contact('a').then(actual => {
        chai.expect(actual).to.deep.equal(expected);
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
          chai.expect(err.message).to.equal('Document not found: a');
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
      const report = { _id: 'a', _rev: '1', type: 'data_record', form: 'a', contact: { _id: 'b' } };
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
      });
    });

    it('hydrates lineage contacts - #3812', () => {
      const report = { _id: 'a', _rev: '1', type: 'data_record', form: 'a', contact: { _id: 'x' } };
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
          keys: [ 'x', 'y', 'e', 'f' ],
          include_docs: true
        });
        chai.expect(model.doc.contact.parent.contact).to.deep.equal(parentContact);
        chai.expect(model.doc.contact.parent.parent.contact).to.deep.equal(grandparentContact);
      });
    });

  });

});
