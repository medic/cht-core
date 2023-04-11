import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect, assert } from 'chai';

import { EnketoPrepopulationDataService } from '@mm-services/enketo-prepopulation-data.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { LanguageService } from '@mm-services/language.service';

describe('EnketoPrepopulationData service', () => {
  let service;
  let UserSettings;
  let languageSettings;

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
    UserSettings = sinon.stub();
    languageSettings = sinon.stub();
    TestBed.configureTestingModule({
      providers: [
        { provide: UserSettingsService, useValue: { get: UserSettings } },
        { provide: LanguageService, useValue: { get: languageSettings } },
      ]
    });
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
    return service.get(model, data).then((actual) => {
      expect(actual).to.equal(data);
    });
  });

  it('rejects when user settings fails', () => {
    const model = '';
    const data = {};
    UserSettings.rejects('phail');
    return service
      .get(model, data)
      .then(() => assert.fail('Expected fail'))
      .catch((err) => {
        expect(err.name).to.equal('phail');
        expect(UserSettings.callCount).to.equal(1);
      });
  });

  it('binds user details into model', () => {
    const data = {};
    const user = { name: 'geoff' };
    UserSettings.resolves(user);
    return service
      .get(editPersonForm, data)
      .then((actual) => {
        const xml = $($.parseXML(actual));
        expect(xml.find('inputs > user > name')[0].innerHTML).to.equal(user.name);
        expect(UserSettings.callCount).to.equal(1);
      });
  });

  it('binds form content into model', () => {
    const data = { person: { last_name: 'salmon' } };
    const user = { name: 'geoff' };
    UserSettings.resolves(user);
    return service
      .get(editPersonFormWithoutInputs, data)
      .then((actual) => {
        const xml = $($.parseXML(actual));
        expect(xml.find('data > person > last_name')[0].innerHTML).to.equal(data.person.last_name);
        expect(UserSettings.callCount).to.equal(1);
      });
  });

  it('binds form content into generated form model', () => {
    const data = { person: { name: 'sally' } };
    const user = { name: 'geoff' };
    UserSettings.resolves(user);
    return service
      .get(generatedForm, data)
      .then((actual) => {
        const xml = $($.parseXML(actual));
        expect(xml.find('data > person > name')[0].innerHTML).to.equal(data.person.name);
        expect(UserSettings.callCount).to.equal(1);
      });
  });

  it('binds user details, user language and form content into model', () => {
    const data = { person: { last_name: 'salmon' } };
    const user = { name: 'geoff' };
    UserSettings.resolves(user);
    languageSettings.resolves('en');
    return service
      .get(editPersonForm, data)
      .then((actual) => {
        const xml = $($.parseXML(actual));
        expect(xml.find('inputs > user > name')[0].innerHTML).to.equal(user.name);
        expect(xml.find('inputs > user > language')[0].innerHTML).to.equal('en');
        expect(xml.find('data > person > last_name')[0].innerHTML).to.equal(data.person.last_name);
        expect(UserSettings.callCount).to.equal(1);
        expect(languageSettings.callCount).to.equal(1);
      });
  });

  it('binds form content into model with custom root node', () => {
    const data = { person: { last_name: 'salmon' } };
    const user = { name: 'geoff' };
    UserSettings.resolves(user);
    return service
      .get(pregnancyForm, data)
      .then((actual) => {
        const xml = $($.parseXML(actual));
        expect(xml.find('inputs > user > name')[0].innerHTML).to.equal(user.name);
        expect(xml.find('pregnancy > person > last_name')[0].innerHTML).to.equal(data.person.last_name);
        expect(UserSettings.callCount).to.equal(1);
      });
  });
});
