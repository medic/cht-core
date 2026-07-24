import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect, assert } from 'chai';

import { EnketoPrepopulationDataService } from '@mm-services/enketo-prepopulation-data.service';
import { CONTACT_TYPES } from '@medic/constants';

const inlineXml = (xmlString) => xmlString
  .replace(/^\s+|\n|\t|\s+$/g, '')
  .replace(/>\s+</g, '><');

const serialize = (element) => {
  const serialized = new XMLSerializer().serializeToString(element);
  return inlineXml(serialized);
};

describe('EnketoPrepopulationData service', () => {
  let service;

  const generatedForm =
    '<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms/" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
      '<h:head>' +
        '<model>' +
          '<instance>' +
            '<data id="person" version="1">' +
              '<person><name/></person>' +
              '<meta><instanceID/></meta>' +
            '</data>' +
          '</instance>' +
          '<bind nodeset="/data/person/name" type="string"/>' +
        '</model>' +
      '</h:head>' +
      '<h:body>' +
        '<input ref="/data/person/name">' +
          '<label>person.field.name</label>' +
        '</input>' +
      '</h:body>' +
    '</h:html>';

  const editPersonForm =
    '<?xml version="1.0" encoding="UTF-8"?><h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><h:head>' +
      '<model>' +
        '<instance>' +
          '<data id="person" version="2015-11-11">' +
            '<inputs>' +
              '<user>' +
                '<name/>' +
                '<language/>' +
              '</user>' +
              '<meta>' +
                '<location>' +
                  '<lat/>' +
                  '<long/>' +
                '</location>' +
              '</meta>' +
            '</inputs>' +
            '<person>' +
              '<type>person</type>' +
              '<parent>PARENT</parent>' +
              '<last_name/>' +
              '<first_name/>' +
              '<date_of_birth/>' +
              '<date_of_birth_method/>' +
              '<ephemeral_dob>' +
                '<dob_calendar/>' +
                '<age_years/>' +
                '<age_months>0</age_months>' +
                '<dob_method/>' +
                '<dob_raw/>' +
                '<dob/>' +
              '</ephemeral_dob>' +
            '</person>' +
            '<meta>' +
              '<instanceID/>' +
            '</meta>' +
          '</data>' +
        '</instance>' +
      '</model>' +
    '</h:head></h:html>';

  const editPersonFormWithoutInputs =
    '<?xml version="1.0" encoding="UTF-8"?><h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><h:head>' +
      '<model>' +
        '<instance>' +
          '<data id="person" version="2015-11-11">' +
            '<person>' +
              '<type>person</type>' +
              '<parent>PARENT</parent>' +
              '<last_name/>' +
              '<first_name/>' +
              '<date_of_birth/>' +
              '<date_of_birth_method/>' +
              '<ephemeral_dob>' +
                '<dob_calendar/>' +
                '<age_years/>' +
                '<age_months>0</age_months>' +
                '<dob_method/>' +
                '<dob_raw/>' +
                '<dob/>' +
              '</ephemeral_dob>' +
            '</person>' +
            '<meta>' +
              '<instanceID/>' +
            '</meta>' +
          '</data>' +
        '</instance>' +
      '</model>' +
    '</h:head></h:html>';

  const pregnancyForm =
    '<?xml version="1.0" encoding="UTF-8"?><h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><h:head>' +
      '<model>' +
        '<instance>' +
          '<pregnancy id="person" version="2015-11-11">' +
            '<inputs>' +
              '<user>' +
                '<name/>' +
              '</user>' +
              '<meta>' +
                '<location>' +
                  '<lat/>' +
                  '<long/>' +
                '</location>' +
              '</meta>' +
            '</inputs>' +
            '<person>' +
              '<type>person</type>' +
              '<parent>PARENT</parent>' +
              '<last_name/>' +
              '<first_name/>' +
              '<date_of_birth/>' +
              '<date_of_birth_method/>' +
              '<ephemeral_dob>' +
                '<dob_calendar/>' +
                '<age_years/>' +
                '<age_months>0</age_months>' +
                '<dob_method/>' +
                '<dob_raw/>' +
                '<dob/>' +
              '</ephemeral_dob>' +
            '</person>' +
            '<meta>' +
              '<instanceID/>' +
            '</meta>' +
          '</pregnancy>' +
        '</instance>' +
      '</model>' +
    '</h:head></h:html>';

  beforeEach(() => {
    service = TestBed.inject(EnketoPrepopulationDataService);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('exists', function() {
    assert.isDefined(service);
  });

  it('returns the given string', () => {
    const model = '';
    const data = '<some_data/>';
    const actual = service.get({ }, model, data);
    expect(actual).to.equal(data);
  });

  it('binds user details into model', () => {
    const data = {};
    const user = { name: 'geoff' };
    const actual = service.get(user, editPersonForm, data);
    const xml = $($.parseXML(actual));
    expect(xml.find('inputs > user > name')[0].innerHTML).to.equal(user.name);
  });

  it('binds form content into model', () => {
    const data = { person: { last_name: 'salmon' } };
    const user = { name: 'geoff' };
    const actual = service.get(user, editPersonFormWithoutInputs, data);
    const xml = $($.parseXML(actual));
    expect(xml.find('data > person > last_name')[0].innerHTML).to.equal(data.person.last_name);
  });

  it('binds form content into generated form model', () => {
    const data = { person: { name: 'sally' } };
    const user = { name: 'geoff' };
    const actual = service.get(user, generatedForm, data);
    const xml = $($.parseXML(actual));
    expect(xml.find('data > person > name')[0].innerHTML).to.equal(data.person.name);
  });

  it('binds user details, user language and form content into model', () => {
    const data = { person: { last_name: 'salmon' } };
    const user = { name: 'geoff', language: 'en' };
    const actual = service.get(user, editPersonForm, data);
    const xml = $($.parseXML(actual));
    expect(xml.find('inputs > user > name')[0].innerHTML).to.equal(user.name);
    expect(xml.find('inputs > user > language')[0].innerHTML).to.equal('en');
    expect(xml.find('data > person > last_name')[0].innerHTML).to.equal(data.person.last_name);
  });

  it('binds form content into model with custom root node', () => {
    const data = { person: { last_name: 'salmon' } };
    const user = { name: 'geoff' };
    const actual = service.get(user, pregnancyForm, data);
    const xml = $($.parseXML(actual));
    expect(xml.find('inputs > user > name')[0].innerHTML).to.equal(user.name);
    expect(xml.find('pregnancy > person > last_name')[0].innerHTML).to.equal(data.person.last_name);
  });

  describe('bindJsonToXml', () => {
    it('binds simple data', () => {
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
          type: CONTACT_TYPES.DISTRICT_HOSPITAL,
        },
      };

      service['bindJsonToXml'](element, data);

      assert.equal(element.find('name').text(), 'Davesville');
      assert.equal(element.find('external_id').text(), 'THING');
      assert.equal(element.find('notes').text(), 'Some notes');
    });

    it('binds embedded objects to id-only fields', () => {
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
          type: CONTACT_TYPES.DISTRICT_HOSPITAL,
        },
      };

      service['bindJsonToXml'](element, data);

      assert.equal(element.find('name').text(), 'Davesville');
      assert.equal(element.find('contact').text(), 'abc-123');
      assert.equal(element.find('external_id').text(), 'THING');
      assert.equal(element.find('notes').text(), 'Some notes');
    });

    it('binds embedded objects to trees', () => {
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
          type: CONTACT_TYPES.DISTRICT_HOSPITAL,
        },
      };

      service['bindJsonToXml'](element, data);

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
          type: CONTACT_TYPES.DISTRICT_HOSPITAL,
        },
      };

      service['bindJsonToXml'](element, data);

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

      service['bindJsonToXml'](element, data);

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
              three: { four: ['baz1four1', 'baz1four2', 'baz1four3'] }
            },
            {
              one: 'baz2one',
              two: 'baz2two',
              three: { four: ['baz2four1', 'baz2four2'] }
            },
            {
              one: 'baz3one',
              two: 'baz3two',
              three: { four: 'baz3four1' }
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
      service['bindJsonToXml'](element, data, (name) => {
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
      assert.equal(serialize(element.find('omg')[0]), inlineXml(`
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
          type: CONTACT_TYPES.DISTRICT_HOSPITAL,
        },
      };

      service['bindJsonToXml'](element, data);

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
