describe('UnreadRecords service', () => {

  'use strict';

  let service;
  let query;
  let get;
  let put;
  let Changes;
  let Session;

  beforeEach(() => {
    query = sinon.stub();
    get = sinon.stub();
    put = sinon.stub();
    Changes = sinon.stub();
    Session = { isOnlineOnly: function() {} };
    const info = sinon.stub().returns(Promise.resolve());
    module('inboxApp');
    module($provide => {
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.value('Changes', Changes);
      $provide.value('Session', Session);
      $provide.factory('DB', KarmaUtils.mockDB({
        query: query,
        info: info,
        get: get,
        put: put
      }));
    });
    inject($injector => {
      service = $injector.get('UnreadRecords');
    });
  });

  describe('count unread', () => {

    it('returns zero when no data_records', done => {
      query.returns(Promise.resolve({ rows: [] }));
      service((err, actual) => {
        chai.expect(actual).to.deep.equal({
          report: 0,
          message: 0
        });
        done();
      });
    });

    it('returns all data_records when none read', done => {
      query.onCall(0).returns(Promise.resolve({ rows: [
        { key: 'report', value: 13 },
        { key: 'message', value: 5 }
      ] }));
      query.onCall(1).returns(Promise.resolve({ rows: [] }));
      service((err, actual) => {
        chai.expect(actual).to.deep.equal({
          report: 13,
          message: 5
        });
        done();
      });
    });

    it('returns total', done => {
      query.onCall(0).returns(Promise.resolve({ rows: [
        { key: 'report', value: 13 },
        { key: 'message', value: 5 }
      ] }));
      query.onCall(1).returns(Promise.resolve({ rows: [
        { key: 'report', value: 3 }
      ] }));
      service((err, actual) => {
        chai.expect(actual).to.deep.equal({
          report: 10,
          message: 5
        });
        chai.expect(query.callCount).to.equal(2);
        chai.expect(query.args[0][0]).to.equal('medic-client/data_records_by_type');
        chai.expect(query.args[0][1].group).to.equal(true);
        chai.expect(query.args[1][0]).to.equal('medic-user/read');
        chai.expect(query.args[1][1].group).to.equal(true);
        done();
      });
    });

    it('calls the callback if a change happens', done => {
      query.onCall(0).returns(Promise.resolve({ rows: [
        { key: 'report', value: 13 },
        { key: 'message', value: 5 }
      ] }));
      query.onCall(1).returns(Promise.resolve({ rows: [
        { key: 'report', value: 3 }
      ] }));
      query.onCall(2).returns(Promise.resolve({ rows: [
        { key: 'report', value: 14 },
        { key: 'message', value: 5 }
      ] }));
      query.onCall(3).returns(Promise.resolve({ rows: [
        { key: 'report', value: 3 }
      ] }));
      let call = 0;
      service((err, actual) => {
        if (call === 0) {
          chai.expect(Changes.callCount).to.equal(2); // one for medic and one for meta
          Changes.args[0][0].callback({ id: 'abc' });
        } else if (call === 1) {
          chai.expect(query.callCount).to.equal(4);
          chai.expect(actual).to.deep.equal({
            report: 11,
            message: 5
          });
          done();
        }
        call++;
      });
    });

    it('updates the count if the meta db is updated', done => {
      query.onCall(0).returns(Promise.resolve({ rows: [
        { key: 'report', value: 13 },
        { key: 'message', value: 5 }
      ] }));
      query.onCall(1).returns(Promise.resolve({ rows: [
        { key: 'report', value: 3 }
      ] }));
      query.onCall(2).returns(Promise.resolve({ rows: [
        { key: 'report', value: 14 },
        { key: 'message', value: 5 }
      ] }));
      query.onCall(3).returns(Promise.resolve({ rows: [
        { key: 'report', value: 3 }
      ] }));
      let call = 0;
      service((err, actual) => {
        if (call === 0) {
          Changes.args[1][0].callback({ id: 'abc' });
        } else if (call === 1) {
          chai.expect(query.callCount).to.equal(4);
          chai.expect(actual).to.deep.equal({
            report: 11,
            message: 5
          });
          done();
        }
        call++;
      });
    });
  });

  describe('meta db cleanup', () => {

    it('does not delete if admin', done => {
      query.onCall(0).returns(Promise.resolve({ rows: [
        { key: 'report', value: 13 },
        { key: 'message', value: 5 }
      ] }));
      query.onCall(1).returns(Promise.resolve({ rows: [
        { key: 'report', value: 3 }
      ] }));
      query.onCall(2).returns(Promise.resolve({ rows: [
        { key: 'report', value: 13 },
        { key: 'message', value: 5 }
      ] }));
      query.onCall(3).returns(Promise.resolve({ rows: [
        { key: 'report', value: 3 }
      ] }));
      sinon.stub(Session, 'isOnlineOnly').returns(true);
      get.returns(Promise.resolve({ _id: 'abc' }));
      put.returns(Promise.resolve());
      let call = 0;
      service(err => {
        if (err) {
          return done(err);
        }
        if (call === 0) {
          chai.expect(Changes.callCount).to.equal(2);
          Changes.args[0][0].callback({
            deleted: true,
            id: 'abc',
            doc: { _id: 'abc', form: 'Assessment' }
          });
        } else if (call === 1) {
          chai.expect(query.callCount).to.equal(4);
          chai.expect(get.callCount).to.equal(0);
          chai.expect(put.callCount).to.equal(0);
          done();
        }
        call++;
      });
    });

    it('deletes the read doc when a deletion happens', done => {
      query.onCall(0).returns(Promise.resolve({ rows: [
        { key: 'report', value: 13 },
        { key: 'message', value: 5 }
      ] }));
      query.onCall(1).returns(Promise.resolve({ rows: [
        { key: 'report', value: 3 }
      ] }));
      query.onCall(2).returns(Promise.resolve({ rows: [
        { key: 'report', value: 12 },
        { key: 'message', value: 5 }
      ] }));
      query.onCall(3).returns(Promise.resolve({ rows: [
        { key: 'report', value: 3 }
      ] }));
      sinon.stub(Session, 'isOnlineOnly').returns(false);
      get.returns(Promise.resolve({ _id: 'abc' }));
      put.returns(Promise.resolve());
      let call = 0;
      service((err, actual) => {
        if (err) {
          return done(err);
        }
        if (call === 0) {
          chai.expect(Changes.callCount).to.equal(2);
          Changes.args[0][0].callback({
            deleted: true,
            id: 'abc',
            doc: { _id: 'abc', form: 'Assessment' }
          });
        } else if (call === 1) {
          chai.expect(query.callCount).to.equal(4);
          chai.expect(actual).to.deep.equal({
            report: 9,
            message: 5
          });
          chai.expect(get.callCount).to.equal(1);
          chai.expect(get.args[0][0]).to.equal('read:report:abc');
          chai.expect(put.callCount).to.equal(1);
          chai.expect(put.args[0][0]._deleted).to.equal(true);
          done();
        }
        call++;
      });
    });

  });

});
