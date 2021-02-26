import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect, assert } from 'chai';
import { Store } from '@ngrx/store';

import { SendMessageService } from '@mm-services/send-message.service';
import { DbService } from '@mm-services/db.service';
import { MarkReadService } from '@mm-services/mark-read.service';
import { SettingsService } from '@mm-services/settings.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { ExtractLineageService } from '@mm-services/extract-lineage.service';
import { ServicesActions } from '@mm-actions/services';

describe('SendMessageService', () => {
  let service: SendMessageService;
  let dbService;
  let post;
  let allDocs;
  let query;
  let markReadService;
  let settingsService;
  let userSettingsService;

  beforeEach(() => {
    const store = { dispatch: sinon.stub() };
    query = sinon.stub().returns({ allDocs });
    post = sinon.stub();
    allDocs = sinon.stub();
    dbService = {
      get: sinon.stub().returns({ query, post, allDocs })
    };
    markReadService = { markAsRead: sinon.stub() };
    settingsService = { get: sinon.stub().resolves() };
    userSettingsService = { get: sinon.stub().resolves({ phone: '+5551', name: 'jack' }) };

    TestBed.configureTestingModule({
      providers: [
        ExtractLineageService,
        { provide: Store, useValue: store },
        { provide: DbService, useValue: dbService },
        { provide: MarkReadService, useValue: markReadService },
        { provide: SettingsService, useValue: settingsService },
        { provide: UserSettingsService, useValue: userSettingsService },
      ]
    });

    service = TestBed.inject(SendMessageService);
  });

  afterEach(() => {
    sinon.restore();
  });

  const assertMessage = (task, expected) => {
    const msg = task.messages[0];

    expect(task.state).to.equal('pending');
    expect(task.messages.length).to.equal(1);
    expect(msg.from).to.equal(expected.from);
    expect(msg.sent_by).to.equal(expected.sent_by);
    expect(msg.to).to.equal(expected.to);
    expect(msg.uuid).to.not.equal(undefined);
    expect(msg.contact).to.deep.equal(expected.contact);
  };

  const mockAllDocs = (docs) => {
    if (!Array.isArray(docs)) {
      docs = [docs];
    }

    return Promise.resolve({
      rows: docs.map(doc => ({ doc }))
    });
  };

  const select2Wrap = (docs) => {
    if (!Array.isArray(docs)) {
      docs = [docs];
    }

    return docs.map(doc => ({ doc }));
  };

  it('create doc for one recipient', async() => {
    const recipient = {
      _id: 'abc',
      contact: { phone: '+5552' }
    };
    allDocs.returns(mockAllDocs(recipient));
    const setLastChangedDocStub = sinon.stub(ServicesActions.prototype, 'setLastChangedDoc');

    await service.send(select2Wrap(recipient), 'hello');

    expect(allDocs.callCount).to.equal(1);
    expect(post.callCount).to.equal(1);
    const savedDoc = post.args[0][0];
    assertMessage(savedDoc.tasks[0], {
      from: '+5551',
      sent_by: 'jack',
      to: '+5552',
      contact: { _id: recipient._id }
    });
    expect(setLastChangedDocStub.callCount).to.equal(1);
    expect(setLastChangedDocStub.args[0]).to.deep.equal([post.args[0][0]]);
    expect(markReadService.markAsRead.callCount).to.equal(1);
    const readDocs = markReadService.markAsRead.args[0][0];
    expect(readDocs.length).to.equal(1);
    expect(readDocs[0]._id).to.equal(savedDoc._id);
  });

  it('create doc for non-contact recipient from select2', async() => {
    const recipient = {
      selected: false,
      disabled: false,
      text: '+5552',
      id: '+5552',
      _resultId: 'select2-phone-os-result-ef7y-+447890119334',
      element: {}
    };
    allDocs.returns(mockAllDocs(recipient));

    await service.send(recipient, 'hello');

    expect(post.callCount).to.equal(1);
    assertMessage(post.args[0][0].tasks[0], {
      from: '+5551',
      sent_by: 'jack',
      to: '+5552'
    });
  });

  it('normalizes phone numbers', async() => {
    // Note : only valid phone numbers can be normalized.
    const phoneNumber = '700123456';
    const recipient = {
      _id: 'def',
      contact: { phone: phoneNumber }
    };
    allDocs.returns(mockAllDocs(recipient));
    settingsService.get.resolves({ default_country_code: 254 });

    await service.send(select2Wrap(recipient), 'hello');

    expect(post.callCount).to.equal(1);
    assertMessage(post.args[0][0].tasks[0], {
      from: '+5551',
      sent_by: 'jack',
      to: '+254' + phoneNumber,
      contact: { _id: recipient._id }
    });
  });

  it('create doc for multiple recipients', async() => {
    const recipients = [
      {
        _id: 'abc',
        contact: { phone: '+5552' }
      },
      {
        _id: 'efg',
        contact: { phone: '+5553' }
      }
    ];
    allDocs.returns(mockAllDocs(recipients));
    const setLastChangedDocStub = sinon.stub(ServicesActions.prototype, 'setLastChangedDoc');

    await service.send(select2Wrap(recipients), 'hello');

    expect(post.callCount).to.equal(1);
    expect(post.args[0][0].tasks.length).to.equal(2);
    assertMessage(post.args[0][0].tasks[0], {
      from: '+5551',
      sent_by: 'jack',
      to: '+5552',
      contact: { _id: recipients[0]._id }
    });
    assertMessage(post.args[0][0].tasks[1], {
      from: '+5551',
      sent_by: 'jack',
      to: '+5553',
      contact: { _id: recipients[1]._id }
    });
    const task1Id = post.args[0][0].tasks[0].messages[0].uuid;
    const task2Id = post.args[0][0].tasks[1].messages[0].uuid;
    expect(task1Id).to.not.equal(task2Id);
    expect(setLastChangedDocStub.callCount).to.equal(1);
    expect(setLastChangedDocStub.args[0]).to.deep.equal([post.args[0][0]]);
  });

  it('create doc for everyoneAt recipients', async() => {
    const recipients = [
      {
        doc: {
          _id: 'abc',
          contact: { phone: '+5552' }
        }
      },
      {
        everyoneAt: true,
        doc: { _id: 'test' }
      }
    ];
    const descendants = [
      {
        _id: 'efg',
        contact: { phone: '+5553' }
      },
      {
        _id: 'hij',
        contact: { phone: '+5552' } // duplicate phone number should be removed
      },
      {
        _id: 'klm',
        contact: { phone: '+5554' }
      },
      {
        _id: 'nop'
      },
    ];
    allDocs.returns(mockAllDocs(recipients[0].doc));
    query.returns(mockAllDocs(descendants));

    await service.send(recipients, 'hello');

    expect(post.callCount).to.equal(1);
    expect(post.args[0][0].tasks.length).to.equal(3);
    assertMessage(post.args[0][0].tasks[0], {
      from: '+5551',
      sent_by: 'jack',
      to: '+5553',
      contact: { _id: descendants[0]._id }
    });
    assertMessage(post.args[0][0].tasks[1], {
      from: '+5551',
      sent_by: 'jack',
      to: '+5552',
      contact: { _id: descendants[1]._id }
    });
    assertMessage(post.args[0][0].tasks[2], {
      from: '+5551',
      sent_by: 'jack',
      to: '+5554',
      contact: { _id: descendants[2]._id }
    });
  });

  it('create doc for multiple types of recipients', async() => {
    const recipients = [
      {
        doc: {
          _id: 'abc',
          contact: { phone: '+5552' }
        }
      },
      {
        selected: false,
        disabled: false,
        text: '+5550',
        id: '+5550',
        _resultId: 'select2-phone-os-result-ef7y-+447890119334',
        element: {}
      },
      {
        everyoneAt: true,
        doc: { _id: 'test' }
      }
    ];
    const descendants = [
      {
        _id: 'efg',
        contact: { phone: '+5553' }
      },
      {
        _id: 'hij',
        contact: { phone: '+5552' } // duplicate phone number should be removed
      },
      {
        _id: 'klm',
        contact: { phone: '+5554' }
      },
      {
        _id: 'nop'
      },
    ];
    allDocs.returns(mockAllDocs(recipients));
    query.returns(mockAllDocs(descendants));

    await service.send(recipients, 'hello');

    expect(post.callCount).to.equal(1);
    expect(post.args[0][0].tasks.length).to.equal(4);
    assertMessage(post.args[0][0].tasks[0], {
      from: '+5551',
      sent_by: 'jack',
      to: '+5553',
      contact: { _id: descendants[0]._id }
    });
    assertMessage(post.args[0][0].tasks[1], {
      from: '+5551',
      sent_by: 'jack',
      to: '+5552',
      contact: { _id: descendants[1]._id }
    });
    assertMessage(post.args[0][0].tasks[2], {
      from: '+5551',
      sent_by: 'jack',
      to: '+5554',
      contact: { _id: descendants[2]._id }
    });
    assertMessage(post.args[0][0].tasks[3], {
      from: '+5551',
      sent_by: 'jack',
      to: '+5550'
    });
  });

  it('returns post errors', () => {
    const recipient = {
      _id: 'abc',
      contact: { phone: '+5552' }
    };
    post.rejects('errcode2');
    allDocs.returns(mockAllDocs(recipient));

    return service
      .send(select2Wrap(recipient), 'hello')
      .then(() => assert.fail('expected error to be thrown'))
      .catch(err => {
        expect(err.name).to.equal('errcode2');
      });
  });
});
