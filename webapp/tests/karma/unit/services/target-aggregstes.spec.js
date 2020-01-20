describe('TargetAggregates service', () => {

  'use strict';

  let service;
  let auth;
  let calendarInterval;
  let contactTypes;
  let db;
  let getDataRecords;
  let search;
  let settings;
  let uhcSettings;
  let userSettings;

  beforeEach(() => {
    module('inboxApp');

    auth = sinon.stub();

    module($provide => {
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.value('Auth', auth);
      $provide.value('CalendarInterval', calendarInterval);
      $provide.value('ContactTypes', contactTypes);
      $provide.value('DB', db);
      $provide.value('GetDataRecords', getDataRecords);
      $provide.value('Search', search);
      $provide.value('Settings', settings);
      $provide.value('UhcSettings', uhcSettings);
      $provide.value('UserSettings', userSettings);
    });
    inject(_TargetAggregates_ => {
      service = _TargetAggregates_;
    });
  });

  describe('isEnabled', () => {
    it('should return true when user has permission', () => {
      auth.resolves();
      return service.isEnabled().then(result => {
        chai.expect(result).to.equal(true);
        chai.expect(auth.callCount).to.equal(1);
        chai.expect(auth.args[0]).to.deep.equal(['can_aggregate_targets']);
      });
    });

    it('should return false when user does not have permission', () => {
      auth.rejects();
      return service.isEnabled().then(result => {
        chai.expect(result).to.equal(false);
      });
    });
  });

  describe('getAggregates', () => {

  });
});
