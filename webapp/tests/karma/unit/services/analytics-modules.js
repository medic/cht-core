describe('AnalyticsModules service', () => {

  'use strict';

  let service;
  let auth;
  let scheduledForms;
  let settings;

  beforeEach(() => {
    module('inboxApp');
    auth = sinon.stub();
    settings = sinon.stub();
    scheduledForms = sinon.stub();
    module($provide => {
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.value('Auth', auth);
      $provide.value('ScheduledForms', scheduledForms);
      $provide.value('Settings', settings);
    });
    inject(_AnalyticsModules_ => {
      service = _AnalyticsModules_;
    });
  });

  it('should throw an error when settings fails', () => {
    settings.rejects({ some: 'err' });
    scheduledForms.resolves();
    auth.resolves();

    return service()
      .then(() => chai.expect().to.equal('Should have thrown'))
      .catch(err => chai.expect(err).to.deep.equal({ some: 'err' }));
  });

  it('should throw an error when scheduledForms fails', () => {
    scheduledForms.rejects({ some: 'err' });
    settings.resolves({});
    auth.resolves();

    return service()
      .then(() => chai.expect().to.equal('Should have thrown'))
      .catch(err => chai.expect(err).to.deep.equal({ some: 'err' }));
  });

  it('should enable Reporting Rates when scheduled forms', () => {
    scheduledForms.resolves(['a', 'b']);
    settings.resolves({});
    auth.rejects();

    return service().then(result => {
      chai.expect(result.length).to.equal(1);
      chai.expect(result[0]).to.include({
        label: 'Reporting Rates',
        state: 'analytics.reporting',
      });

      chai.expect(settings.callCount).to.equal(1);
      chai.expect(scheduledForms.callCount).to.equal(1);
      chai.expect(auth.callCount).to.equal(1);
      chai.expect(auth.args[0]).to.deep.equal(['can_aggregate_targets']);
    });
  });

  it('should enable targets when configured', () => {
    scheduledForms.resolves([]);
    settings.resolves({ tasks: { targets: { enabled: true } } });
    auth.rejects();

    return service().then(result => {
      chai.expect(result.length).to.equal(1);
      chai.expect(result[0]).to.include({
        label: 'analytics.targets',
        state: 'analytics.targets',
      });
      chai.expect(result[0].available()).to.equal(true);
    });
  });

  it('should enable target aggregates when configured', () => {
    scheduledForms.resolves([]);
    settings.resolves({ tasks: { targets: { enabled: true } } });
    auth.resolves();

    return service().then(result => {
      chai.expect(result.length).to.equal(2);
      chai.expect(result[0]).to.include({
        label: 'analytics.targets',
        state: 'analytics.targets',
      });
      chai.expect(result[0].available()).to.equal(true);

      chai.expect(result[1]).to.include({
        label: 'analytics.target.aggregates',
        state: 'analytics.target-aggregates.detail',
      });
      chai.expect(result[1].available()).to.equal(true);
    });
  });
});
