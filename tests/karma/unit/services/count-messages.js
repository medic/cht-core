describe('CountMessages service', function() {

  'use strict';

  var service,
      $translate;

  beforeEach(function() {
    module('inboxApp');
    inject(function(_CountMessages_) {
      service = _CountMessages_;
    });
    $translate = {
      instant: function(key, params) {
        return key + '|' + JSON.stringify(params);
      }
    };
  });

  var generateString = function(len) {
    return Array(len + 1).join('m');
  };

  it('generates correct message when no val', function(done) {
    chai.expect(service.label($translate, ''))
      .to.equal('message.characters.left|{"messages":0,"characters":160}');
    done();
  });

  it('generates correct message when single sms', function(done) {
    chai.expect(service.label($translate, generateString(101)))
      .to.equal('message.characters.left|{"messages":1,"characters":59}');
    done();
  });

  it('generates correct message when multiple sms', function(done) {
    chai.expect(service.label($translate, generateString(190)))
      .to.equal('message.characters.left.multiple|{"messages":2,"characters":130}');
    done();
  });

});