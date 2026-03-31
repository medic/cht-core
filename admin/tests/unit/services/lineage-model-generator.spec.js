describe('LineageModelGenerator service', () => {

  'use strict';

  let service;
  let dbQuery;
  let dbAllDocs;
  let dbGet;

  beforeEach(() => {
    module('adminApp');
    module($provide => {
      dbQuery = sinon.stub();
      dbAllDocs = sinon.stub();
      dbGet = sinon.stub();
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.factory('DB', KarmaUtils.mockDB({ query: dbQuery, allDocs: dbAllDocs, get: dbGet }));
    });
    inject(_LineageModelGenerator_ => service = _LineageModelGenerator_);
  });

  describe('contact', () => {

    it('handles not found', done => {
      dbGet.returns(Promise.reject({ status: 404 }));
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
      dbGet.returns(Promise.resolve(contact));
      return service.contact('a').then(model => {
        chai.expect(model._id).to.equal('a');
        chai.expect(model.doc).to.deep.equal(contact);
      });
    });

    it('binds lineage', () => {
      const contact = { _id: 'a', _rev: '1', parent: { _id: 'b' } };
      const parent = { _id: 'b', _rev: '1', parent: { _id: 'c' } };
      const grandparent = { _id: 'c', _rev: '1' };
      dbGet.withArgs('a').returns(Promise.resolve(contact));
      dbAllDocs.withArgs({ keys: ['b', 'c'], include_docs: true }).returns(Promise.resolve({ rows: [
        { doc: parent },
        { doc: grandparent }
      ] }));
      return service.contact('a').then(model => {
        chai.expect(dbGet.callCount).to.equal(1);
        chai.expect(dbAllDocs.callCount).to.equal(1);
        chai.expect(dbAllDocs.args[0][0].keys).to.deep.equal(['b', 'c']);
        chai.expect(model._id).to.equal('a');
        chai.expect(model.doc).to.deep.equal(contact);
        chai.expect(model.lineage).to.deep.equal([ parent, grandparent ]);
      });
    });

    it('binds contacts', () => {
      const contact = { _id: 'a', _rev: '1', contact: { _id: 'd' }, parent: { _id: 'b' } };
      const contactsContact = { _id: 'd', name: 'dave' };
      const parent = { _id: 'b', _rev: '1', contact: { _id: 'e' }, parent: { _id: 'c' } };
      const parentsContact = { _id: 'e', name: 'eliza' };
      const grandparent = { _id: 'c', _rev: '1' };
      dbGet.returns(Promise.resolve(contact));
      dbAllDocs.withArgs({ keys: ['b', 'c'], include_docs: true }).returns(Promise.resolve({ rows: [
        { doc: parent },
        { doc: grandparent }
      ] }));
      dbAllDocs.withArgs({ keys: sinon.match.array.deepEquals(['d', 'e']), include_docs: true }).returns(Promise.resolve({ rows: [
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
      const contact = { _id: 'a', _rev: '1', contact: { _id: 'x' }, parent: { _id: 'b' } };
      const parent = { _id: 'b', _rev: '1', contact: { _id: 'd' }, parent: { _id: 'c' } };
      const grandparent = { _id: 'c', _rev: '1', contact: { _id: 'e' } };
      const parentContact = { _id: 'd', name: 'donny' };
      const grandparentContact = { _id: 'e', name: 'erica' };
      const xContact = { _id: 'x', name: 'xavier' };
      dbGet.returns(Promise.resolve(contact));
      dbAllDocs.withArgs({ keys: ['b', 'c'], include_docs: true }).returns(Promise.resolve({ rows: [
        { doc: parent },
        { doc: grandparent }
      ] }));
      dbAllDocs.withArgs({ keys: sinon.match.array.contains('x', 'd', 'e'), include_docs: true }).returns(Promise.resolve({ rows: [
        { doc: xContact },
        { doc: parentContact },
        { doc: grandparentContact }
      ] }));
      return service.contact('a').then(model => {
        chai.expect(dbAllDocs.callCount).to.equal(2);
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
      const parent = { _id: 'b', name: '2', parent: { _id: 'c' } };
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
      dbGet.returns(Promise.resolve(contact));
      dbAllDocs.withArgs({ keys: ['b', 'c'], include_docs: true }).returns(Promise.resolve({ rows: [
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
      dbGet.resolves(contact);
      dbAllDocs.resolves({ rows:
        [{ doc: parent, id: 'b' }, { id: 'c' }, { id: 'd' }]
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
      dbGet.resolves(contact);
      dbAllDocs.resolves({ rows: [
        { doc: parent, id: 'b' },
        { id: 'c' },
        { id: 'd', doc: { _id: 'd', name: '4' } }
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
      dbGet.returns(Promise.resolve(contact));
      dbAllDocs.returns(Promise.resolve({ rows: [
        { doc: parent },
        { doc: grandparent }
      ] }));
      return service.contact('a').then(actual => {
        chai.expect(actual).to.deep.equal(expected);
      });
    });
  });
});
