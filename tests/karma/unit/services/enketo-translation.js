describe('EnketoTranslation service', function() {
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
    inject(function(_EnketoTranslation_) {
      service = _EnketoTranslation_;
    });
  });

  it('exists', function() {
    assert.isDefined(service);
  });

  describe('#jsToFormInstanceData()', function() {
    it('generates simple XML structure when supplied with form JS', function() {
      // given
      var fields = [ 'name', 'phone', 'code', 'notes', 'parent' ];
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
      var xml = service.jsToFormInstanceData(js, fields);

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
      var xml = service.jsToFormInstanceData(js, [ 'name', 'parent' ]);

      // then
      assert.equal(xml,
        '<person>' +
          '<name>huxley</name>' +
          '<parent>xxx-111</parent>' +
        '</person>');
    });

    it('filters irrelevant fields', function() {
      var fields = [ 'name', 'contact', 'external_id', 'notes' ];
      var js = {
        _id: 'eeb17d6d-5dde-c2c0-a0f2a91e2d232c51',
        _rev: '7-8be7cf82a68ac40b9653a1ac0207bdba',
        name: 'District 2',
        type: 'district_hospital',
        contact: {
          phone: '+2884615402',
          _id: '0abf501d3fbeffaf98bae6c9d6015b9a',
          name: 'Denise Degraffenreid',
          type: 'person'
        },
        parent: {},
        external_id: 'XXX',
        notes: '-- notes here --',
        parents: [{ some_irrelevant_object:1 }],
        children: [{ some_irrelevant_object:2 }, { some_irrelevant_object:3 }],
        contactfor: '',
        contactFor: []
      };

      // when
      var xml = service.jsToFormInstanceData(js, fields);

      // then
      assert.equal(xml,
        '<district_hospital>' +
          '<name>District 2</name>' +
          '<contact>0abf501d3fbeffaf98bae6c9d6015b9a</contact>' +
          '<external_id>XXX</external_id>' +
          '<notes>-- notes here --</notes>' +
        '</district_hospital>');
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
      assert.equal(xform, '<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms/" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><h:head><h:title>contact.type.person.new</h:title>' +
          '<model><instance><person id="person" version="1">' +
            '<name/><meta><instanceID/></meta></person></instance>' +
            '<bind nodeset="/person/name" type="string"/></model></h:head>' +
          '<h:body>' +
            '<input ref="/person/name">' +
              '<label>person.field.name</label></input>' +
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
      assert.equal(xform, '<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms/" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><h:head><h:title>contact.type.person.new</h:title>' +
          '<model><instance><person id="person" version="1">' +
            '<name/><meta><instanceID/></meta></person></instance>' +
            '<bind nodeset="/person/name" required="true()" type="string"/></model></h:head>' +
          '<h:body>' +
            '<input ref="/person/name">' +
              '<label>person.field.name</label></input>' +
          '</h:body></h:html>');
    });

    it('handles text data type', function() {
      // given
      var schema = {
        type: 'dog',
        title: '{{name}}',
        fields: {
          name: {
            type: 'string',
            required: true,
          },
          habits: {
            type: 'text',
          },
        }
      };

      // when
      var xform = service.generateXform(schema);

      // then
      assert.equal(xform, '<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms/" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><h:head><h:title>contact.type.dog.new</h:title>' +
          '<model><instance><dog id="dog" version="1">' +
            '<name/><habits/><meta><instanceID/></meta></dog></instance>' +
            '<bind nodeset="/dog/name" required="true()" type="string"/>' +
            '<bind nodeset="/dog/habits" type="text"/>' +
          '</model></h:head>' +
          '<h:body>' +
            '<input ref="/dog/name">' +
              '<label>dog.field.name</label></input>' +
            '<input appearance="multiline" ref="/dog/habits">' +
              '<label>dog.field.habits</label></input>' +
          '</h:body></h:html>');
    });


    it('handles phone number data type', function() {
      // given
      var schema = {
        type: 'contact',
        title: '{{number}}',
        fields: {
          number: {
            type: 'tel',
          }
        }
      };

      // when
      var xform = service.generateXform(schema);

      // then
      assert.equal(xform, '<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms/" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><h:head><h:title>contact.type.contact.new</h:title>' +
          '<model><instance><contact id="contact" version="1">' +
            '<number/><meta><instanceID/></meta></contact></instance>' +
            '<bind nodeset="/contact/number" type="tel"/></model></h:head>' +
          '<h:body>' +
            '<input ref="/contact/number">' +
              '<label>contact.field.number</label></input>' +
          '</h:body></h:html>');
    });

    it('handles db-reference fields', function() {
      // given
      var schema = {
        type: 'person',
        title: '{{name}}',
        fields: {
          loc: {
            type: 'db:location',
          },
        },
      };

      // when
      var xform = service.generateXform(schema);

      // then
      assert.equal(xform, '<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms/" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
          '<h:head><h:title>contact.type.person.new</h:title>' +
          '<model><instance><person id="person" version="1">' +
            '<loc/><meta><instanceID/></meta></person></instance>' +
            '<bind nodeset="/person/loc" type="db:location"/></model></h:head>' +
          '<h:body>' +
            '<input appearance="db-object" ref="/person/loc">' +
              '<label>person.field.loc</label></input>' +
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
          '<h:head><h:title>contact.type.person.new</h:title>' +
          '<model><instance><person id="person" version="1">' +
            '<parent/><meta><instanceID/></meta></person></instance>' +
            '<bind nodeset="/person/parent" type="facility"/></model></h:head>' +
          '<h:body>' +
            '<input ref="/person/parent">' +
              '<label>person.field.parent</label></input>' +
          '</h:body></h:html>');
    });

    it('generates a double XForm when supplied with an object-pair schema', function() {
      // given
      var schema = {
        type: 'clinic',
        title: 'name',
        fields: {
          name: {
            type: 'string',
            required: true,
          },
          external_id: {
            type: 'string',
          },
          parent: {
            type: 'db:district_hospital',
          },
          contact: {
            type: 'db:person',
            required: true,
          },
        },
      };
      var contactSchema = {
        type: 'person',
        title: 'name',
        fields: {
          name: {
            type: 'string',
            required: true,
          },
          phonenumber: {
            type: 'tel',
            required: true,
          },
        },
      };

      // when
      var xform = service.generateXform(schema, { contact:contactSchema });

      // then
      assert.equal(xform,
          '<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms/" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><h:head><h:title>contact.type.clinic.new</h:title>' +
          '<model><instance><data id="clinic" version="1">' +
          '<clinic><name/><external_id/><parent/><contact/></clinic>' +
          '<contact><name/><phonenumber/></contact>' +
          '<meta><instanceID/></meta>' +
          '</data></instance>' +
          '<bind nodeset="/data/clinic/name" required="true()" type="string"/>' +
          '<bind nodeset="/data/clinic/external_id" type="string"/>' +
          '<bind nodeset="/data/clinic/parent" type="db:district_hospital"/>' +
          '<bind nodeset="/data/clinic/contact" required="true()" type="db:person"/>' +
          '<bind nodeset="/data/contact" relevant="/data/clinic/contact = \'NEW\'"/>' +
          '<bind nodeset="/data/contact/name" required="true()" type="string"/>' +
          '<bind nodeset="/data/contact/phonenumber" required="true()" type="tel"/>' +
          '</model></h:head>' +
          '<h:body class="pages">' +
          '<group appearance="field-list" ref="/data/clinic">' +
          '<input ref="/data/clinic/name"><label>clinic.field.name</label></input>' +
          '<input ref="/data/clinic/external_id"><label>clinic.field.external_id</label></input>' +
          '<input appearance="db-object" ref="/data/clinic/parent"><label>clinic.field.parent</label></input>' +
          '<input appearance="db-object" ref="/data/clinic/contact"><label>clinic.field.contact</label></input>' +
          '</group>' +
          '<group appearance="field-list" ref="/data/contact">' +
          '<label>contact.type.person.new</label>' +
          '<input ref="/data/contact/name"><label>person.field.name</label></input>' +
          '<input ref="/data/contact/phonenumber"><label>person.field.phonenumber</label></input>' +
          '</group>' +
          '</h:body></h:html>');
    });
  });

  describe('#recordToJs()', function() {
    it('should convert a simple record to JS', function() {
      // given
      var xml =
        '<person id="person" version="1">' +
          '<name>Denise Degraffenreid</name>' +
          '<phone>+123456789</phone>' +
          '<parent>eeb17d6d-5dde-c2c0-a0f2a91e2d232c51</parent>' +
          '<meta>' +
            '<instanceID>uuid:9bbd57b0-5557-4d69-915c-f8049c81f6d8</instanceID>' +
          '<deprecatedID/></meta>' +
        '</person>';

      // when
      var js = service.recordToJs(xml);

      // then
      assert.deepEqual(js,
        {
          name: 'Denise Degraffenreid',
          phone: '+123456789',
          parent: 'eeb17d6d-5dde-c2c0-a0f2a91e2d232c51',
        });
    });

    it('should convert a complex record without new instance to JS', function() {
      // given
      var xml =
        '<data id="clinic" version="1">' +
          '<clinic>' +
            '<name>A New Catchmnent Area</name>' +
            '<parent>eeb17d6d-5dde-c2c0-48ac53f275043126</parent>' +
            '<contact>abc-123-xyz-987</contact>' +
          '</clinic>' +
          '<contact>' +
            '<name></name>' +
            '<phone></phone>' +
          '</contact>' +
          '<meta>' +
            '<instanceID>uuid:ecded7c5-5c8d-4195-8e08-296de6557f1e</instanceID>' +
          '</meta>' +
        '</data>';

      // when
      var js = service.recordToJs(xml);

      // then
      assert.deepEqual(js, [
        {
          name: 'A New Catchmnent Area',
          parent: 'eeb17d6d-5dde-c2c0-48ac53f275043126',
          contact: 'abc-123-xyz-987',
        },
        {
          contact: {
            name: '',
            phone: '',
          },
        }]);
    });

    it('should convert a complex record with new instance to JS', function() {
      // given
      var xml =
        '<data id="clinic" version="1">' +
          '<clinic>' +
            '<name>A New Catchmnent Area</name>' +
            '<parent>eeb17d6d-5dde-c2c0-48ac53f275043126</parent>' +
            '<contact>NEW</contact>' +
          '</clinic>' +
          '<contact>' +
            '<name>Jeremy Fisher</name>' +
            '<phone>+123456789</phone>' +
          '</contact>' +
          '<meta>' +
            '<instanceID>uuid:ecded7c5-5c8d-4195-8e08-296de6557f1e</instanceID>' +
          '</meta>' +
        '</data>';

      // when
      var js = service.recordToJs(xml);

      // then
      assert.deepEqual(js, [
        {
          name: 'A New Catchmnent Area',
          parent: 'eeb17d6d-5dde-c2c0-48ac53f275043126',
          contact: 'NEW',
        },
        {
          contact: {
            name: 'Jeremy Fisher',
            phone: '+123456789',
          },
        }]);
    });
  });
});
