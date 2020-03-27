describe('EnketoPrepopulationData service', function() {
  'use strict';

  let service;
  let rootScope;
  const UserSettings = sinon.stub();
  let $window;

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

  beforeEach(function() {
    $window = { angular: { callbacks: [] } };
    module('inboxApp');
    module(function($provide) {
      $provide.value('$window', $window);
      $provide.value('UserSettings', UserSettings);
    });
    inject(function(_EnketoPrepopulationData_, _$rootScope_) {
      service = _EnketoPrepopulationData_;
      rootScope = _$rootScope_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(UserSettings);
  });

  it('exists', function() {
    chai.assert.isDefined(service);
  });

  it('returns the given string', function(done) {
    const model = '';
    const data = '<some_data/>';
    service(model, data)
      .then(function(actual) {
        chai.expect(actual).to.equal(data);
        done();
      })
      .catch(done);
    rootScope.$digest();
  });

  it('rejects when user settings fails', function(done) {
    const model = '';
    const data = {};
    UserSettings.returns(Promise.reject('phail'));
    service(model, data)
      .then(function() {
        done('Expected fail');
      })
      .catch(function(err) {
        chai.expect(err).to.equal('phail');
        chai.expect(UserSettings.callCount).to.equal(1);
        done();
      });
    rootScope.$digest();
  });

  it('binds user details into model', function(done) {
    const data = {};
    const user = { name: 'geoff' };
    UserSettings.returns(Promise.resolve(user));
    service(editPersonForm, data)
      .then(function(actual) {
        const xml = $($.parseXML(actual));
        chai.expect(xml.find('inputs > user > name')[0].innerHTML).to.equal(user.name);
        chai.expect(UserSettings.callCount).to.equal(1);
        done();
      })
      .catch(done);
    rootScope.$digest();
  });

  it('binds form content into model', function(done) {
    const data = { person: { last_name: 'salmon' } };
    const user = { name: 'geoff' };
    UserSettings.returns(Promise.resolve(user));
    service(editPersonFormWithoutInputs, data)
      .then(function(actual) {
        const xml = $($.parseXML(actual));
        chai.expect(xml.find('data > person > last_name')[0].innerHTML).to.equal(data.person.last_name);
        chai.expect(UserSettings.callCount).to.equal(1);
        done();
      })
      .catch(done);
    rootScope.$digest();
  });

  it('binds form content into generated form model', function(done) {
    const data = { person: { name: 'sally' } };
    const user = { name: 'geoff' };
    UserSettings.returns(Promise.resolve(user));
    service(generatedForm, data)
      .then(function(actual) {
        const xml = $($.parseXML(actual));
        chai.expect(xml.find('data > person > name')[0].innerHTML).to.equal(data.person.name);
        chai.expect(UserSettings.callCount).to.equal(1);
        done();
      })
      .catch(done);
    rootScope.$digest();
  });

  it('binds user details and form content into model', function(done) {
    const data = { person: { last_name: 'salmon' } };
    const user = { name: 'geoff' };
    UserSettings.returns(Promise.resolve(user));
    service(editPersonForm, data)
      .then(function(actual) {
        const xml = $($.parseXML(actual));
        chai.expect(xml.find('inputs > user > name')[0].innerHTML).to.equal(user.name);
        chai.expect(xml.find('data > person > last_name')[0].innerHTML).to.equal(data.person.last_name);
        chai.expect(UserSettings.callCount).to.equal(1);
        done();
      })
      .catch(done);
    rootScope.$digest();
  });

  it('binds form content into model with custom root node', function(done) {
    const data = { person: { last_name: 'salmon' } };
    const user = { name: 'geoff' };
    UserSettings.returns(Promise.resolve(user));
    service(pregnancyForm, data)
      .then(function(actual) {
        const xml = $($.parseXML(actual));
        chai.expect(xml.find('inputs > user > name')[0].innerHTML).to.equal(user.name);
        chai.expect(xml.find('pregnancy > person > last_name')[0].innerHTML).to.equal(data.person.last_name);
        chai.expect(UserSettings.callCount).to.equal(1);
        done();
      })
      .catch(done);
    rootScope.$digest();
  });
});
