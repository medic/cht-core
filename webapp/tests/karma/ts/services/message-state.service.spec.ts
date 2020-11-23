import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect, assert } from 'chai';

import { SetTaskStateService, MessageStateService } from '@mm-services/message-state.service';
import { DbService } from '@mm-services/db.service';

describe('MessageState service', () => {
  let service;
  let get;
  let put;
  let SetTaskState;

  beforeEach(() => {
    put = sinon.stub();
    get = sinon.stub();
    SetTaskState = sinon.stub(SetTaskStateService, 'set');

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: { get: () => ({ get, put }) } },
        SetTaskStateService,
      ]
    });

    service = TestBed.inject(MessageStateService);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('any returns true when some row in the group matches', () => {
    const group = {
      rows: [
        { state: 'sent' },
        { state: 'scheduled' },
        { state: 'muted' }
      ]
    };
    expect(service.any(group, 'muted')).to.equal(true);
  });

  it('any returns false when no row in the group matches', () => {
    const group = {
      rows: [
        { state: 'sent' },
        { state: 'pending' },
        { state: 'muted' }
      ]
    };
    expect(service.any(group, 'scheduled')).to.equal(false);
  });

  it('any returns false when no rows', () => {
    const group = {
      rows: []
    };
    expect(service.any(group, 'scheduled')).to.equal(false);
  });

  it('set returns get errors', () => {
    get.rejects('db messed up');
    return service
      .set('123', 2, 'scheduled', 'muted')
      .then(() => assert.fail())
      .catch((err) => {
        expect(err.name).to.equal('db messed up');
      });
  });

  it('set does not save if nothing changed', () => {
    const doc = {
      scheduled_tasks: [
        { group: 1, state: 'scheduled' },
        { group: 2, state: 'muted' },
        { group: 3, state: 'sent' }
      ]
    };
    get.resolves(doc);
    return service
      .set('123', 2, 'scheduled', 'muted')
      .then(() => {
        expect(put.callCount).to.equal(0);
      });
  });

  it('set returns save errors', () => {
    const doc = {
      scheduled_tasks: [
        { group: 1, state: 'scheduled' },
        { group: 2, state: 'muted' },
        { group: 3, state: 'sent' }
      ]
    };
    get.resolves(doc);
    put.rejects('save borked');
    return service
      .set('123', 2, 'muted', 'scheduled')
      .then(() => assert.fail())
      .catch((err) => {
        expect(err.name).to.equal('save borked');
      });
  });

  it('set saves if task changed', () => {
    const doc = {
      scheduled_tasks: [
        { group: 1, state: 'scheduled' },
        { group: 2, state: 'sent' },
        { group: 2, state: 'muted', state_history: [{ state: 'muted', timestamp: '2014-09-11T02:52:45.586Z' }] },
        { group: 2, state: 'muted' },
        { group: 3, state: 'sent' }
      ]
    };
    get.resolves(doc);
    put.resolves();

    return service
      .set('123', 2, 'muted', 'scheduled')
      .then(() => {
        expect(get.args[0][0]).to.equal('123');
        const actual = put.args[0][0];
        expect(SetTaskState.callCount).to.equal(2);
        expect(actual.scheduled_tasks.length).to.equal(5);
        expect(SetTaskState.getCall(0).args[0]).to.deep.equal({
          group: 2,
          state: 'muted',
          state_history: [{ state: 'muted', timestamp: '2014-09-11T02:52:45.586Z' }]
        });
        expect(SetTaskState.getCall(0).args[1]).to.equal('scheduled');
        expect(SetTaskState.getCall(1).args[0]).to.deep.equal({ group: 2, state: 'muted' });
        expect(SetTaskState.getCall(1).args[1]).to.equal('scheduled');
      });
  });
});
