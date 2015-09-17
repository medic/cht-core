describe('Mega service', function() {
  'use strict';
  
  var service,
      assert = chai.assert;

  var equal = assert.equal;
  assert.equal = function() {
    try {
      equal.apply(this, arguments);
    } catch(e) {
      throw new Error(e +
          '\nA: ' + arguments[0] +
          '\nB: ' + arguments[1]);
    }
  };

  beforeEach(function() {
    module('inboxApp');
    inject(function(_Mega_) {
      service = _Mega_;
    });
  });

  it('exists', function() {
    assert.isDefined(service);
  });

  describe('#jsToFormInstanceData()', function() {
    it('generates simple XML structure when supplied with form JS', function() {
      // given
      var js = {
        _id: 'abc-123-xyz',
        type: 'person',
        name: 'Abraham Apple',
        phone: '+447890123456',
        code: 'morse',
        notes: 'Mr. Apple is a big-time Charlie.  1 < 2.',
        parent: 'asdf-123-zxcv',
      };

      // when
      var xml = service.jsToFormInstanceData(js);

      // then
      assert.equal(xml,
        '<person>' +
          '<name>Abraham Apple</name>' +
          '<phone>+447890123456</phone>' +
          '<code>morse</code>' +
          '<notes>Mr. Apple is a big-time Charlie.  1 &lt; 2.</notes>' +
          '<parent>asdf-123-zxcv</parent>' +
        '</person>');
    });

    it('converts couch object values to IDs', function() {
      // given
      var js = {
        _id: 'xyz-123',
        type: 'person',
        name: 'huxley',
        parent: { _id:'xxx-111', name:'meridian' },
      };

      // when
      var xml = service.jsToFormInstanceData(js);

      // then
      assert.equal(xml,
        '<person>' +
          '<name>huxley</name>' +
          '<parent>xxx-111</parent>' +
        '</person>');
    });
  });

  describe('XForm generation', function() {
    it('generates a simple XForm when supplied with a simple schema', function() {
      // given
      var schema = {
        type: 'person',
        title: '{{name}}',
        fields: {
          name: {
            type: 'string',
          },
        },
      };

      // when
      var xform = service.generateXform(schema);

      // then
      assert.equal(xform, '<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms/" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><h:head><h:title>{{\'person.new\' | translate}}</h:title>' +
          '<model><instance><person id="person" version="1">' +
            '<name/><meta><instanceID/></meta></person></instance>' +
            '<bind nodeset="/person/name" type="string"/></model></h:head>' +
          '<h:body>' +
            '<input ref="/person/name">' +
              '<label>{{\'person.name\' | translate}}</label></input>' +
          '</h:body></h:html>');
    });

    it('handles *required* fields', function() {
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
          '<model><instance><person id="person" version="1">' +
            '<name/><meta><instanceID/></meta></person></instance>' +
            '<bind nodeset="/person/name" required="true()" type="string"/></model></h:head>' +
          '<h:body>' +
            '<input ref="/person/name">' +
              '<label>{{\'person.name\' | translate}}</label></input>' +
          '</h:body></h:html>');
    });

    it('handles phone number data type', function() {
      // given
      var schema = {
        type: 'contact',
        title: '{{number}}',
        fields: {
          number: {
            type: 'phone',
          }
        }
      };

      // when
      var xform = service.generateXform(schema);

      // then
      assert.equal(xform, '<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms/" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><h:head><h:title>{{\'contact.new\' | translate}}</h:title>' +
          '<model><instance><contact id="contact" version="1">' +
            '<number/><meta><instanceID/></meta></contact></instance>' +
            '<bind nodeset="/contact/number" type="phone"/></model></h:head>' +
          '<h:body>' +
            '<input ref="/contact/number">' +
              '<label>{{\'contact.number\' | translate}}</label></input>' +
          '</h:body></h:html>');
    });

    it('handles db-reference fields', function() {
      // given
      var schema = {
        type: 'person',
        title: '{{name}}',
        fields: {
          loc: {
            type: 'db',
            db_type: 'location',
          },
        },
      };

      // when
      var xform = service.generateXform(schema);

      // then
      assert.equal(xform, '<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms/" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
          '<h:head><h:title>{{\'person.new\' | translate}}</h:title>' +
          '<model><instance><person id="person" version="1">' +
            '<loc/><meta><instanceID/></meta></person></instance>' +
            '<bind nodeset="/person/loc" type="string"/></model></h:head>' +
          '<h:body>' +
            '<input ref="/person/loc" appearance="db-object" data-db-type="location">' +
              '<label>{{\'person.loc\' | translate}}</label></input>' +
          '</h:body></h:html>');
    });

    it('handles facility fields', function() {
      // given
      var schema = {
        type: 'person',
        title: '{{name}}',
        fields: {
          parent: {
            type: 'facility',
          },
        },
      };

      // when
      var xform = service.generateXform(schema);

      // then
      assert.equal(xform, '<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms/" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
          '<h:head><h:title>{{\'person.new\' | translate}}</h:title>' +
          '<model><instance><person id="person" version="1">' +
            '<parent/><meta><instanceID/></meta></person></instance>' +
            '<bind nodeset="/person/parent" type="facility"/></model></h:head>' +
          '<h:body>' +
            '<input ref="/person/parent">' +
              '<label>{{\'person.parent\' | translate}}</label></input>' +
          '</h:body></h:html>');
    });
  });
});
