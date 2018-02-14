describe('RecurringProcessManager Service', () => {
  let service,
    $interval,
    RelativeDate;

  beforeEach(() => {
    module('inboxApp');
    $interval = sinon.stub();
    $interval.cancel = sinon.stub();
    RelativeDate = {
      updateRelativeDates: sinon.stub(),
      getUpdateTimeDelta: 10
    };

    module($provide => {
      $provide.value('RelativeDate', RelativeDate);
      $provide.value('$interval', $interval);
    });
    inject((_RecurringProcessManager_) => {
      service = _RecurringProcessManager_;
    });
  });

  it('should register the interval', done => {
    service.startUpdateRelativeDate();

    chai.expect($interval.callCount).to.equal(1);
    chai.expect($interval.args[0][0]).to.equal(RelativeDate.updateRelativeDates);
    chai.expect($interval.args[0][1]).to.equal(10);
    chai.expect($interval.args[0][2]).to.equal(0);
    chai.expect($interval.args[0][3]).to.equal(false);
    done();
  });

  it('should cancel the interval', done => {
    $interval.returns('theInterval');
    service.startUpdateRelativeDate();
    service.stopUpdateRelativeDate();

    chai.expect($interval.cancel.callCount).to.equal(1);
    chai.expect($interval.cancel.args[0].length).to.equal(1);
    chai.expect($interval.cancel.args[0][0]).to.equal('theInterval');
    done();
  });

  it('should cancel the previous interval before adding a new one', done => {
    $interval.returns('theInterval');
    service.startUpdateRelativeDate();
    service.startUpdateRelativeDate();

    chai.expect($interval.cancel.callCount).to.equal(1);
    chai.expect($interval.cancel.args[0].length).to.equal(1);
    chai.expect($interval.cancel.args[0][0]).to.equal('theInterval');
    done();
  });

  it('should register and stop the interval', done => {
    $interval.returns(setInterval(RelativeDate.updateRelativeDates, RelativeDate.getUpdateTimeDelta));
    $interval.cancel = function(interval) {
      clearInterval(interval);
    };

    service.startUpdateRelativeDate();
    setTimeout(() => {
      chai.expect(RelativeDate.updateRelativeDates.callCount).to.equal(5);
      service.stopUpdateRelativeDate();
    }, 50);

    setTimeout(() => {
      chai.expect(RelativeDate.updateRelativeDates.callCount).to.equal(5);
      done();
    }, 100);
  });

});
