describe.only('XmlForm service', () => {
  'use strict';

  let service;
  let query;
  let get;

  beforeEach(() => {
    module('inboxApp');
    query = sinon.stub();
    get = sinon.stub();
    module($provide => {
      $provide.factory('DB', KarmaUtils.mockDB({ get, query }));
      $provide.value('$q', Q); // bypass $q so we don't have to digest
    });
    inject(_XmlForm_ => service = _XmlForm_);
  });

  it('gets valid form by id with "xml" attachment', () => {
    const internalId = 'birth';
    const expected = {
      type: 'form',
      _attachments: { xml: { stub: true } }
    };
    get.resolves(expected);
    return service(internalId).then(actual => {
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(get.callCount).to.equal(1);
      chai.expect(get.args[0][0]).to.equal(`form:${internalId}`);
    });
  });

  it('gets valid form by id with ".xml" file extension', () => {
    const internalId = 'birth';
    const expected = {
      type: 'form',
      _attachments: { 'something.xml': { stub: true } }
    };
    get.resolves(expected);
    return service(internalId).then(actual => {
      chai.expect(actual).to.equal(expected);
    });
  });

  it('returns error when cannot find xform attachment', done => {
    const internalId = 'birth';
    const expected = {
      type: 'form',
      _attachments: { 'something.txt': { stub: true } }
    };
    get.resolves(expected);
    service(internalId)
      .then(() => {
        done(new Error('expected error to be thrown'));
      })
      .catch(err => {
        chai.expect(err.message).to.equal(`The form "${internalId}" doesn't have an xform attachment`);
        done();
      });
  });

  it('falls back to using view if no doc found', () => {
    const internalId = 'birth';
    const expected = {
      internalId,
      _attachments: { 'something.xml': { stub: true } }
    };
    get.returns(Promise.reject({ status: 404 }));
    query.resolves({ rows: [
      { doc: expected },
      { doc: { internalId: 'death', _attachments: { 'something.xml': { stub: true } } } }
    ] });
    return service(internalId).then(actual => {
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(query.callCount).to.equal(1);
      chai.expect(query.args[0][0]).to.equal(`medic-client/doc_by_type`);
      const options = query.args[0][1];
      chai.expect(options.include_docs).to.equal(true);
      chai.expect(options.key).to.deep.equal(['form']);
    });
  });

  it('query fails if multiple forms found', done => {
    const internalId = 'birth';
    const expected = {
      internalId,
      _attachments: { 'something.xml': { stub: true } }
    };
    get.returns(Promise.reject({ status: 404 }));
    query.resolves({ rows: [
      { doc: expected },
      { doc: { internalId, _attachments: { 'something.xml': { stub: true } } } }
    ] });
    service(internalId)
      .then(() => {
        done(new Error('expected error to be thrown'));
      })
      .catch(err => {
        chai.expect(err.message).to.equal(`Multiple forms found for internalId: "${internalId}"`);
        done();
      });
  });


  it('query fails if no forms found', done => {
    const internalId = 'birth';
    const expected = {
      internalId,
      _attachments: { 'something.xml': { stub: true } }
    };
    get.returns(Promise.reject({ status: 404 }));
    query.resolves({ rows: [
      { doc: { internalId: 'death', _attachments: { 'something.xml': { stub: true } } } }
    ] });
    service(internalId)
      .then(() => {
        done(new Error('expected error to be thrown'));
      })
      .catch(err => {
        chai.expect(err.message).to.equal(`No form found for internalId "${internalId}"`);
        done();
      });
  });

});
