describe('UserContact service', function() {

  'use strict';

  let service;
  let UserSettings;
  let contact;

  beforeEach(function() {
    contact = sinon.stub();
    UserSettings = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.value('UserSettings', UserSettings);
      $provide.value('LineageModelGenerator', { contact: contact });
    });
    inject(function($injector) {
      service = $injector.get('UserContact');
    });
  });

  it('returns error from user settings', function(done) {
    UserSettings.returns(Promise.reject(new Error('boom')));
    service()
      .then(function() {
        done(new Error('Expected error to be thrown'));
      })
      .catch(function(err) {
        chai.expect(err.message).to.equal('boom');
        done();
      });
  });

  it('returns null when no configured contact', function() {
    UserSettings.returns(Promise.resolve({}));
    return service().then(function(contact) {
      chai.expect(contact).to.equal(undefined);
    });
  });

  it('returns null when configured contact not in the database', function() {
    UserSettings.returns(Promise.resolve({ contact_id: 'not-found' }));
    const err = new Error('not_found');
    err.reason = 'missing';
    err.message = 'missing';
    err.code = 404;
    contact.returns(Promise.reject(err));
    return service().then(function(contact) {
      chai.expect(contact).to.equal(undefined);
    });
  });

  it('returns error from getting contact', function(done) {
    UserSettings.returns(Promise.resolve({ contact_id: 'nobody' }));
    contact.returns(Promise.reject(new Error('boom')));
    service()
      .then(function() {
        done(new Error('Expected error to be thrown'));
      })
      .catch(function(err) {
        chai.expect(err.message).to.equal('boom');
        chai.expect(contact.callCount).to.equal(1);
        chai.expect(contact.args[0][0]).to.equal('nobody');
        done();
      });
  });

  it('returns contact', function() {
    const expected = { _id: 'somebody', name: 'Some Body' };
    UserSettings.returns(Promise.resolve({ contact_id: 'somebody' }));
    contact.returns(Promise.resolve({ doc: expected }));
    return service().then(function(actual) {
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(contact.callCount).to.equal(1);
      chai.expect(contact.args[0][0]).to.equal('somebody');
      chai.expect(contact.args[0][1].merge).to.equal(true);
    });
  });

});
