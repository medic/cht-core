import { TestBed } from '@angular/core/testing';
import { assert } from 'chai';

import { EnketoTranslationService } from '@mm-services/enketo-translation.service';


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
});
