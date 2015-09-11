describe('Mega service', function() {
  'use strict';
  
  var service,
      assert = chai.assert;

  beforeEach(function() {
    module('inboxApp');
    inject(function(_Mega_) {
      service = _Mega_;
    });
  });

  it('exists', function() {
    assert.isDefined(service);
  });

  describe('XForm generation', function() {
    it('generates a simple XForm when supplied with a simple schema', function() {
      // given
      var schema = {
        type: 'person',
        title: '{{name}}',
        fields: {
          name: 'string',
        },
      };

      // when
      var xform = service.generateXform(schema);

      // then
      assert.equal(xform, '<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms/" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><h:head><h:title>{{\'person.new\' | translate}}</h:title>' +
          '<model><instance><data id="person" version="1">' +
            '<name/><meta><instanceID/></meta></data></instance>' +
            '<bind nodeset="/person/name" type="string"/></model></h:head>' +
          '<h:body>' +
            '<input ref="/person/name">' +
              '<label>{{\'person.name\' | translate}}</label></input>' +
          '</h:body></h:html>');
    });

    it('handles required fields', function() {
      // given
      var schema = {
        type: 'person',
        title: '{{name}}',
        fields: {
          name: {
            type: 'string',
            required: true,
          }
        }
      };

      // when
      var xform = service.generateXform(schema);

      // then
      assert.equal(xform, '<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms/" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><h:head><h:title>{{\'person.new\' | translate}}</h:title>' +
          '<model><instance><data id="person" version="1">' +
            '<name/><meta><instanceID/></meta></data></instance>' +
            '<bind nodeset="/person/name" required="true()" type="string"/></model></h:head>' +
          '<h:body>' +
            '<input ref="/person/name">' +
              '<label>{{\'person.name\' | translate}}</label></input>' +
          '</h:body></h:html>');
    });

    it('handles db-reference fields', function() {
      // given
      var schema = {
        type: 'person',
        title: '{{name}}',
        fields: {
          loc: 'db:location',
        },
      };

      // when
      var xform = service.generateXform(schema);

      // then
      assert.equal(xform, '<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms/" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
          '<h:head><h:title>{{\'person.new\' | translate}}</h:title>' +
          '<model><instance><data id="person" version="1">' +
            '<loc/><meta><instanceID/></meta></data></instance>' +
            '<bind nodeset="/person/loc" type="string"/></model></h:head>' +
          '<h:body>' +
            '<input ref="/person/loc" appearance="dbObject" data-db-type="location">' +
              '<label>{{\'person.loc\' | translate}}</label></input>' +
          '</h:body></h:html>');
    });
  });
});
