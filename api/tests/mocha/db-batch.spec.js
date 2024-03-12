const lib = require('../../src/db-batch');
const chai = require('chai');
const request = require('@medic/couch-request');
const sinon = require('sinon');
const environment = require('../../src/environment');
const viewName = 'myddoc/myview';
const viewKey = 'mykey';

let iteratee;

describe('DB batch', () => {

  beforeEach(() => {
    sinon.stub(environment, 'db').get(() => 'lg');
    sinon.stub(environment, 'ddoc').get(() => '_design/medic');
    sinon.stub(environment, 'protocol').get(() => 'http');
    sinon.stub(environment, 'host').get(() => 'test.com');
    sinon.stub(environment, 'port').get(() => 1234);
    iteratee = sinon.stub();
  });

  afterEach(() => {
    sinon.restore();
  });

  it('errors if the query errors', done => {
    sinon.stub(request, 'get').returns(Promise.reject('boom'));
    lib.view(viewName, { key: viewKey }, iteratee).catch(err => {
      chai.expect(err).to.equal('boom');
      done();
    });
  });

  it('errors if the iteratee errors', done => {
    sinon.stub(request, 'get').resolves({ offset: 0, rows: [ { doc: { _id: 'a' } } ] });
    iteratee.returns(Promise.reject('boo'));
    lib.view(viewName, { key: viewKey }, iteratee).catch(err => {
      chai.expect(err).to.equal('boo');
      done();
    });
  });

  it('works with a single page', () => {
    const doc1 = { _id: 'a' };
    const doc2 = { _id: 'b' };
    const view = sinon.stub(request, 'get').resolves({ offset: 1, rows: [ { doc: doc1 }, { doc: doc2 } ] });
    iteratee.resolves();
    return lib.view(viewName, { key: viewKey }, iteratee).then(() => {
      chai.expect(view.callCount).to.equal(1);
      chai.expect(view.args[0][0].url).to.equal('http://test.com:1234/lg/_design/myddoc/_view/myview?key=%22mykey%22&limit=101&include_docs=true');
      chai.expect(iteratee.callCount).to.equal(1);
      chai.expect(iteratee.args[0][0]).to.deep.equal([ doc1, doc2 ]);
    });
  });

  it('works with multiple pages', () => {
    const row1 = { key: viewKey, id: 'a', doc: { _id: 'a' } };
    const row2 = { key: viewKey, id: 'b', doc: { _id: 'b' } };
    const row3 = { key: viewKey, id: 'c', doc: { _id: 'c' } };
    const row4 = { key: viewKey, id: 'd', doc: { _id: 'd' } };
    const row5 = { key: viewKey, id: 'e', doc: { _id: 'e' } };
    const row6 = { key: viewKey, id: 'f', doc: { _id: 'f' } };
    const view = sinon.stub(request, 'get');
    view.onCall(0).resolves({ offset: 0, rows: [ row1, row2, row3 ] });
    view.onCall(1).resolves({ offset: 2, rows: [ row3, row4, row5 ] });
    view.onCall(2).resolves({ offset: 4, rows: [ row5, row6 ] });
    iteratee.resolves();
    return lib.view(viewName, { key: viewKey, limit: 2 }, iteratee).then(() => {
      chai.expect(view.callCount).to.equal(3);
      chai.expect(view.args[0][0].url).to.equal('http://test.com:1234/lg/_design/myddoc/_view/myview?key=%22mykey%22&limit=3&include_docs=true');
      chai.expect(view.args[1][0].url).to.equal('http://test.com:1234/lg/_design/myddoc/_view/myview?key=%22mykey%22&limit=3&include_docs=true&startkey=%22mykey%22&startkey_docid=c');
      chai.expect(view.args[2][0].url).to.equal('http://test.com:1234/lg/_design/myddoc/_view/myview?key=%22mykey%22&limit=3&include_docs=true&startkey=%22mykey%22&startkey_docid=e');
      chai.expect(iteratee.callCount).to.equal(3);
      chai.expect(iteratee.args[0][0]).to.deep.equal([ row1.doc, row2.doc ]);
      chai.expect(iteratee.args[1][0]).to.deep.equal([ row3.doc, row4.doc ]);
      chai.expect(iteratee.args[2][0]).to.deep.equal([ row5.doc, row6.doc ]);
    });
  });

});
