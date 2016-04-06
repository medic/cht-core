describe('EnketoTranslation service', function() {
  'use strict';

  var service,
      assert = chai.assert;

  // TODO this definition is leaked to other tests.  It's quite useful, so it
  // should be moved to a common place
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
      assert.equal(xform, '<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms/" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><h:head>' +
          '<model>' +
            '<instance><data id="person" version="1">' +
              '<person><name/></person>' +
              '<meta><instanceID/></meta>' +
            '</data></instance>' +
            '<bind nodeset="/data/person/name" type="string"/></model></h:head>' +
          '<h:body>' +
            '<input ref="/data/person/name">' +
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
      assert.equal(xform, '<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms/" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><h:head>' +
          '<model>' +
            '<instance><data id="person" version="1">' +
              '<person><name/></person>' +
              '<meta><instanceID/></meta>' +
            '</data></instance>' +
            '<bind nodeset="/data/person/name" required="true()" type="string"/></model></h:head>' +
          '<h:body>' +
            '<input ref="/data/person/name">' +
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
      assert.equal(xform, '<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms/" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><h:head>' +
          '<model>' +
            '<instance><data id="dog" version="1">' +
              '<dog><name/><habits/></dog>' +
              '<meta><instanceID/></meta>' +
            '</data></instance>' +
            '<bind nodeset="/data/dog/name" required="true()" type="string"/>' +
            '<bind nodeset="/data/dog/habits" type="text"/>' +
          '</model></h:head>' +
          '<h:body>' +
            '<input ref="/data/dog/name">' +
              '<label>dog.field.name</label></input>' +
            '<input appearance="multiline" ref="/data/dog/habits">' +
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
      assert.equal(xform, '<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms/" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><h:head>' +
          '<model><instance>' +
            '<data id="contact" version="1">' +
              '<contact><number/></contact>' +
              '<meta><instanceID/></meta>' +
            '</data></instance>' +
            '<bind nodeset="/data/contact/number" type="tel"/></model></h:head>' +
          '<h:body>' +
            '<input ref="/data/contact/number">' +
              '<label>contact.field.number</label></input>' +
          '</h:body></h:html>');
    });

    it('handles fields hidden in form', function() {
      // given
      var schema = {
        type: 'contact',
        title: '{{number}}',
        fields: {
          number: {
            type: 'tel',
          },
          secret: {
            hide_in_form: true,
          },
        }
      };

      // when
      var xform = service.generateXform(schema);

      // then
      assert.equal(xform, '<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms/" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><h:head>' +
          '<model><instance><data id="contact" version="1">' +
              '<contact><number/><secret/></contact>' +
              '<meta><instanceID/></meta>' +
            '</data></instance>' +
            '<bind nodeset="/data/contact/number" type="tel"/></model></h:head>' +
          '<h:body>' +
            '<input ref="/data/contact/number">' +
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
          '<h:head>' +
          '<model><instance><data id="person" version="1">' +
              '<person><loc/></person>' +
              '<meta><instanceID/></meta>' +
            '</data></instance>' +
            '<bind nodeset="/data/person/loc" type="db:location"/></model></h:head>' +
          '<h:body>' +
            '<input appearance="db-object bind-id-only" ref="/data/person/loc">' +
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
          '<h:head>' +
          '<model><instance><data id="person" version="1">' +
              '<person><parent/></person>' +
              '<meta><instanceID/></meta>' +
            '</data></instance>' +
            '<bind nodeset="/data/person/parent" type="facility"/></model></h:head>' +
          '<h:body>' +
            '<input ref="/data/person/parent">' +
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
          '<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms/" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><h:head>' +
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
          '<input appearance="db-object bind-id-only" ref="/data/clinic/parent"><label>clinic.field.parent</label></input>' +
          '<input appearance="db-object bind-id-only allow-new" ref="/data/clinic/contact"><label>clinic.field.contact</label></input>' +
          '</group>' +
          '<group appearance="field-list" ref="/data/contact">' +
          '<label>contact.type.person.new</label>' +
          '<input ref="/data/contact/name"><label>person.field.name</label></input>' +
          '<input ref="/data/contact/phonenumber"><label>person.field.phonenumber</label></input>' +
          '</group>' +
          '</h:body></h:html>');
    });
  });

  describe('#contactRecordToJs()', function() {
    it('should convert a simple record to JS', function() {
      // given
      var xml =
        '<data id="person" version="1">' +
          '<person>' +
            '<name>Denise Degraffenreid</name>' +
            '<phone>+123456789</phone>' +
            '<parent>eeb17d6d-5dde-c2c0-a0f2a91e2d232c51</parent>' +
          '</person>' +
          '<meta>' +
            '<instanceID>uuid:9bbd57b0-5557-4d69-915c-f8049c81f6d8</instanceID>' +
          '<deprecatedID/></meta>' +
        '</data>';

      // when
      var js = service.contactRecordToJs(xml);

      // then
      assert.deepEqual(js, [
        {
          name: 'Denise Degraffenreid',
          phone: '+123456789',
          parent: 'eeb17d6d-5dde-c2c0-a0f2a91e2d232c51',
        },
        {}
      ]);
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
      var js = service.contactRecordToJs(xml);

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
      var js = service.contactRecordToJs(xml);

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

    it('should support repeated elements', function() {
      // given
      var xml =
        '<data id="clinic" version="1">' +
          '<clinic>' +
            '<name>A House in the Woods</name>' +
            '<parent>eeb17d6d-5dde-c2c0-48ac53f275043126</parent>' +
            '<contact>abc-123-xyz-987</contact>' +
          '</clinic>' +
          '<contact>' +
            '<name>Mummy Bear</name>' +
            '<phone>123</phone>' +
          '</contact>' +
          '<repeat>' +
            '<child>' +
              '<name>Daddy Bear</name>' +
            '</child>' +
            '<child>' +
              '<name>Baby Bear</name>' +
            '</child>' +
            '<child>' +
              '<name>Goldilocks</name>' +
            '</child>' +
          '</repeat>' +
          '<meta>' +
            '<instanceID>uuid:ecded7c5-5c8d-4195-8e08-296de6557f1e</instanceID>' +
          '</meta>' +
        '</data>';

      // when
      var js = service.contactRecordToJs(xml);

      // then
      assert.deepEqual(js, [
        {
          name: 'A House in the Woods',
          parent: 'eeb17d6d-5dde-c2c0-48ac53f275043126',
          contact: 'abc-123-xyz-987',
        },
        {
          contact: {
            name: 'Mummy Bear',
            phone: '123',
          },
        },
        {
          child_data: [
            { name: 'Daddy Bear', },
            { name: 'Baby Bear', },
            { name: 'Goldilocks', },
          ],
        },
      ]);
    });

    it('should ignore text in repeated elements', function() {
      // given
      var xml =
        '<data id="clinic" version="1">' +
          '<clinic>' +
            '<name>A House in the Woods</name>' +
            '<parent>eeb17d6d-5dde-c2c0-48ac53f275043126</parent>' +
            '<contact>abc-123-xyz-987</contact>' +
          '</clinic>' +
          '<contact>' +
            '<name>Mummy Bear</name>' +
            '<phone>123</phone>' +
          '</contact>' +
          '<repeat>' +
            'All text nodes should be ignored.' +
            '<child>' +
              '<name>Daddy Bear</name>' +
            '</child>' +
            'All text nodes should be ignored.' +
            '<child>' +
              '<name>Baby Bear</name>' +
            '</child>' +
            'All text nodes should be ignored.' +
            '<child>' +
              '<name>Goldilocks</name>' +
            '</child>' +
            'All text nodes should be ignored.' +
          '</repeat>' +
          '<meta>' +
            '<instanceID>uuid:ecded7c5-5c8d-4195-8e08-296de6557f1e</instanceID>' +
          '</meta>' +
        '</data>';

      // when
      var js = service.contactRecordToJs(xml);

      // then
      assert.deepEqual(js, [
        {
          name: 'A House in the Woods',
          parent: 'eeb17d6d-5dde-c2c0-48ac53f275043126',
          contact: 'abc-123-xyz-987',
        },
        {
          contact: {
            name: 'Mummy Bear',
            phone: '123',
          },
        },
        {
          child_data: [
            { name: 'Daddy Bear', },
            { name: 'Baby Bear', },
            { name: 'Goldilocks', },
          ],
        },
      ]);
    });

    it('should include repeats if they are explicitly requested', function() {
      // given
      var xml =
        '<data id="clinic" version="1">' +
          '<clinic>' +
            '<name>A House in the Woods</name>' +
            '<parent>eeb17d6d-5dde-c2c0-48ac53f275043126</parent>' +
            '<contact>abc-123-xyz-987</contact>' +
          '</clinic>' +
          '<contact>' +
            '<name>Mummy Bear</name>' +
            '<phone>123</phone>' +
          '</contact>' +
          '<repeat-relevant><child>true</child></repeat-relevant>' +
          '<repeat>' +
            '<child>' +
              '<name>Daddy Bear</name>' +
            '</child>' +
            '<child>' +
              '<name>Baby Bear</name>' +
            '</child>' +
            '<child>' +
              '<name>Goldilocks</name>' +
            '</child>' +
          '</repeat>' +
          '<meta>' +
            '<instanceID>uuid:ecded7c5-5c8d-4195-8e08-296de6557f1e</instanceID>' +
          '</meta>' +
        '</data>';

      // when
      var js = service.contactRecordToJs(xml);

      // then
      assert.deepEqual(js, [
        {
          name: 'A House in the Woods',
          parent: 'eeb17d6d-5dde-c2c0-48ac53f275043126',
          contact: 'abc-123-xyz-987',
        },
        {
          contact: {
            name: 'Mummy Bear',
            phone: '123',
          },
        },
        {
          child_data: [
            { name: 'Daddy Bear', },
            { name: 'Baby Bear', },
            { name: 'Goldilocks', },
          ],
        },
      ]);
    });

    it('should exclude repeats if they are explicitly excluded', function() {
      // given
      var xml =
        '<data id="clinic" version="1">' +
          '<clinic>' +
            '<name>A House in the Woods</name>' +
            '<parent>eeb17d6d-5dde-c2c0-48ac53f275043126</parent>' +
            '<contact>abc-123-xyz-987</contact>' +
          '</clinic>' +
          '<contact>' +
            '<name>Mummy Bear</name>' +
            '<phone>123</phone>' +
          '</contact>' +
          '<repeat-relevant><child>false</child></repeat-relevant>' +
          '<repeat>' +
            '<child>' +
              '<name>Daddy Bear</name>' +
            '</child>' +
            '<child>' +
              '<name>Baby Bear</name>' +
            '</child>' +
            '<child>' +
              '<name>Goldilocks</name>' +
            '</child>' +
          '</repeat>' +
          '<meta>' +
            '<instanceID>uuid:ecded7c5-5c8d-4195-8e08-296de6557f1e</instanceID>' +
          '</meta>' +
        '</data>';

      // when
      var js = service.contactRecordToJs(xml);

      // then
      assert.deepEqual(js, [
        {
          name: 'A House in the Woods',
          parent: 'eeb17d6d-5dde-c2c0-48ac53f275043126',
          contact: 'abc-123-xyz-987',
        },
        {
          contact: {
            name: 'Mummy Bear',
            phone: '123',
          },
        },
        {},
      ]);
    });
  });

  describe('#reportRecordToJs()', function() {
    it('should convert nested nodes to nested JSON', function() {
      // given
      var xml =
        '<treatments id="ASDF" version="abc123">' +
          '<date>Last Friday</date>' +
          '<district>' +
            '<id>d1</id>' +
            '<name>DISTRICT ONE</name>' +
          '</district>' +
          '<patient>' +
            '<condition>' +
              '<temperature>41</temperature>' +
              '<weight>100</weight>' +
            '</condition>' +
            '<prescription>' +
              '<name>paracetamol</name>' +
              '<dose>1g * 4, 1/7</dose>' +
            '</prescription>' +
          '</patient>' +
        '</treatments>';

      // when
      var js = service.reportRecordToJs(xml);

      // then
      assert.deepEqual(js, {
        date: 'Last Friday',
        district: {
          id: 'd1',
          name: 'DISTRICT ONE',
        },
        patient: {
          condition: {
            temperature: '41',
            weight: '100',
          },
          prescription: {
            name: 'paracetamol',
            dose: '1g * 4, 1/7',
          },
        },
      });
    });
  });

  describe('#getHiddenFieldList()', function() {
    it('returns of one an empty array if no fields are hidden', function() {
      // given
      var xml =
        '<doc>' +
          '<name>Sally</name>' +
          '<lmp>10</lmp>' +
        '</doc>';

      // when
      var hidden_fields = service.getHiddenFieldList(xml);

      // then
      assert.deepEqual(hidden_fields, []);
    });

    it('returns an array containing fields tagged `hidden`', function() {
      // given
      var xml =
        '<doc>' +
          '<name>Sally</name>' +
          '<secret_code_name_one tag="hidden">S4L</secret_code_name_one>' +
          '<secret_code_name_two tag="hidden">S5L</secret_code_name_two>' +
          '<lmp>10</lmp>' +
        '</doc>';

      // when
      var hidden_fields = service.getHiddenFieldList(xml);

      // then
      assert.deepEqual(hidden_fields, [ 'secret_code_name_one', 'secret_code_name_two' ]);
    });
  });

  describe('#bindJsonToXml()', function() {
    it('binds simple data', function() {
      // given
      var model =
        '<data id="district_hospital" version="1">' +
          '<district_hospital>' +
            '<name/>' +
            '<external_id/>' +
            '<notes/>' +
          '</district_hospital>' +
          '<meta>' +
            '<instanceID/>' +
          '</meta>' +
        '</data>';
      var element = $($.parseXML(model));
      var data = {
          district_hospital: {
            name: 'Davesville',
            external_id: 'THING',
            notes: 'Some notes',
            type: 'district_hospital',
          },
        };

      // when
      service.bindJsonToXml(element, data);

      // then
      assert.equal(element.find('name').text(), 'Davesville');
      assert.equal(element.find('external_id').text(), 'THING');
      assert.equal(element.find('notes').text(), 'Some notes');
    });

    it('binds embedded objects to id-only fields', function() {
      // given
      var model =
        '<data id="district_hospital" version="1">' +
          '<district_hospital>' +
            '<name/>' +
            '<contact/>' +
            '<external_id/>' +
            '<notes/>' +
          '</district_hospital>' +
          '<meta>' +
            '<instanceID/>' +
          '</meta>' +
        '</data>';
      var element = $($.parseXML(model));
      var data = {
          district_hospital: {
            name: 'Davesville',
            contact: {
              _id: 'abc-123',
              name: 'Dr. D',
            },
            external_id: 'THING',
            notes: 'Some notes',
            type: 'district_hospital',
          },
        };

      // when
      service.bindJsonToXml(element, data);

      // then
      assert.equal(element.find('name').text(), 'Davesville');
      assert.equal(element.find('contact').text(), 'abc-123');
      assert.equal(element.find('external_id').text(), 'THING');
      assert.equal(element.find('notes').text(), 'Some notes');
    });

    it('binds embedded objects to trees', function() {
      // given
      var model =
        '<data id="district_hospital" version="1">' +
          '<district_hospital>' +
            '<name/>' +
            '<contact>' +
              '<_id/>' +
              '<name/>' +
            '</contact>' +
            '<external_id/>' +
            '<notes/>' +
          '</district_hospital>' +
          '<meta>' +
            '<instanceID/>' +
          '</meta>' +
        '</data>';
      var element = $($.parseXML(model));
      var data = {
          district_hospital: {
            name: 'Davesville',
            contact: {
              _id: 'abc-123',
              name: 'Dr. D',
            },
            external_id: 'THING',
            notes: 'Some notes',
            type: 'district_hospital',
          },
        };

      // when
      service.bindJsonToXml(element, data);

      // then
      assert.equal(element.find('district_hospital > name').text(), 'Davesville');
      assert.equal(element.find('district_hospital > external_id').text(), 'THING');
      assert.equal(element.find('district_hospital > notes').text(), 'Some notes');

      assert.equal(element.find('contact > _id').text(), 'abc-123');
      assert.equal(element.find('contact > name').text(), 'Dr. D');
    });

    it('binds single data values to all matching elems of the model', function() {
      var TEST_VALUE = 'testValue';

      var element = $($.parseXML('<foo><bar></bar><bar></bar><baz><bar></bar></baz></foo>'));
      var data = {
        bar: TEST_VALUE
      };

      service.bindJsonToXml(element, data);
      var results = element.find('bar');

      assert.equal(results.length, 3);
      results.each(function(idx, bar) {
        assert.equal($(bar).text(), TEST_VALUE);
      });
    });

    it('preferentially binds to more specific data structures', function() {
      var DEEP_TEST_VALUE = 'deep';

      var element = $($.parseXML('<foo><bar><baz><smang /></baz></bar></foo>'));
      var data = {
        foo: {
          smang: 'shallow5',
          baz: {
            smang: 'shallow6'
          }
        },
        smang: 'shallow1',
        bar: {
          baz: {
            smang: DEEP_TEST_VALUE
          },
          smang: 'shallow2'
        },
      };

      service.bindJsonToXml(element, data);

      assert.equal(element.find('smang').text(), DEEP_TEST_VALUE);
    });
  });

});
