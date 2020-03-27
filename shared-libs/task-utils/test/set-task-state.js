const chai = require('chai');
const sinon = require('sinon');
const taskUtils = require('../src/task-utils');

describe('TaskUtils shared lib - setTaskState function', function() {
  'use strict';

  let dateStub;

  beforeEach(function() {
    dateStub = sinon.stub(global, 'Date');
    dateStub.returns({
      toISOString: sinon.stub().returns('000')
    });
  });

  afterEach(function(){
    sinon.restore();
  });

  it('should add state history', function() {
    const task = {};
    const result = taskUtils.setTaskState(task, 'newState', 'details');
    chai.expect(result).to.equal(true);
    chai.expect(task.state).to.equal('newState');
    chai.expect(task.state_details).to.equal('details');
    chai.expect(task.state_history.length).to.equal(1);
    chai.expect(task.state_history[0]).to.deep.equal({ state: 'newState', state_details: 'details', timestamp: '000'});
  });

  it('should change task state', function() {
    const task = {
      state: 'oldState',
      state_details: 'oldDetails',
      timestamp: '111',
      state_history: [{
        state: 'oldState',
        state_details: 'oldDetails',
        timestamp: '111'
      }]
    };

    const result = taskUtils.setTaskState(task, 'newState', 'details');
    chai.expect(result).to.equal(true);
    chai.expect(task.state).to.equal('newState');
    chai.expect(task.state_details).to.equal('details');
    chai.expect(task.state_history.length).to.equal(2);
    chai.expect(task.state_history[0])
      .to.deep.equal({ state: 'oldState', state_details: 'oldDetails', timestamp: '111'});
    chai.expect(task.state_history[1])
      .to.deep.equal({ state: 'newState', state_details: 'details', timestamp: '000'});
  });

  it('should add history when state and/or details are updated', function() {
    const task1 = {
      state: 'oldState',
      state_details: 'oldDetails',
      timestamp: '111',
      state_history: [{
        state: 'oldState',
        state_details: 'oldDetails',
        timestamp: '111'
      }]
    };

    const task2 = {
      state: 'oldState',
      state_details: 'oldDetails',
      timestamp: '111',
      state_history: [{
        state: 'oldState',
        state_details: 'oldDetails',
        timestamp: '111'
      }]
    };

    const result1 = taskUtils.setTaskState(task1, 'oldState', 'details');
    const result2 = taskUtils.setTaskState(task2, 'newState', 'oldDetails');


    chai.expect(result1).to.equal(true);
    chai.expect(task1.state).to.equal('oldState');
    chai.expect(task1.state_details).to.equal('details');
    chai.expect(task1.state_history[0])
      .to.deep.equal({ state: 'oldState', state_details: 'oldDetails', timestamp: '111'});
    chai.expect(task1.state_history[1])
      .to.deep.equal({ state: 'oldState', state_details: 'details', timestamp: '000'});

    chai.expect(result2).to.equal(true);
    chai.expect(task2.state).to.equal('newState');
    chai.expect(task2.state_details).to.equal('oldDetails');
    chai.expect(task2.state_history[0])
      .to.deep.equal({ state: 'oldState', state_details: 'oldDetails', timestamp: '111'});
    chai.expect(task2.state_history[1])
      .to.deep.equal({ state: 'newState', state_details: 'oldDetails', timestamp: '000'});
  });

  it('should not add history when neither state nor details are updated', function() {
    const task1 = {
      state: 'oldState',
      state_details: 'oldDetails',
      timestamp: '111',
      state_history: [{
        state: 'oldState',
        state_details: 'oldDetails',
        timestamp: '111'
      }]
    };

    const task2 = {
      state: 'oldState',
      state_details: 'oldDetails',
      timestamp: '111',
      state_history: [{
        state: 'oldState',
        state_details: 'oldDetails',
        timestamp: '111'
      }]
    };

    const result1 = taskUtils.setTaskState(task1, 'oldState', 'oldDetails');
    const result2 = taskUtils.setTaskState(task2, 'oldState');

    chai.expect(result1).to.equal(false);
    chai.expect(task1.state).to.equal('oldState');
    chai.expect(task1.state_details).to.equal('oldDetails');
    chai.expect(task1.state_history.length).to.equal(1);
    chai.expect(task1.state_history[0])
      .to.deep.equal({ state: 'oldState', state_details: 'oldDetails', timestamp: '111'});

    chai.expect(result2).to.equal(false);
    chai.expect(task2.state).to.equal('oldState');
    chai.expect(task2.state_details).to.equal('oldDetails');
    chai.expect(task2.state_history)
      .to.deep.equal([{ state: 'oldState', state_details: 'oldDetails', timestamp: '111'}]);
  });

  it('should add history even if state is not changed when history is empty', function() {
    const task = {
      state: 'oldState',
      state_details: 'oldDetails',
      timestamp: '111',
    };

    const result = taskUtils.setTaskState(task, 'oldState', 'oldDetails');

    chai.expect(result).to.equal(true);
    chai.expect(task.state).to.equal('oldState');
    chai.expect(task.state_details).to.equal('oldDetails');
    chai.expect(task.state_history.length).to.equal(1);
    chai.expect(task.state_history[0])
      .to.deep.equal({ state: 'oldState', state_details: 'oldDetails', timestamp: '000' });
  });

  it('should add the gateway_ref when given', () => {
    const task = {};
    const result = taskUtils.setTaskState(task, 'newState', 'details', 'abc');
    chai.expect(result).to.equal(true);
    chai.expect(task.state).to.equal('newState');
    chai.expect(task.state_details).to.equal('details');
    chai.expect(task.gateway_ref).to.equal('abc');
    chai.expect(task.state_history.length).to.equal(1);
    chai.expect(task.state_history[0])
      .to.deep.equal({ state: 'newState', state_details: 'details', timestamp: '000'});
  });

});
