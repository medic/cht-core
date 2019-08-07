describe('EnketoTranslation service', () => {
  'use strict';

  const assert = chai.assert;
  let service;

  beforeEach(() => {
    module('inboxApp');
    inject(_EnketoTranslation_ => {
      service = _EnketoTranslation_;
    });
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

      assert.equal(element.find('contact > name').text(), '',
        'The contact name should not get the value of the district hospital');
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
  });

});
