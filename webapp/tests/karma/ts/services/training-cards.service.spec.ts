import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import sinon from 'sinon';
import { assert, expect } from 'chai';

import { GlobalActions } from '@mm-actions/global';
import { DbService } from '@mm-services/db.service';
import { XmlFormsService } from '@mm-services/xml-forms.service';
import { ModalService } from '@mm-services/modal.service';
import { TrainingCardsService } from '@mm-services/training-cards.service';
import { SessionService } from '@mm-services/session.service';
import { RouteSnapshotService } from '@mm-services/route-snapshot.service';
import { FeedbackService } from '@mm-services/feedback.service';

describe('TrainingCardsService', () => {
  let service: TrainingCardsService;
  let globalActions;
  let xmlFormsService;
  let dbService;
  let modalService;
  let localDb;
  let clock;
  let consoleErrorMock;
  let sessionService;
  let routeSnapshotService;
  let feedbackService;

  beforeEach(() => {
    localDb = { allDocs: sinon.stub() };
    dbService = { get: () => localDb };
    globalActions = { setTrainingCardFormId: sinon.stub(GlobalActions.prototype, 'setTrainingCardFormId') };
    xmlFormsService = { subscribe: sinon.stub() };
    modalService = { show: sinon.stub() };
    sessionService = {
      userCtx: sinon.stub(),
      hasRole: sinon.spy(SessionService.prototype, 'hasRole'),
    };
    feedbackService = { submit: sinon.stub() };
    consoleErrorMock = sinon.stub(console, 'error');
    routeSnapshotService = { get: sinon.stub() };

    TestBed.configureTestingModule({
      providers: [
        provideMockStore(),
        { provide: DbService, useValue: dbService },
        { provide: XmlFormsService, useValue: xmlFormsService },
        { provide: ModalService, useValue: modalService },
        { provide: SessionService, useValue: sessionService },
        { provide: RouteSnapshotService, useValue: routeSnapshotService },
        { provide: FeedbackService, useValue: feedbackService },
      ]
    });

    service = TestBed.inject(TrainingCardsService);
  });

  afterEach(() => {
    clock && clock.restore();
    sinon.restore();
    document
      .querySelectorAll('#enketo-test')
      .forEach(element => element.remove());
  });

  it('should set uncompleted training form when none are completed', async () => {
    sessionService.userCtx.returns({ roles: [ 'chw' ], name: 'a_user' });
    localDb.allDocs.resolves({ rows: [] });
    clock = sinon.useFakeTimers(new Date('2022-05-23 20:29:25'));
    const xforms = [
      {
        _id: 'form:training:abc-789',
        internalId: 'training:form-c',
        context: {
          start_date: '2022-05-28',
          duration: 6,
          user_roles: [ 'chw' ],
        },
      },
      {
        _id: 'form:training:abc-456',
        internalId: 'training:form-a',
        context: {
          start_date: '2022-05-18',
          duration: 2,
          user_roles: [ 'chw' ],
        },
      },
      {
        _id: 'form:training:abc-123',
        internalId: 'training:form-b',
        context: {
          start_date: '2022-05-21',
          duration: 3,
          user_roles: [ 'chw' ],
        },
      },
      {
        _id: 'form:training:abc-098',
        internalId: 'training:form-d',
        context: {
          start_date: '2022-05-21',
          duration: 9,
          user_roles: [ 'chw' ],
        },
      },
    ];
    service.initTrainingCards();

    expect(xmlFormsService.subscribe.calledOnce).to.be.true;
    expect(xmlFormsService.subscribe.args[0][0]).to.equal('TrainingCards');
    expect(xmlFormsService.subscribe.args[0][1]).to.deep.equal({ trainingCards: true });
    const callback = xmlFormsService.subscribe.args[0][2];

    await callback(null, xforms);

    expect(sessionService.userCtx.calledOnce).to.be.true;
    expect(sessionService.hasRole.callCount).to.equal(4);
    expect(localDb.allDocs.calledOnce).to.be.true;
    expect(localDb.allDocs.args[0][0]).to.deep.equal({
      include_docs: true,
      startkey: 'training:a_user:',
      endkey: 'training:a_user:\ufff0',
    });
    expect(globalActions.setTrainingCardFormId.calledOnce);
    expect(globalActions.setTrainingCardFormId.args[0]).to.have.members([ 'training:form-b' ]);
    expect(consoleErrorMock.notCalled).to.be.true;
    expect(feedbackService.submit.notCalled).to.be.true;
  });

  it('should set uncompleted training form when there are some completed', async () => {
    sessionService.userCtx.returns({ roles: [ 'chw' ], name: 'a_user' });
    localDb.allDocs.resolves({ rows: [
      { doc: { form: 'training:form-a' } },
      { doc: { form: 'training:form-b' } },
    ]});
    clock = sinon.useFakeTimers(new Date('2022-05-23 20:29:25'));
    const xforms = [
      {
        _id: 'form:training:abc-456',
        internalId: 'training:form-b',
        context: {
          start_date: '2022-05-18',
          duration: 2,
          user_roles: [ 'chw' ],
        },
      },
      {
        _id: 'form:training:abc-123',
        internalId: 'training:form-a',
        context: {
          start_date: '2022-05-21',
          duration: 3,
          user_roles: [ 'chw' ],
        },
      },
      {
        _id: 'form:training:abc-789',
        internalId: 'training:form-c',
        context: {
          start_date: '2022-05-28',
          duration: 6,
          user_roles: [ 'chw' ],
        },
      },
      {
        _id: 'form:training:abc-098',
        internalId: 'training:form-d',
        context: {
          start_date: '2022-05-21',
          duration: 9,
          user_roles: [ 'chw' ],
        },
      },
    ];
    service.initTrainingCards();

    expect(xmlFormsService.subscribe.calledOnce).to.be.true;
    expect(xmlFormsService.subscribe.args[0][0]).to.equal('TrainingCards');
    expect(xmlFormsService.subscribe.args[0][1]).to.deep.equal({ trainingCards: true });
    const callback = xmlFormsService.subscribe.args[0][2];

    await callback(null, xforms);

    expect(sessionService.userCtx.calledOnce).to.be.true;
    expect(sessionService.hasRole.callCount).to.equal(4);
    expect(localDb.allDocs.calledOnce).to.be.true;
    expect(localDb.allDocs.args[0][0]).to.deep.equal({
      include_docs: true,
      startkey: 'training:a_user:',
      endkey: 'training:a_user:\ufff0',
    });
    expect(globalActions.setTrainingCardFormId.calledOnce);
    expect(globalActions.setTrainingCardFormId.args[0]).to.have.members([ 'training:form-d' ]);
    expect(modalService.show.notCalled).to.be.true;
    expect(consoleErrorMock.notCalled).to.be.true;
    expect(feedbackService.submit.notCalled).to.be.true;
  });

  it('should show uncompleted training form when they dont have duration set', async () => {
    sessionService.userCtx.returns({ roles: [ 'chw' ], name: 'a_user' });
    localDb.allDocs.resolves({ rows: [
      { doc: { form: 'training:form-a' } },
      { doc: { form: 'training:form-b' } },
    ]});
    clock = sinon.useFakeTimers(new Date('2022-05-23 20:29:25'));
    const xforms = [
      {
        _id: 'form:training:abc-789',
        internalId: 'training:form-a',
        context: {
          start_date: '2022-05-28',
          user_roles: [ 'chw' ],
        },
      },
      {
        _id: 'form:training:abc-098',
        internalId: 'training:form-c',
        context: {
          start_date: '2022-05-21',
          user_roles: [ 'chw' ],
        },
      },
      {
        _id: 'form:training:abc-098',
        internalId: 'training:form-b',
        context: {
          start_date: '2022-05-21',
          user_roles: [ 'chw' ],
        },
      },
    ];
    service.initTrainingCards();

    expect(xmlFormsService.subscribe.calledOnce).to.be.true;
    expect(xmlFormsService.subscribe.args[0][0]).to.equal('TrainingCards');
    expect(xmlFormsService.subscribe.args[0][1]).to.deep.equal({ trainingCards: true });
    const callback = xmlFormsService.subscribe.args[0][2];

    await callback(null, xforms);

    expect(sessionService.userCtx.calledOnce).to.be.true;
    expect(sessionService.hasRole.calledThrice).to.be.true;
    expect(localDb.allDocs.calledOnce).to.be.true;
    expect(localDb.allDocs.args[0][0]).to.deep.equal({
      include_docs: true,
      startkey: 'training:a_user:',
      endkey: 'training:a_user:\ufff0',
    });
    expect(globalActions.setTrainingCardFormId.calledOnce);
    expect(globalActions.setTrainingCardFormId.args[0]).to.have.members([ 'training:form-c' ]);
    expect(modalService.show.notCalled).to.be.true;
    expect(consoleErrorMock.notCalled).to.be.true;
    expect(feedbackService.submit.notCalled).to.be.true;
  });

  it('should show uncompleted training form when they dont have start_date set', async () => {
    sessionService.userCtx.returns({ roles: [ 'chw' ], name: 'a_user' });
    localDb.allDocs.resolves({ rows: [
      { doc: { form: 'training:form-b' } },
    ]});
    clock = sinon.useFakeTimers(new Date('2022-05-23 20:29:25'));
    const xforms = [
      {
        _id: 'form:training:abc-098',
        internalId: 'training:form-a',
        context: {
          start_date: 'it is a bad date',
          duration: 9,
          user_roles: [ 'chw' ],
        },
      },
      {
        _id: 'form:training:abc-099',
        internalId: 'training:form-b',
        context: {
          duration: 1,
          user_roles: [ 'chw' ],
        },
      },
      {
        _id: 'form:training:abc-100',
        internalId: 'training:form-c',
        context: {
          duration: 9,
          user_roles: [ 'chw' ],
        },
      },
      {
        _id: 'form:training:abc-101',
        internalId: 'training:form-d',
        context: {
          duration: 5,
          user_roles: [ 'chw' ],
        },
      },
    ];
    service.initTrainingCards();

    expect(xmlFormsService.subscribe.calledOnce).to.be.true;
    expect(xmlFormsService.subscribe.args[0][0]).to.equal('TrainingCards');
    expect(xmlFormsService.subscribe.args[0][1]).to.deep.equal({ trainingCards: true });
    const callback = xmlFormsService.subscribe.args[0][2];

    await callback(null, xforms);

    expect(sessionService.userCtx.calledOnce).to.be.true;
    expect(sessionService.hasRole.callCount).to.equal(4);
    expect(localDb.allDocs.calledOnce).to.be.true;
    expect(localDb.allDocs.args[0][0]).to.deep.equal({
      include_docs: true,
      startkey: 'training:a_user:',
      endkey: 'training:a_user:\ufff0',
    });
    expect(globalActions.setTrainingCardFormId.calledOnce);
    expect(globalActions.setTrainingCardFormId.args[0]).to.have.members([ 'training:form-c' ]);
    expect(modalService.show.notCalled).to.be.true;
    expect(consoleErrorMock.notCalled).to.be.true;
    expect(feedbackService.submit.notCalled).to.be.true;
  });

  it('should not show training form when all trainings are completed', async () => {
    sessionService.userCtx.returns({ roles: [ 'chw' ], name: 'a_user' });
    localDb.allDocs.resolves({ rows: [
      { doc: { form: 'training:form-a' } },
      { doc: { form: 'training:form-b' } },
      { doc: { form: 'training:form-c' } },
    ]});
    clock = sinon.useFakeTimers(new Date('2022-05-23 20:29:25'));
    const xforms = [
      {
        _id: 'form:training:abc-123',
        internalId: 'training:form-a',
        context: {
          start_date: '2022-05-21',
          duration: 3,
          user_roles: [ 'chw' ],
        },
      },
      {
        _id: 'form:training:abc-456',
        internalId: 'training:form-b',
        context: {
          start_date: '2022-05-18',
          duration: 2,
          user_roles: [ 'chw' ],
        },
      },
      {
        _id: 'form:training:abc-098',
        internalId: 'training:form-c',
        context: {
          start_date: '2022-05-21',
          duration: 9,
          user_roles: [ 'chw' ],
        },
      },
    ];
    service.initTrainingCards();

    expect(xmlFormsService.subscribe.calledOnce).to.be.true;
    expect(xmlFormsService.subscribe.args[0][0]).to.equal('TrainingCards');
    expect(xmlFormsService.subscribe.args[0][1]).to.deep.equal({ trainingCards: true });
    const callback = xmlFormsService.subscribe.args[0][2];

    await callback(null, xforms);

    expect(sessionService.userCtx.calledOnce).to.be.true;
    expect(sessionService.hasRole.calledThrice).to.be.true;
    expect(localDb.allDocs.calledOnce).to.be.true;
    expect(localDb.allDocs.args[0][0]).to.deep.equal({
      include_docs: true,
      startkey: 'training:a_user:',
      endkey: 'training:a_user:\ufff0',
    });
    expect(globalActions.setTrainingCardFormId.notCalled).to.be.true;
    expect(modalService.show.notCalled).to.be.true;
    expect(consoleErrorMock.notCalled).to.be.true;
    expect(feedbackService.submit.notCalled).to.be.true;
  });

  it('should not show training forms when all trainings have expired', async () => {
    sessionService.userCtx.returns({ roles: [ 'chw' ], name: 'a_user' });
    localDb.allDocs.resolves({ rows: [
      { doc: { form: 'training:form-a' } },
    ]});
    clock = sinon.useFakeTimers(new Date('2022-05-23 20:29:25'));
    const xforms = [
      {
        _id: 'form:training:abc-123',
        internalId: 'training:form-a',
        context: {
          start_date: '2022-04-02',
          duration: 13,
          user_roles: [ 'chw' ],
        },
      },
      {
        _id: 'form:training:abc-456',
        internalId: 'training:form-b',
        context: {
          start_date: '2022-03-15',
          duration: 35,
          user_roles: [ 'chw' ],
        },
      },
      {
        _id: 'form:training:abc-098',
        internalId: 'training:form-c',
        context: {
          start_date: '2022-05-15',
          duration: 7,
          user_roles: [ 'chw' ],
        },
      },
    ];
    service.initTrainingCards();

    expect(xmlFormsService.subscribe.calledOnce).to.be.true;
    expect(xmlFormsService.subscribe.args[0][0]).to.equal('TrainingCards');
    expect(xmlFormsService.subscribe.args[0][1]).to.deep.equal({ trainingCards: true });
    const callback = xmlFormsService.subscribe.args[0][2];

    await callback(null, xforms);

    expect(sessionService.hasRole.calledThrice).to.be.true;
    expect(localDb.allDocs.notCalled).to.be.true;
    expect(globalActions.setTrainingCardFormId.notCalled).to.be.true;
    expect(modalService.show.notCalled).to.be.true;
    expect(consoleErrorMock.notCalled).to.be.true;
    expect(feedbackService.submit.notCalled).to.be.true;
  });

  it('should not show training forms when all trainings start in the future', async () => {
    sessionService.userCtx.returns({ roles: [ 'chw' ], name: 'a_user' });
    localDb.allDocs.resolves({ rows: [] });
    clock = sinon.useFakeTimers(new Date('2022-05-23 20:29:25'));
    const xforms = [
      {
        _id: 'form:training:abc-123',
        internalId: 'training:form-a',
        context: {
          start_date: '2022-06-20',
          duration: 13,
          user_roles: [ 'chw' ],
        },
      },
      {
        _id: 'form:training:abc-456',
        internalId: 'training:form-b',
        context: {
          start_date: '2022-05-24',
          duration: 35,
          user_roles: [ 'chw' ],
        },
      },
      {
        _id: 'form:training:abc-098',
        internalId: 'training:form-c',
        context: {
          start_date: '2022-05-28',
          duration: 7,
          user_roles: [ 'chw' ],
        },
      },
    ];
    service.initTrainingCards();

    expect(xmlFormsService.subscribe.calledOnce).to.be.true;
    expect(xmlFormsService.subscribe.args[0][0]).to.equal('TrainingCards');
    expect(xmlFormsService.subscribe.args[0][1]).to.deep.equal({ trainingCards: true });
    const callback = xmlFormsService.subscribe.args[0][2];

    await callback(null, xforms);

    expect(sessionService.hasRole.calledThrice).to.be.true;
    expect(localDb.allDocs.notCalled).to.be.true;
    expect(globalActions.setTrainingCardFormId.notCalled).to.be.true;
    expect(modalService.show.notCalled).to.be.true;
    expect(consoleErrorMock.notCalled).to.be.true;
    expect(feedbackService.submit.notCalled).to.be.true;
  });

  it('should not show training forms if their internalID does not have the right prefix', async () => {
    sessionService.userCtx.returns({ roles: [ 'chw' ], name: 'a_user' });
    localDb.allDocs.resolves({ rows: [] });
    clock = sinon.useFakeTimers(new Date('2022-06-03 20:29:25'));
    const xforms = [
      {
        _id: 'form:training:cards-1',
        internalId: ':training:cards-1',
        context: {
          start_date: '2022-05-20',
          duration: 60,
          user_roles: [ 'chw' ],
        },
      },
      {
        _id: 'form:training:cards-2',
        internalId: 'cards-2',
        context: {
          start_date: '2022-06-02',
          duration: 35,
          user_roles: [ 'chw' ],
        },
      },
      {
        _id: 'form:training:cards-3',
        internalId: 'contact:cards-3',
        context: {
          start_date: '2022-05-28',
          duration: 10,
          user_roles: [ 'chw' ],
        },
      },
    ];
    service.initTrainingCards();

    expect(xmlFormsService.subscribe.calledOnce).to.be.true;
    expect(xmlFormsService.subscribe.args[0][0]).to.equal('TrainingCards');
    expect(xmlFormsService.subscribe.args[0][1]).to.deep.equal({ trainingCards: true });
    const callback = xmlFormsService.subscribe.args[0][2];

    await callback(null, xforms);

    expect(localDb.allDocs.notCalled).to.be.true;
    expect(globalActions.setTrainingCardFormId.notCalled).to.be.true;
    expect(modalService.show.notCalled).to.be.true;

    expect(consoleErrorMock.calledThrice).to.be.true;
    expect(consoleErrorMock.args[0][0].message)
      .to.equal('Training Cards :: Incorrect internalId format. Doc ID: form:training:cards-1');
    expect(consoleErrorMock.args[1][0].message)
      .to.equal('Training Cards :: Incorrect internalId format. Doc ID: form:training:cards-2');
    expect(consoleErrorMock.args[2][0].message)
      .to.equal('Training Cards :: Incorrect internalId format. Doc ID: form:training:cards-3');
  });

  it('should not show the modal when no training forms', async () => {
    sessionService.userCtx.returns({ roles: [ 'chw' ], name: 'a_user' });
    localDb.allDocs.resolves({ rows: [] });
    clock = sinon.useFakeTimers(new Date('2022-05-23 20:29:25'));
    service.initTrainingCards();

    expect(xmlFormsService.subscribe.calledOnce).to.be.true;
    expect(xmlFormsService.subscribe.args[0][0]).to.equal('TrainingCards');
    expect(xmlFormsService.subscribe.args[0][1]).to.deep.equal({ trainingCards: true });
    const callback = xmlFormsService.subscribe.args[0][2];

    await callback(null, []);

    expect(sessionService.hasRole.notCalled).to.be.true;
    expect(localDb.allDocs.notCalled).to.be.true;
    expect(globalActions.setTrainingCardFormId.notCalled).to.be.true;
    expect(modalService.show.notCalled).to.be.true;
    expect(consoleErrorMock.notCalled).to.be.true;
    expect(feedbackService.submit.notCalled).to.be.true;
  });

  it('should log error from xmlFormsService', async () => {
    service.initTrainingCards();

    expect(xmlFormsService.subscribe.calledOnce).to.be.true;
    expect(xmlFormsService.subscribe.args[0][0]).to.equal('TrainingCards');
    expect(xmlFormsService.subscribe.args[0][1]).to.deep.equal({ trainingCards: true });
    const callback = xmlFormsService.subscribe.args[0][2];

    await callback(new Error('some error'), []);

    expect(localDb.allDocs.notCalled).to.be.true;
    expect(sessionService.userCtx.notCalled).to.be.true;
    expect(sessionService.hasRole.notCalled).to.be.true;
    expect(globalActions.setTrainingCardFormId.notCalled).to.be.true;
    expect(modalService.show.notCalled).to.be.true;
    expect(consoleErrorMock.calledOnce).to.be.true;
    expect(consoleErrorMock.args[0][0]).to.equal('Training Cards :: Error fetching forms.');
    expect(consoleErrorMock.args[0][1].message).to.equal('some error');
  });

  it('should catch exception', async () => {
    sessionService.userCtx.returns({ roles: [ 'chw' ], name: 'a_user' });
    localDb.allDocs.rejects(new Error('some error'));
    clock = sinon.useFakeTimers(new Date('2022-05-23 20:29:25'));
    const xforms = [{
      _id: 'form:training:abc-123',
      internalId: 'training:form-a',
      context: {
        start_date: '2022-05-21',
        duration: 3,
        user_roles: [ 'chw' ],
      },
    }];
    service.initTrainingCards();

    expect(xmlFormsService.subscribe.calledOnce).to.be.true;
    expect(xmlFormsService.subscribe.args[0][0]).to.equal('TrainingCards');
    expect(xmlFormsService.subscribe.args[0][1]).to.deep.equal({ trainingCards: true });
    const callback = xmlFormsService.subscribe.args[0][2];

    await callback(null, xforms);

    expect(sessionService.hasRole.calledOnce).to.be.true;
    expect(sessionService.userCtx.calledOnce).to.be.true;
    expect(localDb.allDocs.calledOnce).to.be.true;
    expect(globalActions.setTrainingCardFormId.notCalled).to.be.true;
    expect(modalService.show.notCalled).to.be.true;
    expect(consoleErrorMock.calledOnce).to.be.true;
    expect(consoleErrorMock.args[0][0]).to.equal('Training Cards :: Error showing modal.');
    expect(consoleErrorMock.args[0][1].message).to.equal('some error');
  });

  it('should not display training if route has hideTraining flag', async () => {
    routeSnapshotService.get.returns({ data: { hideTraining: true } });
    service.displayTrainingCards();
    expect(modalService.show.notCalled).to.be.true;
  });

  it('should display training', () => {
    routeSnapshotService.get.returns({ data: { hideTraining: false } });
    service.displayTrainingCards();
    expect(modalService.show.calledOnce).to.be.true;
  });

  it('should show uncompleted training form based on user role', async () => {
    sessionService.userCtx.returns({ roles: [ 'role_a' ], name: 'a_user' });
    localDb.allDocs.resolves({ rows: [
      { doc: { form: 'training:form-b' } },
    ]});
    clock = sinon.useFakeTimers(new Date('2022-05-23 20:29:25'));
    const xforms = [
      {
        _id: 'form:training:abc-098',
        internalId: 'training:form-e',
        context: {
          start_date: '2022-05-21',
          duration: 9,
          user_roles: [ 'role_a', 'role_c' ],
        },
      },
      {
        _id: 'form:training:abc-456',
        internalId: 'training:form-b',
        context: {
          start_date: '2022-05-18',
          duration: 2,
          user_roles: [ 'role_a', 'role_c' ],
        },
      },
      {
        _id: 'form:training:abc-123',
        internalId: 'training:form-a',
        context: {
          start_date: '2022-05-21',
          duration: 3,
          user_roles: [ 'role_b', 'role_c' ],
        },
      },
      {
        _id: 'form:training:abc-789',
        internalId: 'training:form-c',
        context: {
          start_date: '2022-05-28',
          duration: 6,
          user_roles: [ 'role_a' ],
        },
      },
      {
        _id: 'form:training:abc-098',
        internalId: 'training:form-d',
        context: {
          start_date: '2022-05-21',
          duration: 19,
        },
      },
    ];
    service.initTrainingCards();

    expect(xmlFormsService.subscribe.calledOnce).to.be.true;
    expect(xmlFormsService.subscribe.args[0][0]).to.equal('TrainingCards');
    expect(xmlFormsService.subscribe.args[0][1]).to.deep.equal({ trainingCards: true });
    const callback = xmlFormsService.subscribe.args[0][2];

    await callback(null, xforms);

    expect(sessionService.userCtx.calledOnce).to.be.true;
    expect(sessionService.hasRole.callCount).to.equal(5);
    expect(localDb.allDocs.calledOnce).to.be.true;
    expect(localDb.allDocs.args[0][0]).to.deep.equal({
      include_docs: true,
      startkey: 'training:a_user:',
      endkey: 'training:a_user:\ufff0',
    });
    expect(globalActions.setTrainingCardFormId.calledOnce);
    expect(globalActions.setTrainingCardFormId.args[0]).to.have.members([ 'training:form-e' ]);
    expect(modalService.show.notCalled).to.be.true;
    expect(consoleErrorMock.notCalled).to.be.true;
    expect(feedbackService.submit.notCalled).to.be.true;
  });

  it('should show uncompleted training when form does not have user_roles defined', async () => {
    sessionService.userCtx.returns({ roles: [ 'role_a' ], name: 'a_user' });
    localDb.allDocs.resolves({ rows: [
      { doc: { form: 'training:form-b' } },
    ]});
    clock = sinon.useFakeTimers(new Date('2022-05-23 20:29:25'));
    const xforms = [
      {
        _id: 'form:training:abc-098',
        internalId: 'training:form-d',
        context: {
          start_date: '2022-05-21',
          duration: 19,
        },
      },
      {
        _id: 'form:training:abc-098',
        internalId: 'training:form-e',
        context: {
          start_date: '2022-05-21',
          duration: 9,
          user_roles: [ 'role_a', 'role_c' ],
        },
      },
    ];
    service.initTrainingCards();

    expect(xmlFormsService.subscribe.calledOnce).to.be.true;
    expect(xmlFormsService.subscribe.args[0][0]).to.equal('TrainingCards');
    expect(xmlFormsService.subscribe.args[0][1]).to.deep.equal({ trainingCards: true });
    const callback = xmlFormsService.subscribe.args[0][2];

    await callback(null, xforms);

    expect(sessionService.userCtx.calledOnce).to.be.true;
    expect(sessionService.hasRole.calledOnce).to.be.true;
    expect(localDb.allDocs.calledOnce).to.be.true;
    expect(localDb.allDocs.args[0][0]).to.deep.equal({
      include_docs: true,
      startkey: 'training:a_user:',
      endkey: 'training:a_user:\ufff0',
    });
    expect(globalActions.setTrainingCardFormId.calledOnce);
    expect(globalActions.setTrainingCardFormId.args[0]).to.have.members([ 'training:form-d' ]);
    expect(modalService.show.notCalled).to.be.true;
    expect(consoleErrorMock.notCalled).to.be.true;
    expect(feedbackService.submit.notCalled).to.be.true;
  });

  it('should evaluate if the internalID is from a training card', () => {
    expect(service.isTrainingCardForm('training:my_new_feature')).to.be.true;
    expect(service.isTrainingCardForm(':training:my_new_feature')).to.be.false;
    expect(service.isTrainingCardForm('form:training:my_new_feature')).to.be.false;
    expect(service.isTrainingCardForm('my_new_feature')).to.be.false;
    expect(service.isTrainingCardForm('contact:my_new_feature')).to.be.false;
    expect(service.isTrainingCardForm(':my_new_feature')).to.be.false;
    expect(service.isTrainingCardForm('')).to.be.false;
    expect(service.isTrainingCardForm(undefined)).to.be.false;
  });

  it('should return a doc id properly formatted', () => {
    sessionService.userCtx.returns({ name: 'ronald' });
    expect(service.getTrainingCardDocId().startsWith('training:ronald:')).to.be.true;
  });

  it('should throw exception if it cannot create a doc id', () => {
    try {
      sessionService.userCtx.returns({});
      service.getTrainingCardDocId().startsWith('training:ronald:');
      assert.fail('should have thrown');
    } catch (error) {
      expect(error.message)
        .to.equal('Training Cards :: Cannot create document ID, user context does not have the "name" property.');
    }
  });
});
