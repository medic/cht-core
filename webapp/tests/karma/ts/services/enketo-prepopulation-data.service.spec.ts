import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect, assert } from 'chai';

import { EnketoPrepopulationDataService } from '@mm-services/enketo-prepopulation-data.service';

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
});
