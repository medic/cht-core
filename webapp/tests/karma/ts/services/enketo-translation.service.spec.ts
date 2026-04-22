import { TestBed } from '@angular/core/testing';
import { assert } from 'chai';

import { EnketoTranslationService } from '@mm-services/enketo-translation.service';

const serialize = (element) => {
  if (element.nodeType !== Node.ELEMENT_NODE) {
    element = element[0];
  }
  const serializer = new XMLSerializer();
  const serialized = serializer.serializeToString(element);
  return inlineXml(serialized);
};

const inlineXml = (xmlString) => xmlString
  .replace(/^\s+|\n|\t|\s+$/g, '')
  .replace(/>\s+</g, '><');

describe('EnketoTranslation service', () => {
  let service;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EnketoTranslationService);
  });

  describe('#contactRecordToJs()', () => {
    it('should convert a simple record to JS', () => {
      // given
      const xml =
        `<data id="person" version="1">
          <person>
            <name>Denise Degraffenreid</name>
            <phone>+123456789</phone>
            <parent>eeb17d6d-5dde-c2c0-a0f2a91e2d232c51</parent>
          </person>
          <meta>
            <instanceID>uuid:9bbd57b0-5557-4d69-915c-f8049c81f6d8</instanceID>
          <deprecatedID/></meta>
        </data>`;

      // when
      const js = service.contactRecordToJs(xml);

      // then
      assert.deepEqual(js, {
        doc: {
          name: 'Denise Degraffenreid',
          phone: '+123456789',
          parent: 'eeb17d6d-5dde-c2c0-a0f2a91e2d232c51',
        },
        siblings: {}
      });
    });

    it('should convert a complex record without new instance to JS', () => {
      // given
      const xml =
        `<data id="clinic" version="1">
          <clinic>
            <name>A New Catchmnent Area</name>
            <parent>eeb17d6d-5dde-c2c0-48ac53f275043126</parent>
            <contact>abc-123-xyz-987</contact>
          </clinic>
          <contact>
            <name></name>
            <phone></phone>
          </contact>
          <meta>
            <instanceID>uuid:ecded7c5-5c8d-4195-8e08-296de6557f1e</instanceID>
          </meta>
        </data>`;

      // when
      const js = service.contactRecordToJs(xml);

      // then
      assert.deepEqual(js, {
        doc: {
          name: 'A New Catchmnent Area',
          parent: 'eeb17d6d-5dde-c2c0-48ac53f275043126',
          contact: 'abc-123-xyz-987',
        },
        siblings: {
          contact: {
            name: '',
            phone: '',
          },
        }});
    });

    it('should convert a complex record with new instance to JS', () => {
      // given
      const xml =
        `<data id="clinic" version="1">
          <clinic>
            <name>A New Catchmnent Area</name>
            <parent>eeb17d6d-5dde-c2c0-48ac53f275043126</parent>
            <contact>NEW</contact>
          </clinic>
          <contact>
            <name>Jeremy Fisher</name>
            <phone>+123456789</phone>
          </contact>
          <meta>
            <instanceID>uuid:ecded7c5-5c8d-4195-8e08-296de6557f1e</instanceID>
          </meta>
        </data>`;

      // when
      const js = service.contactRecordToJs(xml);

      // then
      assert.deepEqual(js, {
        doc: {
          name: 'A New Catchmnent Area',
          parent: 'eeb17d6d-5dde-c2c0-48ac53f275043126',
          contact: 'NEW',
        },
        siblings: {
          contact: {
            name: 'Jeremy Fisher',
            phone: '+123456789',
          },
        }});
    });

    it('should support repeated elements', () => {
      // given
      const xml =
        `<data id="clinic" version="1">
          <clinic>
            <name>A House in the Woods</name>
            <parent>eeb17d6d-5dde-c2c0-48ac53f275043126</parent>
            <contact>abc-123-xyz-987</contact>
          </clinic>
          <contact>
            <name>Mummy Bear</name>
            <phone>123</phone>
          </contact>
          <repeat>
            <child>
              <name>Daddy Bear</name>
            </child>
            <child>
              <name>Baby Bear</name>
            </child>
            <child>
              <name>Goldilocks</name>
            </child>
          </repeat>
          <meta>
            <instanceID>uuid:ecded7c5-5c8d-4195-8e08-296de6557f1e</instanceID>
          </meta>
        </data>`;

      // when
      const js = service.contactRecordToJs(xml);

      // then
      assert.deepEqual(js, {
        doc: {
          name: 'A House in the Woods',
          parent: 'eeb17d6d-5dde-c2c0-48ac53f275043126',
          contact: 'abc-123-xyz-987',
        },
        siblings: {
          contact: {
            name: 'Mummy Bear',
            phone: '123',
          },
        },
        repeats: {
          child_data: [
            { name: 'Daddy Bear', },
            { name: 'Baby Bear', },
            { name: 'Goldilocks', },
          ],
        },
      });
    });

    it('should ignore text in repeated elements', () => {
      // given
      const xml =
        `<data id="clinic" version="1">
          <clinic>
            <name>A House in the Woods</name>
            <parent>eeb17d6d-5dde-c2c0-48ac53f275043126</parent>
            <contact>abc-123-xyz-987</contact>
          </clinic>
          <contact>
            <name>Mummy Bear</name>
            <phone>123</phone>
          </contact>
          <repeat>
            All text nodes should be ignored.
            <child>
              <name>Daddy Bear</name>
            </child>
            All text nodes should be ignored.
            <child>
              <name>Baby Bear</name>
            </child>
            All text nodes should be ignored.
            <child>
              <name>Goldilocks</name>
            </child>
            All text nodes should be ignored.
          </repeat>
          <meta>
            <instanceID>uuid:ecded7c5-5c8d-4195-8e08-296de6557f1e</instanceID>
          </meta>
        </data>`;

      // when
      const js = service.contactRecordToJs(xml);

      // then
      assert.deepEqual(js, {
        doc: {
          name: 'A House in the Woods',
          parent: 'eeb17d6d-5dde-c2c0-48ac53f275043126',
          contact: 'abc-123-xyz-987',
        },
        siblings: {
          contact: {
            name: 'Mummy Bear',
            phone: '123',
          },
        },
        repeats: {
          child_data: [
            { name: 'Daddy Bear', },
            { name: 'Baby Bear', },
            { name: 'Goldilocks', },
          ],
        },
      });
    });

    it('should ignore first level elements with no children', () => {
      const xml =
        `<data id="clinic" version="1">
          <start/>
          <clinic>
            <name>A House in the Woods</name>
            <parent>eeb17d6d-5dde-c2c0-48ac53f275043126</parent>
            <contact>abc-123-xyz-987</contact>
          </clinic>
          <today/>
          <contact>
            <name>Mummy Bear</name>
            <phone>123</phone>
          </contact>
          <meta>
            <instanceID>uuid:ecded7c5-5c8d-4195-8e08-296de6557f1e</instanceID>
          </meta>
          <end/>
        </data>`;

      const js = service.contactRecordToJs(xml);

      assert.deepEqual(js, {
        doc: {
          name: 'A House in the Woods',
          parent: 'eeb17d6d-5dde-c2c0-48ac53f275043126',
          contact: 'abc-123-xyz-987',
        },
        siblings: {
          contact: {
            name: 'Mummy Bear',
            phone: '123',
          },
        },
      });
    });
  });

  describe('#reportRecordToJs()', () => {
    it('should convert nested nodes to nested JSON', () => {
      // given
      const xml =
        `<treatments id="ASDF" version="abc123">
          <inputs>
            <meta>
              <location>
                <lat>-47.15</lat>
                <long>-126.72</long>
          </location></meta></inputs>
          <date>Last Friday</date>
          <district>
            <id>d1</id>
            <name>DISTRICT ONE</name>
          </district>
          <patient>
            <condition>
              <temperature>41</temperature>
              <weight>100</weight>
            </condition>
            <prescription>
              <name>paracetamol</name>
              <dose>1g * 4, 1/7</dose>
            </prescription>
          </patient>
        </treatments>`;

      // when
      const js = service.reportRecordToJs(xml);

      // then
      assert.deepEqual(js, {
        inputs: {
          meta: {
            location: {
              lat: '-47.15',
              long: '-126.72'
            }
          }
        },
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

    it('preserves text content of [type=binary] nodes', () => {
      const xml =
        `<data id="form" version="1">
          <photo type="binary">form/photo</photo>
          <signature type="binary">SOME_BASE64</signature>
          <empty type="binary"></empty>
          <name>Alice</name>
        </data>`;

      const js = service.reportRecordToJs(xml);

      assert.equal(js.photo, 'form/photo');
      assert.equal(js.signature, 'SOME_BASE64');
      assert.equal(js.empty, '');
      assert.equal(js.name, 'Alice');
    });

    it('converts repeated fields to arrays - #3430', () => {
      // given
      const record = `
        <treatments id="ASDF" version="abc123">
          <group_test>
            <chp>
              <other_chp>a</other_chp>
            </chp>
            <chp>
              <other_chp>b</other_chp>
            </chp>
          </group_test>
        </treatments>`;

      const form = `
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml">
  <h:head>
    <h:title>Repeat Bug</h:title>
    <model>
      <instance>
        <treatments delimiter="#" id="treatments" prefix="J1!repeat_bug!" version="2017-03-28 00:00:00">
          <group_test>
            <chp jr:template="">
              <other_chp/>
            </chp>
          </group_test>
          <meta>
            <instanceID/>
          </meta>
        </treatments>
      </instance>
      <bind nodeset="/treatments/group_test/chp/other_chp" required="true()" type="db:person"/>
      <bind calculate="concat('uuid:', uuid())" nodeset="/treatments/meta/instanceID" readonly="true()" type="string"/>
    </model>
  </h:head>
  <h:body class="pages">
    <group appearance="field-list" ref="/treatments/group_test">
      <label>Community Event</label>
      <group ref="/treatments/group_test/chp">
        <label></label>
        <repeat nodeset="/treatments/group_test/chp">
          <input appearance="db-object" ref="/treatments/group_test/chp/other_chp">
            <label>CHP Name</label>
          </input>
        </repeat>
      </group>
      <group ref="/treatments/group_test/chp2">
        <label></label>
        <repeat nodeset="/treatments/group_test/chp2">
          <input appearance="db-object" ref="/treatments/group_test/chp/other_chp">
            <label>CHP Name</label>
          </input>
        </repeat>
      </group>
    </group>
  </h:body>
</h:html>`;

      // when
      const js = service.reportRecordToJs(record, form);

      // then
      assert.deepEqual(js, {
        group_test: {
          chp: [
            { other_chp: 'a' },
            { other_chp: 'b' }
          ]
        }
      });
    });
  });

  describe('#getHiddenFieldList()', () => {
    it('returns of one an empty array if no fields are hidden', () => {
      // given
      const xml =
        `<doc>
          <name>Sally</name>
          <lmp>10</lmp>
        </doc>`;

      // when
      const hidden_fields = service.getHiddenFieldList(xml);

      // then
      assert.deepEqual(hidden_fields, []);
    });

    it('returns an array containing fields tagged `hidden`', () => {
      // given
      const xml =
        `<doc>
          <name>Sally</name>
          <secret_code_name_one tag="hidden">S4L</secret_code_name_one>
          <secret_code_name_two tag="hidden">S5L</secret_code_name_two>
          <lmp>10</lmp>
        </doc>`;

      // when
      const hidden_fields = service.getHiddenFieldList(xml);

      // then
      assert.deepEqual(hidden_fields, [ 'secret_code_name_one', 'secret_code_name_two' ]);
    });

    it('hides sections tagged `hidden`', () => {
      // given
      const xml =
        `<doc>
          <name>Sally</name>
          <secret tag="hidden">
            <first>a</first>
            <second>b</second>
          </secret>
          <lmp>10</lmp>
        </doc>`;

      // when
      const hidden_fields = service.getHiddenFieldList(xml);

      // then
      assert.deepEqual(hidden_fields, [ 'secret' ]);
    });

    it('recurses to find `hidden` children', () => {
      // given
      const xml =
        `<doc>
          <name>Sally</name>
          <secret>
            <first tag="hidden">a</first>
            <second>b</second>
          </secret>
          <lmp tag="hidden">10</lmp>
        </doc>`;

      // when
      const hidden_fields = service.getHiddenFieldList(xml);

      // then
      assert.deepEqual(hidden_fields, [ 'secret.first', 'lmp' ]);
    });

    it('should not duplicate hidden paths', () => {
      const xml =
        `<doc>
          <name>Sally</name>
          <secret>
            <first tag="hidden">a</first>
            <second>b</second>
          </secret>
          <lmp tag="hidden">10</lmp>
          <lmp tag="hidden">20</lmp>
          <lmp tag="hidden">30</lmp>
          <lmp tag="hidden">40</lmp>
        </doc>`;

      // when
      const hidden_fields = service.getHiddenFieldList(xml);

      // then
      assert.deepEqual(hidden_fields, [ 'secret.first', 'lmp' ]);
    });
  });

  describe('#bindJsonToXml()', () => {
    it('binds simple data', () => {
      // given
      const model =
        `<data id="district_hospital" version="1">
          <district_hospital>
            <name/>
            <external_id/>
            <notes/>
          </district_hospital>
          <meta>
            <instanceID/>
          </meta>
        </data>`;
      const element = $($.parseXML(model)).children().first();
      const data = {
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

    it('binds embedded objects to id-only fields', () => {
      // given
      const model =
        `<data id="district_hospital" version="1">
          <district_hospital>
            <name/>
            <contact/>
            <external_id/>
            <notes/>
          </district_hospital>
          <meta>
            <instanceID/>
          </meta>
        </data>`;
      const element = $($.parseXML(model)).children().first();
      const data = {
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

    it('binds embedded objects to trees', () => {
      // given
      const model =
        `<data id="district_hospital" version="1">
          <district_hospital>
            <name/>
            <contact>
              <_id/>
              <name/>
            </contact>
            <external_id/>
            <notes/>
          </district_hospital>
          <meta>
            <instanceID/>
          </meta>
        </data>`;
      const element = $($.parseXML(model)).children().first();
      const data = {
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

    it('binds data 1:1 with its representation', () => {
      const element = $($.parseXML(
        `<data id="district_hospital" version="1">
          <district_hospital>
            <name/>
            <contact>
              <_id/>
              <name/>
            </contact>
            <external_id/>
            <notes/>
          </district_hospital>
          <meta>
            <instanceID/>
          </meta>
        </data>`
      )).children().first();
      const data = {
        district_hospital: {
          name: 'Davesville',
          contact: {
            _id: 'abc-123',
          },
          external_id: 'THING',
          notes: 'Some notes',
          type: 'district_hospital',
        },
      };

      service.bindJsonToXml(element, data);

      assert.equal(
        element.find('contact > name').text(),
        '',
        'The contact name should not get the value of the district hospital'
      );
    });

    it('preferentially binds to more specific data structures', () => {
      const DEEP_TEST_VALUE = 'deep';

      const element = $($.parseXML('<foo><bar><baz><smang /></baz></bar></foo>')).children().first();
      const data = {
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

    it('should bind arrays', () => {
      const model = `
      <data>
        <foo>
          <bar></bar>
          <baz>
            <one></one>
            <two></two>
            <three>
              <four></four>
            </three>
          </baz>  
          <omg>
            <thing></thing>  
          </omg>
          <mixrepeat>
            <property></property>  
          </mixrepeat>
        </foo>
      </data>
      `;
      const element = $($.parseXML(model)).children().first();
      const data = {
        foo: {
          bar: 'barvalue',
          baz: [
            {
              one: 'baz1one',
              two: 'baz1two',
              three: {
                four: [
                  'baz1four1',
                  'baz1four2',
                  'baz1four3'
                ]
              }
            },
            {
              one: 'baz2one',
              two: 'baz2two',
              three: {
                four: [
                  'baz2four1',
                  'baz2four2',
                ]
              }
            },
            {
              one: 'baz3one',
              two: 'baz3two',
              three: {
                four: 'baz3four1'
              }
            },
          ],
          omg: {
            thing: [
              'thing1',
              'thing2',
              'thing3',
              { _id: 'id_of_thing_4' }
            ]
          },
          mixrepeat: [
            'one',
            'two',
            { property: 'propvalue' }
          ]
        }
      };
      service.bindJsonToXml(element, data, (name) => {
        return '>%, >inputs>%'.replace(/%/g, name);
      });

      assert.equal(element.find('bar').length, 1);
      assert.equal(element.find('bar').text(), 'barvalue');

      assert.equal(element.find('baz').length, 3);
      assert.equal(serialize(element.find('baz')[0]), inlineXml(`
      <baz>
        <one>baz1one</one>
        <two>baz1two</two>
        <three>
          <four>baz1four1</four>
          <four>baz1four2</four>
          <four>baz1four3</four>
        </three>
      </baz>
      `));

      assert.equal(serialize(element.find('baz')[1]), inlineXml(`
      <baz>
        <one>baz2one</one>
        <two>baz2two</two>
        <three>
          <four>baz2four1</four>
          <four>baz2four2</four>         
        </three>
      </baz>
      `));

      assert.equal(serialize(element.find('baz')[2]), inlineXml(`
      <baz>
        <one>baz3one</one>
        <two>baz3two</two>
        <three>
          <four>baz3four1</four>                  
        </three>
      </baz>
      `));

      assert.equal(element.find('omg').length, 1);
      assert.equal(serialize(element.find('omg')), inlineXml(`
      <omg>
        <thing>thing1</thing>
        <thing>thing2</thing>
        <thing>thing3</thing>
        <thing>id_of_thing_4</thing>
      </omg>
      `));

      assert.equal(element.find('mixrepeat').length, 3);
      assert.equal(serialize(element.find('mixrepeat')[0]), '<mixrepeat>one</mixrepeat>');
      assert.equal(serialize(element.find('mixrepeat')[1]), '<mixrepeat>two</mixrepeat>');
      assert.equal(
        serialize(element.find('mixrepeat')[2]),
        '<mixrepeat><property>propvalue</property></mixrepeat>'
      );
    });

    describe('[type=binary] handling', () => {
      const buildModel = (defaultText = '') => $($.parseXML(
        `<data id="form" version="1">
          <photo type="binary">${defaultText}</photo>
          <name/>
        </data>`
      )).children().first();

      it('preserves the form default when saved value is empty string', () => {
        const element = buildModel('DEFAULT_BASE64');
        service.bindJsonToXml(element, { photo: '', name: 'Alice' });
        assert.equal(element.find('photo').text(), 'DEFAULT_BASE64');
        assert.equal(element.find('name').text(), 'Alice');
      });

      it('preserves the form default when saved value is null', () => {
        const element = buildModel('DEFAULT_BASE64');
        service.bindJsonToXml(element, { photo: null, name: 'Alice' });
        assert.equal(element.find('photo').text(), 'DEFAULT_BASE64');
      });

      it('preserves the form default when saved value is undefined', () => {
        const element = buildModel('DEFAULT_BASE64');
        service.bindJsonToXml(element, { photo: undefined, name: 'Alice' });
        assert.equal(element.find('photo').text(), 'DEFAULT_BASE64');
      });

      it('preserves the form default when saved value is a reference name', () => {
        const element = buildModel('DEFAULT_BASE64');
        service.bindJsonToXml(element, {
          photo: 'form/photo',
          name: 'Alice',
        });
        assert.equal(element.find('photo').text(), 'DEFAULT_BASE64');
      });

      it('preserves the form default when saved value is a contact-form reference name', () => {
        const element = buildModel('DEFAULT_BASE64');
        service.bindJsonToXml(element, {
          photo: 'contact:person:create/person/photo',
          name: 'Alice',
        });
        assert.equal(element.find('photo').text(), 'DEFAULT_BASE64');
      });

      it('binds through genuine inline base64 (covers injection on create)', () => {
        const element = buildModel('DEFAULT_BASE64');
        service.bindJsonToXml(element, {
          photo: 'INJECTED_BASE64_DATA',
          name: 'Alice',
        });
        assert.equal(element.find('photo').text(), 'INJECTED_BASE64_DATA');
      });

      it('binds through base64 even when it contains slashes (not a reference)', () => {
        const element = buildModel('DEFAULT_BASE64');
        // real base64 carries `+`/`=` chars, so it is not a path of node names
        service.bindJsonToXml(element, {
          photo: 'data:image/png;base64,iVBOR/w0K+Gg==',
          name: 'Alice',
        });
        assert.equal(
          element.find('photo').text(),
          'data:image/png;base64,iVBOR/w0K+Gg==',
          'base64 content should not be mistaken for a reference name'
        );
      });

      it('still clears empty values on non-binary leaves (no regression)', () => {
        const element = buildModel('DEFAULT_BASE64');
        service.bindJsonToXml(element, { photo: '', name: '' });
        assert.equal(element.find('name').text(), '');
      });

      it('binds through saved filenames on [type=file] nodes (file-widget unaffected)', () => {
        const element = $($.parseXML(
          `<data id="form" version="1">
            <upload type="file"/>
          </data>`
        )).children().first();
        service.bindJsonToXml(element, { upload: 'photo.jpg-1700000000000' });
        assert.equal(element.find('upload').text(), 'photo.jpg-1700000000000');
      });
    });

    describe('isAttachmentRef', () => {
      [
        [ 'form/photo', true ],
        [ 'embedded_multimedia/notes_with_media/base64_note', true ],
        [ 'contact:person:create/person/photo', true ],
        [ 'thing_1/doc1/photo1', true ],
      ].forEach(([ value, expected ]) => {
        it(`recognizes reference name "${value}"`, () => {
          assert.equal(service.isAttachmentRef(value), expected);
        });
      });

      [
        [ 'photo', false ],                                  // single segment, no slash
        [ '', false ],                                       // empty
        [ 'INJECTED_BASE64_DATA', false ],                   // single token
        [ 'data:image/png;base64,iVBOR/w0K+Gg==', false ],   // base64 (`+`/`=`/`;`/`,`)
        [ 'aGVsbG8/d29ybGQ=', false ],                       // base64 with slash but `=` and one segment-ish
        [ null, false ],
        [ undefined, false ],
        [ 42, false ],
      ].forEach(([ value, expected ]) => {
        it(`rejects non-reference value ${JSON.stringify(value)}`, () => {
          assert.equal(service.isAttachmentRef(value), expected);
        });
      });
    });

    it('should remove template-like attributes', () => {
      const model =
        `<data xmlns:jr="http://openrosa.org/javarosa">
          <district_hospital jr:template="">
            <name template=""></name>
            <external_id jr:template=""></external_id>
            <notes template=""></notes>
          </district_hospital>
          <meta>
            <instanceID/>
          </meta>
        </data>`;
      const element = $($.parseXML(model)).children().first();
      const data = {
        district_hospital: {
          name: 'Davesville',
          external_id: 'THING',
          notes: 'Some notes',
          type: 'district_hospital',
        },
      };

      service.bindJsonToXml(element, data);

      assert.equal(element.find('district_hospital')[0].hasAttribute('jr:template'), false);
      assert.equal(element.find('district_hospital')[0].hasAttribute('template'), false);

      assert.equal(element.find('name')[0].hasAttribute('jr:template'), false);
      assert.equal(element.find('name')[0].hasAttribute('template'), false);

      assert.equal(element.find('external_id')[0].hasAttribute('jr:template'), false);
      assert.equal(element.find('external_id')[0].hasAttribute('template'), false);

      assert.equal(element.find('notes')[0].hasAttribute('jr:template'), false);
      assert.equal(element.find('notes')[0].hasAttribute('template'), false);
    });
  });
});
