describe('Simprints service', () => {

  'use strict';

  let service;
  let medicmobile_android;
  let simprints_reg;
  let simprints_ident;

  const assertCalledOnCorrectObject = function() {
    // If the medicmobile_android functions are not called with `this` parameter
    // correctly set, we receive the cryptic error:
    //   Java bridge method cannot be invoked on a non-injected object
    // This function ensures that stubbed functions are being called on the
    // correct object.
    if(this !== medicmobile_android) {
      throw new Error('Java bridge method cannot be invoked on a non-injected object');
    }
  };

  beforeEach(() => {
    module('inboxApp');

    simprints_reg = sinon.stub().callsFake(assertCalledOnCorrectObject);
    simprints_ident = sinon.stub().callsFake(assertCalledOnCorrectObject);

    medicmobile_android = {
      simprints_reg: simprints_reg,
      simprints_ident: simprints_ident
    };

    module($provide => {
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.value('$window', {
        medicmobile_android: medicmobile_android,
      });
    });
    inject(_Simprints_ => {
      service = _Simprints_;
    });
  });

  describe('register', () => {

    it('calls android endpoint and waits for response', () => {
      const expected = 54685165;
      const response = service.register();
      response.then(actual => {
        chai.expect(simprints_reg.callCount).to.equal(1);
        chai.expect(simprints_ident.callCount).to.equal(0);
        chai.expect(actual).to.equal(expected);
      });
      const requestId = simprints_reg.args[0][0];
      service.registerResponse(requestId, { id: expected });
      return response;
    });

  });

  describe('identify', () => {

    it('calls android endpoint and waits for response', () => {
      const given = [
        { id: 123, tier: 'TIER_1' },
        { id: 456, tier: 'TIER_2' },
        { id: 789, tier: 'TIER_3' }
      ];
      const expected = [
        { id: 123, tier: 'TIER_1', tierNumber: 1 },
        { id: 456, tier: 'TIER_2', tierNumber: 2 },
        { id: 789, tier: 'TIER_3', tierNumber: 3 }
      ];
      const response = service.identify();
      response.then(actual => {
        chai.expect(simprints_reg.callCount).to.equal(0);
        chai.expect(simprints_ident.callCount).to.equal(1);
        chai.expect(actual).to.deep.equal(expected);
      });
      const requestId = simprints_ident.args[0][0];
      service.identifyResponse(requestId, given);
      return response;
    });

    it('filters out tier 4 and 5 matches', () => {
      const given = [
        { id: 123, tier: 'TIER_1' },
        { id: 456, tier: 'TIER_2' },
        { id: 789, tier: 'TIER_3' },
        { id: 147, tier: 'TIER_4' },
        { id: 258, tier: 'TIER_5' }
      ];
      const expected = [
        { id: 123, tier: 'TIER_1', tierNumber: 1 },
        { id: 456, tier: 'TIER_2', tierNumber: 2 },
        { id: 789, tier: 'TIER_3', tierNumber: 3 }
      ];
      const response = service.identify();
      response.then(actual => {
        chai.expect(simprints_reg.callCount).to.equal(0);
        chai.expect(simprints_ident.callCount).to.equal(1);
        chai.expect(actual).to.deep.equal(expected);
      });
      const requestId = simprints_ident.args[0][0];
      service.identifyResponse(requestId, given);
      return response;
    });

  });

});
