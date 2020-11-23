import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect, assert } from 'chai';

import { DbService } from '@mm-services/db.service';
import { EditGroupService } from '@mm-services/edit-group.service';

describe('EditGroup service', () => {
  let service;
  let get;
  let put;

  beforeEach(function() {
    put = sinon.stub();
    get = sinon.stub();

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: { get: () => ({ get, put })} },
      ],
    });

    service = TestBed.inject(EditGroupService);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('returns get errors', () => {
    get.rejects('db messed up');
    const group = {};
    return service
      .edit('123', group)
      .then(() => assert.fail())
      .catch((err) => {
        expect(err.name).to.equal('db messed up');
      });
  });

  it('does not save if nothing changed', () => {
    const doc = {
      scheduled_tasks: [
        { group: 1 },
        { group: 2 },
        { group: 3 }
      ]
    };
    const group = {
      rows: [ { group: 1, state: 'muted' } ]
    };
    get.resolves(doc);
    return service
      .edit('123', group)
      .then((actual) => {
        expect(actual).to.deep.equal(doc);
      });
  });

  it('returns save errors', () => {
    const doc = {
      scheduled_tasks: [
        { group: 1 },
        { group: 2 },
        { group: 3 }
      ]
    };
    get.resolves(doc);
    put.rejects(('audit borked'));
    const group = {
      number: 1,
      rows: [ { group: 1, state: 'scheduled' } ]
    };
    return service
      .edit('123', group)
      .then(() => assert.fail())
      .catch((err) => {
        expect(err.name).to.equal('audit borked');
      });
  });

  it('saves updated doc', () => {
    const doc = {
      scheduled_tasks: [
        { group: 1, due: '1', messages: [ { message: 'a' } ] },
        { group: 2, due: '2', messages: [ { message: 'b' } ] },
        { group: 2, due: '3', messages: [ { message: 'c' } ] },
        { group: 3, due: '4', messages: [ { message: 'd' } ] }
      ]
    };
    const group = {
      number: 2,
      rows: [
        { group: 2, state: 'scheduled', due: '5', messages: [ { message: 'e' } ] },
        { group: 2, state: 'muted', due: '6', messages: [ { message: 'f' } ] }
      ]
    };
    get.resolves(doc);
    put.resolves();
    return service
      .edit('123', group)
      .then((actual) => {
        expect(actual.scheduled_tasks.length).to.equal(4);

        expect(actual.scheduled_tasks[0].group).to.equal(1);
        expect(actual.scheduled_tasks[0].due).to.equal('1');
        expect(actual.scheduled_tasks[0].messages.length).to.equal(1);
        expect(actual.scheduled_tasks[0].messages[0].message).to.equal('a');

        expect(actual.scheduled_tasks[1].group).to.equal(2);
        expect(actual.scheduled_tasks[1].due).to.equal('5');
        expect(actual.scheduled_tasks[1].messages.length).to.equal(1);
        expect(actual.scheduled_tasks[1].messages[0].message).to.equal('e');

        expect(actual.scheduled_tasks[2].group).to.equal(2);
        expect(actual.scheduled_tasks[2].due).to.equal('3');
        expect(actual.scheduled_tasks[2].messages.length).to.equal(1);
        expect(actual.scheduled_tasks[2].messages[0].message).to.equal('c');

        expect(actual.scheduled_tasks[3].group).to.equal(3);
        expect(actual.scheduled_tasks[3].due).to.equal('4');
        expect(actual.scheduled_tasks[3].messages.length).to.equal(1);
        expect(actual.scheduled_tasks[3].messages[0].message).to.equal('d');
      });
  });

  it('removes deleted messages', () => {
    const doc = {
      scheduled_tasks: [
        { group: 2, due: '2', messages: [ { message: 'b' } ] },
        { group: 2, due: '3', messages: [ { message: 'c' } ] },
        { group: 2, due: '4', messages: [ { message: 'd' } ] }
      ]
    };
    const group = {
      number: 2,
      rows: [
        { group: 2, state: 'scheduled', due: '5', messages: [ { message: 'e' } ], deleted: true },
        { group: 2, state: 'scheduled', due: '6', messages: [ { message: 'f' } ] },
        { group: 2, state: 'scheduled', due: '7', messages: [ { message: 'g' } ], deleted: true }
      ]
    };
    get.resolves(doc);
    put.resolves();
    return service
      .edit('123', group)
      .then((actual) => {
        expect(actual.scheduled_tasks.length).to.equal(1);
        expect(actual.scheduled_tasks[0].group).to.equal(2);
        expect(actual.scheduled_tasks[0].due).to.equal('6');
        expect(actual.scheduled_tasks[0].messages.length).to.equal(1);
        expect(actual.scheduled_tasks[0].messages[0].message).to.equal('f');
      });
  });

  it('adds new messages', () => {
    const doc = {
      scheduled_tasks: [
        { group: 2, due: '2', messages: [ { to: '5551234', message: 'b' } ] }
      ]
    };
    const group = {
      number: 2,
      rows: [
        { group: 2, state: 'scheduled', due: '6', messages: [ { to: '5551234', message: 'f' } ] },
        { group: 2, state: 'scheduled', due: '5', messages: [ { message: 'e' } ], added: true, deleted: true },
        { group: 2, state: 'scheduled', due: '7', messages: [ { message: 'g' } ], added: true }
      ]
    };
    get.resolves(doc);
    put.resolves();
    return service
      .edit('123', group)
      .then((actual) => {
        expect(actual.scheduled_tasks.length).to.equal(2);

        let task = actual.scheduled_tasks[0];
        expect(task.group).to.equal(2);
        expect(task.due).to.equal('6');
        expect(task.messages.length).to.equal(1);
        expect(task.messages[0].message).to.equal('f');
        expect(task.messages[0].to).to.equal('5551234');

        task = actual.scheduled_tasks[1];
        expect(task.group).to.equal(2);
        expect(task.due).to.equal('7');
        expect(task.messages.length).to.equal(1);
        expect(task.messages[0].message).to.equal('g');
        expect(task.messages[0].to).to.equal('5551234');
      });
  });

  it('gets the to number from the data_record', () => {
    const doc = {
      from: '5554321',
      scheduled_tasks: []
    };
    const group = {
      number: 2,
      rows: [
        { group: 2, state: 'scheduled', due: '7', messages: [ { message: 'g' } ], added: true }
      ]
    };
    get.resolves(doc);
    put.resolves();
    return service
      .edit('123', group)
      .then((actual) => {
        expect(actual.scheduled_tasks.length).to.equal(1);

        const task = actual.scheduled_tasks[0];
        expect(task.group).to.equal(2);
        expect(task.due).to.equal('7');
        expect(task.messages.length).to.equal(1);
        expect(task.messages[0].message).to.equal('g');
        expect(task.messages[0].to).to.equal('5554321');
      });
  });

});
