describe('CountMessages service', function() {

  'use strict';

  let service;
  let $translate;
  let Settings;

  beforeEach(function() {
    Settings = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.value('Settings', Settings);
    });
    inject(function(_CountMessages_) {
      service = _CountMessages_;
    });
    $translate = {
      instant: function(key, params) {
        return key + '|' + JSON.stringify(params);
      }
    };
  });

  const generateString = function(len) {
    return Array(len + 1).join('m');
  };

  it('generates correct message when no val', function(done) {
    const actual = service.label($translate, '');
    chai.expect(actual).to.equal('message.characters.left|{"messages":0,"characters":160}');
    done();
  });

  it('generates correct message when single sms', function(done) {
    const actual = service.label($translate, generateString(101));
    chai.expect(actual).to.equal('message.characters.left|{"messages":1,"characters":59}');
    done();
  });

  it('generates correct message when multiple sms', function(done) {
    const actual = service.label($translate, generateString(190));
    chai.expect(actual).to.equal('message.characters.left.multiple|{"messages":2,"characters":130}');
    done();
  });

  it('generates correct message when non gsm characters', function(done) {
    const actual = service.label($translate, 'hello😀');
    chai.expect(actual).to.equal('message.characters.left|{"messages":1,"characters":63}');
    done();
  });

});
