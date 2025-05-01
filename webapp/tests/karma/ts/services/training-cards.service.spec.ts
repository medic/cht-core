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
import { TranslateService } from '@ngx-translate/core';
import { TranslateFromService } from '@mm-services/translate-from.service';

describe('TrainingCardsService', () => {
  let service: TrainingCardsService;
  let globalActions;
  let xmlFormsService;
  let dbService;
  let modalService;
  let localDb;
  let clock;
  let consoleErrorSpy;
  let sessionService;
  let routeSnapshotService;

  beforeEach(() => {
    localDb = { allDocs: sinon.stub().resolves({}) };
    dbService = { get: () => localDb };
    globalActions = { setTrainingCard: sinon.stub(GlobalActions.prototype, 'setTrainingCard') };
    xmlFormsService = { subscribe: sinon.stub() };
    modalService = { show: sinon.stub() };
    sessionService = {
      userCtx: sinon.stub().returns({}),
      hasRole: sinon.spy(SessionService.prototype, 'hasRole'),
    };
    consoleErrorSpy = sinon.spy(console, 'error');
    routeSnapshotService = { get: sinon.stub().returns({}) };

    TestBed.configureTestingModule({
      providers: [
        provideMockStore(),
        { provide: DbService, useValue: dbService },
        { provide: XmlFormsService, useValue: xmlFormsService },
        { provide: ModalService, useValue: modalService },
        { provide: SessionService, useValue: sessionService },
        { provide: RouteSnapshotService, useValue: routeSnapshotService },
        { provide: TranslateService, useValue: { instant: sinon.stub() } },
        { provide: TranslateFromService, useValue: { get: sinon.stub().returnsArg(0) } },
      ],
    });

    service = TestBed.inject(TrainingCardsService);
  });

  afterEach(() => {
    clock?.restore();
    sinon.restore();
    document
      .querySelectorAll('#enketo-test')
      .forEach(element => element.remove());
  });

  it('should show uncompleted training when none are completed', async () => {
    sessionService.userCtx.returns({ roles: [ 'chw' ], name: 'a_user' });
    localDb.allDocs.resolves({ rows: [] });
    clock = sinon.useFakeTimers({ now:new Date('2022-05-23 20:29:25')});
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

    await service.displayTrainingCards(xforms, true, true);

    expect(sessionService.userCtx.calledTwice).to.be.true;
    expect(sessionService.hasRole.callCount).to.equal(4);
    expect(localDb.allDocs.calledOnce).to.be.true;
    expect(localDb.allDocs.args[0][0]).to.deep.equal({
      include_docs: true,
      startkey: 'training:a_user:',
      endkey: 'training:a_user:\ufff0',
    });
    expect(globalActions.setTrainingCard.calledOnce).to.be.true;
    expect(globalActions.setTrainingCard.args[0]).to.deep.equal([ { formId: 'training:form-b' } ]);
    expect(consoleErrorSpy.notCalled).to.be.true;
  });

  it('should show uncompleted training when there are some completed', async () => {
    sessionService.userCtx.returns({ roles: [ 'chw' ], name: 'a_user' });
    localDb.allDocs.resolves({ rows: [
      { doc: { form: 'training:form-a' } },
      { doc: { form: 'training:form-b' } },
    ]});
    clock = sinon.useFakeTimers({ now:new Date('2022-05-23 20:29:25')});
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

    await service.displayTrainingCards(xforms, true, true);

    expect(sessionService.userCtx.calledTwice).to.be.true;
    expect(sessionService.hasRole.callCount).to.equal(4);
    expect(localDb.allDocs.calledOnce).to.be.true;
    expect(localDb.allDocs.args[0][0]).to.deep.equal({
      include_docs: true,
      startkey: 'training:a_user:',
      endkey: 'training:a_user:\ufff0',
    });
    expect(globalActions.setTrainingCard.calledOnce).to.be.true;
    expect(globalActions.setTrainingCard.args[0]).to.deep.equal([ { formId: 'training:form-d' } ]);
    expect(modalService.show.calledOnce).to.be.true;
    expect(consoleErrorSpy.notCalled).to.be.true;
  });

  it('should show uncompleted training form when they dont have duration set', async () => {
    sessionService.userCtx.returns({ roles: [ 'chw' ], name: 'a_user' });
    localDb.allDocs.resolves({ rows: [
      { doc: { form: 'training:form-a' } },
      { doc: { form: 'training:form-b' } },
    ]});
    clock = sinon.useFakeTimers({ now:new Date('2022-05-23 20:29:25')});
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

    await service.displayTrainingCards(xforms, true, true);

    expect(sessionService.userCtx.calledTwice).to.be.true;
    expect(sessionService.hasRole.calledThrice).to.be.true;
    expect(localDb.allDocs.calledOnce).to.be.true;
    expect(localDb.allDocs.args[0][0]).to.deep.equal({
      include_docs: true,
      startkey: 'training:a_user:',
      endkey: 'training:a_user:\ufff0',
    });
    expect(globalActions.setTrainingCard.calledOnce).to.be.true;
    expect(globalActions.setTrainingCard.args[0]).to.deep.equal([ { formId: 'training:form-c' } ]);
    expect(modalService.show.calledOnce).to.be.true;
    expect(consoleErrorSpy.notCalled).to.be.true;
  });

  it('should show uncompleted training form when they dont have start_date set', async () => {
    sessionService.userCtx.returns({ roles: [ 'chw' ], name: 'a_user' });
    localDb.allDocs.resolves({ rows: [
      { doc: { form: 'training:form-b' } },
    ]});
    clock = sinon.useFakeTimers({ now:new Date('2022-05-23 20:29:25')});
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

    await service.displayTrainingCards(xforms, true, true);

    expect(sessionService.userCtx.calledTwice).to.be.true;
    expect(sessionService.hasRole.callCount).to.equal(4);
    expect(localDb.allDocs.calledOnce).to.be.true;
    expect(localDb.allDocs.args[0][0]).to.deep.equal({
      include_docs: true,
      startkey: 'training:a_user:',
      endkey: 'training:a_user:\ufff0',
    });
    expect(globalActions.setTrainingCard.calledOnce).to.be.true;
    expect(globalActions.setTrainingCard.args[0]).to.deep.equal([ { formId: 'training:form-c' } ]);
    expect(modalService.show.calledOnce).to.be.true;
    expect(consoleErrorSpy.notCalled).to.be.true;
  });

  it('should not show training when privacy policy has not been accepted yet', async () => {
    sessionService.userCtx.returns({ roles: [ 'chw' ], name: 'a_user' });
    localDb.allDocs.resolves({ rows: []});
    clock = sinon.useFakeTimers({ now:new Date('2022-05-23 20:29:25')});
    const xforms = [{
      _id: 'form:training:abc-100',
      internalId: 'training:form-c',
      context: { duration: 9, user_roles: [ 'chw' ] },
    }];

    await service.displayTrainingCards(xforms, true, false);

    expect(sessionService.userCtx.notCalled).to.be.true;
    expect(sessionService.hasRole.notCalled).to.be.true;
    expect(localDb.allDocs.notCalled).to.be.true;
    expect(globalActions.setTrainingCard.notCalled).to.be.true;
    expect(modalService.show.notCalled).to.be.true;
    expect(consoleErrorSpy.notCalled).to.be.true;
  });

  it('should not show training form when all trainings are completed', async () => {
    sessionService.userCtx.returns({ roles: [ 'chw' ], name: 'a_user' });
    localDb.allDocs.resolves({ rows: [
      { doc: { form: 'training:form-a' } },
      { doc: { form: 'training:form-b' } },
      { doc: { form: 'training:form-c' } },
    ]});
    clock = sinon.useFakeTimers({ now:new Date('2022-05-23 20:29:25')});
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

    await service.displayTrainingCards(xforms, true, true);

    expect(sessionService.userCtx.calledTwice).to.be.true;
    expect(sessionService.hasRole.calledThrice).to.be.true;
    expect(localDb.allDocs.calledOnce).to.be.true;
    expect(localDb.allDocs.args[0][0]).to.deep.equal({
      include_docs: true,
      startkey: 'training:a_user:',
      endkey: 'training:a_user:\ufff0',
    });
    expect(globalActions.setTrainingCard.notCalled).to.be.true;
    expect(modalService.show.notCalled).to.be.true;
    expect(consoleErrorSpy.notCalled).to.be.true;
  });

  it('should not show training forms when all trainings have expired', async () => {
    sessionService.userCtx.returns({ roles: [ 'chw' ], name: 'a_user' });
    localDb.allDocs.resolves({ rows: [
      { doc: { form: 'training:form-a' } },
    ]});
    clock = sinon.useFakeTimers({ now:new Date('2022-05-23 20:29:25')});
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

    await service.displayTrainingCards(xforms, true, true);

    expect(sessionService.hasRole.calledThrice).to.be.true;
    expect(localDb.allDocs.notCalled).to.be.true;
    expect(globalActions.setTrainingCard.notCalled).to.be.true;
    expect(modalService.show.notCalled).to.be.true;
    expect(consoleErrorSpy.notCalled).to.be.true;
  });

  it('should not show training forms when all trainings start in the future', async () => {
    sessionService.userCtx.returns({ roles: [ 'chw' ], name: 'a_user' });
    localDb.allDocs.resolves({ rows: [] });
    clock = sinon.useFakeTimers({ now:new Date('2022-05-23 20:29:25')});
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

    await service.displayTrainingCards(xforms, true, true);

    expect(sessionService.hasRole.calledThrice).to.be.true;
    expect(localDb.allDocs.notCalled).to.be.true;
    expect(globalActions.setTrainingCard.notCalled).to.be.true;
    expect(modalService.show.notCalled).to.be.true;
    expect(consoleErrorSpy.notCalled).to.be.true;
  });

  it('should not show training forms if their internalID does not have the right prefix', async () => {
    sessionService.userCtx.returns({ roles: [ 'chw' ], name: 'a_user' });
    localDb.allDocs.resolves({ rows: [] });
    clock = sinon.useFakeTimers({ now:new Date('2022-05-23 20:29:25')});
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

    await service.displayTrainingCards(xforms, true, true);

    expect(localDb.allDocs.notCalled).to.be.true;
    expect(globalActions.setTrainingCard.notCalled).to.be.true;
    expect(modalService.show.notCalled).to.be.true;

    expect(consoleErrorSpy.calledThrice).to.be.true;
    expect(consoleErrorSpy.args[0][0].message)
      .to.equal('Training Cards :: Incorrect internalId format. Doc ID: form:training:cards-1');
    expect(consoleErrorSpy.args[1][0].message)
      .to.equal('Training Cards :: Incorrect internalId format. Doc ID: form:training:cards-2');
    expect(consoleErrorSpy.args[2][0].message)
      .to.equal('Training Cards :: Incorrect internalId format. Doc ID: form:training:cards-3');
  });

  it('should not show the modal when no training forms', async () => {
    sessionService.userCtx.returns({ roles: [ 'chw' ], name: 'a_user' });
    localDb.allDocs.resolves({ rows: [] });
    clock = sinon.useFakeTimers({ now:new Date('2022-05-23 20:29:25')});

    await service.displayTrainingCards([], true, true);

    expect(sessionService.hasRole.notCalled).to.be.true;
    expect(localDb.allDocs.notCalled).to.be.true;
    expect(globalActions.setTrainingCard.notCalled).to.be.true;
    expect(modalService.show.notCalled).to.be.true;
    expect(consoleErrorSpy.notCalled).to.be.true;
  });

  it('should log error from xmlFormsService', async () => {
    service.initTrainingCards();

    expect(xmlFormsService.subscribe.calledOnce).to.be.true;
    expect(xmlFormsService.subscribe.args[0][0]).to.equal('TrainingCards');
    expect(xmlFormsService.subscribe.args[0][1]).to.deep.equal({ trainingCards: true });
    const callback = xmlFormsService.subscribe.args[0][2];

    await callback(new Error('some error'), []);

    expect(globalActions.setTrainingCard.notCalled).to.be.true;
    expect(consoleErrorSpy.calledOnce).to.be.true;
    expect(consoleErrorSpy.args[0][0]).to.equal('Training Cards :: Error fetching forms.');
    expect(consoleErrorSpy.args[0][1].message).to.equal('some error');
  });

  it('should catch exception', async () => {
    sessionService.userCtx.returns({ roles: [ 'chw' ], name: 'a_user' });
    localDb.allDocs.rejects(new Error('some error'));
    clock = sinon.useFakeTimers({ now:new Date('2022-05-23 20:29:25')});
    const xforms = [{
      _id: 'form:training:abc-123',
      internalId: 'training:form-a',
      context: {
        start_date: '2022-05-21',
        duration: 3,
        user_roles: [ 'chw' ],
      },
    }];

    await service.displayTrainingCards(xforms, true, true);

    expect(sessionService.hasRole.calledOnce).to.be.true;
    expect(sessionService.userCtx.calledTwice).to.be.true;
    expect(localDb.allDocs.calledOnce).to.be.true;
    expect(globalActions.setTrainingCard.notCalled).to.be.true;
    expect(modalService.show.notCalled).to.be.true;
    expect(consoleErrorSpy.calledOnce).to.be.true;
    expect(consoleErrorSpy.args[0][0]).to.equal('Training Cards :: Error showing modal.');
    expect(consoleErrorSpy.args[0][1].message).to.equal('some error');
  });

  it('should display training if route has hideTraining false', async () => {
    sessionService.userCtx.returns({ roles: [ 'chw' ], name: 'a_user' });
    localDb.allDocs.resolves({ rows: [ { doc: { form: 'training:form-b' } } ] });
    clock = sinon.useFakeTimers({ now:new Date('2022-05-23 20:29:25')});
    const xforms = [ {
      _id: 'form:training:abc-100',
      internalId: 'training:form-c',
      context: { duration: 9, user_roles: [ 'chw' ] },
    }];

    routeSnapshotService.get.returns({ data: { hideTraining: true } });
    await service.displayTrainingCards(xforms, true, true);

    expect(modalService.show.notCalled).to.be.true;

    routeSnapshotService.get.returns({ data: { hideTraining: false } });
    await service.displayTrainingCards(xforms, true, true);

    expect(modalService.show.calledOnce).to.be.true;
  });

  it('should show uncompleted training form based on user role', async () => {
    sessionService.userCtx.returns({ roles: [ 'role_a' ], name: 'a_user' });
    localDb.allDocs.resolves({ rows: [
      { doc: { form: 'training:form-b' } },
    ]});
    clock = sinon.useFakeTimers({ now:new Date('2022-05-23 20:29:25')});
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

    await service.displayTrainingCards(xforms, true, true);

    expect(sessionService.userCtx.calledTwice).to.be.true;
    expect(sessionService.hasRole.callCount).to.equal(5);
    expect(localDb.allDocs.calledOnce).to.be.true;
    expect(localDb.allDocs.args[0][0]).to.deep.equal({
      include_docs: true,
      startkey: 'training:a_user:',
      endkey: 'training:a_user:\ufff0',
    });
    expect(globalActions.setTrainingCard.calledOnce).to.be.true;
    expect(globalActions.setTrainingCard.args[0]).to.deep.equal([ { formId: 'training:form-e' } ]);
    expect(modalService.show.calledOnce).to.be.true;
    expect(consoleErrorSpy.notCalled).to.be.true;
  });

  it('should show uncompleted training when form does not have user_roles defined', async () => {
    sessionService.userCtx.returns({ roles: [ 'role_a' ], name: 'a_user' });
    localDb.allDocs.resolves({ rows: [
      { doc: { form: 'training:form-b' } },
    ]});
    clock = sinon.useFakeTimers({ now:new Date('2022-05-23 20:29:25')});
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

    await service.displayTrainingCards(xforms, true, true);

    expect(sessionService.userCtx.calledTwice).to.be.true;
    expect(sessionService.hasRole.calledOnce).to.be.true;
    expect(localDb.allDocs.calledOnce).to.be.true;
    expect(localDb.allDocs.args[0][0]).to.deep.equal({
      include_docs: true,
      startkey: 'training:a_user:',
      endkey: 'training:a_user:\ufff0',
    });
    expect(globalActions.setTrainingCard.calledOnce).to.be.true;
    expect(globalActions.setTrainingCard.args[0]).to.deep.equal([ { formId: 'training:form-d' } ]);
    expect(modalService.show.calledOnce).to.be.true;
    expect(consoleErrorSpy.notCalled).to.be.true;
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

  describe('Display training cards once', () => {
    afterEach(() => window.localStorage.removeItem('training-cards-last-viewed-date'));

    it('should display training when it has not been displayed today', async () => {
      routeSnapshotService.get.returns({ data: { hideTraining: false } });
      sessionService.userCtx.returns({ roles: [ 'chw' ], name: 'ronald' });
      window.localStorage.setItem('training-cards-last-viewed-date-ronald', '2024-05-23 20:29:25');
      clock = sinon.useFakeTimers({ now:new Date('2022-05-23 20:29:25')});
      localDb.allDocs.resolves({ rows: [] });
      const xforms = [ {
        _id: 'form:training:abc-100',
        internalId: 'training:form-c',
        context: { duration: 9, user_roles: [ 'chw' ] },
      }];

      await service.displayTrainingCards(xforms, true, true);

      expect(modalService.show.calledOnce).to.be.true;
    });

    it('should display training when last viewed date is empty', async () => {
      sessionService.userCtx.returns({ roles: [ 'chw' ], name: 'ronald' });
      routeSnapshotService.get.returns({ data: { hideTraining: false } });
      window.localStorage.setItem('training-cards-last-viewed-date-ronald', '');
      clock = sinon.useFakeTimers({ now:new Date('2022-05-23 20:29:25')});
      localDb.allDocs.resolves({ rows: [] });
      const xforms = [ {
        _id: 'form:training:abc-100',
        internalId: 'training:form-c',
        context: { duration: 9, user_roles: [ 'chw' ] },
      }];

      await service.displayTrainingCards(xforms, true, true);

      expect(modalService.show.calledOnce).to.be.true;
    });

    it('should not display training when it has been displayed today for the same user', async () => {
      routeSnapshotService.get.returns({ data: { hideTraining: false } });
      sessionService.userCtx.returns({ roles: [ 'chw' ], name: 'ronald' });
      window.localStorage.setItem('training-cards-last-viewed-date-ronald', '2024-05-23 20:29:25');
      clock = sinon.useFakeTimers({ now:new Date('2024-05-23 06:29:25')});
      localDb.allDocs.resolves({ rows: [] });
      const xforms = [ {
        _id: 'form:training:abc-100',
        internalId: 'training:form-c',
        context: { duration: 9, user_roles: [ 'chw' ] },
      }];

      await service.displayTrainingCards(xforms, true, true);

      expect(modalService.show.notCalled).to.be.true;
    });

    it('should display training when it has not been displayed for a different user', async () => {
      routeSnapshotService.get.returns({ data: { hideTraining: false } });
      sessionService.userCtx.returns({ roles: [ 'chw' ], name: 'sarah' });
      window.localStorage.setItem('training-cards-last-viewed-date-ronald', '2024-05-23 20:29:25');
      clock = sinon.useFakeTimers({ now:new Date('2024-05-23 06:29:25')});
      localDb.allDocs.resolves({ rows: [ { doc: { form: 'training:form-b' } } ] });
      const xforms = [ {
        _id: 'form:training:abc-100',
        internalId: 'training:form-c',
        context: { duration: 9, user_roles: [ 'chw' ] },
      }];

      await service.displayTrainingCards(xforms, true, true);

      expect(modalService.show.calledOnce).to.be.true;
    });
  });

  describe('Get next available trainings', () => {
    it('should return list of available trainings', async () => {
      sessionService.userCtx.returns({ roles: [ 'chw' ], name: 'a_user' });
      localDb.allDocs.resolves({ rows: [
        { doc: { form: 'training:form-a' } },
        { doc: { form: 'training:form-b' } },
      ]});
      clock = sinon.useFakeTimers({ now:new Date('2022-05-23 20:29:25')});
      const xforms = [
        {
          _id: 'form:training:abc-789',
          internalId: 'training:form-c',
          context: { start_date: '2022-05-28', duration: 6, user_roles: [ 'chw' ] },
        },
        {
          _id: 'form:training:abc-456',
          internalId: 'training:form-a',
          context: { start_date: '2022-05-18', duration: 2, user_roles: [ 'chw' ] },
        },
        {
          _id: 'form:training:abc-123',
          internalId: 'training:form-b',
          context: { start_date: '2022-05-21', duration: 3, user_roles: [ 'chw' ] },
        },
        {
          _id: 'form:training:abc-098',
          internalId: 'training:form-d',
          context: { start_date: '2022-05-21', duration: 9, user_roles: [ 'chw' ] },
        },
      ];

      const result = await service.getNextTrainings(xforms, 50, 0);

      expect(sessionService.userCtx.calledOnce).to.be.true;
      expect(sessionService.hasRole.callCount).to.equal(4);
      expect(localDb.allDocs.calledOnce).to.be.true;
      expect(localDb.allDocs.args[0][0]).to.deep.equal({
        include_docs: true,
        startkey: 'training:a_user:',
        endkey: 'training:a_user:\ufff0',
      });
      expect(result).excluding('startDate').to.have.deep.members([
        {
          id: 'form:training:abc-123',
          code: 'training:form-b',
          isCompletedTraining: true,
          title: undefined,
          userRoles: [ 'chw' ],
          duration: 3,
        },
        {
          id: 'form:training:abc-098',
          code: 'training:form-d',
          isCompletedTraining: false,
          title: undefined,
          userRoles: [ 'chw' ],
          duration: 9,
        },
      ]);
    });

    it('should paginate the list of available trainings', async () => {
      sessionService.userCtx.returns({ roles: [ 'chw' ], name: 'a_user' });
      localDb.allDocs.resolves({ rows: [
        { doc: { form: 'training:form-a' } },
        { doc: { form: 'training:form-b' } },
      ]});
      clock = sinon.useFakeTimers({ now:new Date('2022-05-23 20:29:25')});
      const xforms = [
        ...Array.from({ length: 30 }).map((item, index) => ({
          _id: 'form:training:abc-123' + index,
          internalId: 'training:form-b',
          context: { start_date: '2022-05-21', duration: 3, user_roles: [ 'chw' ] },
        })),
        ...Array.from({ length: 30 }).map((item, index) => ({
          _id: 'form:training:abc-789' + index,
          internalId: 'training:form-c',
          context: { start_date: '2022-05-28', duration: 6, user_roles: [ 'chw' ] },
        })),
        ...Array.from({ length: 30 }).map((item, index) => ({
          _id: 'form:training:abc-098' + index,
          title: 'A Title',
          internalId: 'training:form-d',
          context: { start_date: '2022-05-21', duration: 9, user_roles: [ 'chw' ] },
        })),
      ];

      const expectedPage1 = [
        ...Array.from({ length: 30 }).map((item, index) => ({
          id: 'form:training:abc-123' + index,
          code: 'training:form-b',
          duration: 3,
          title: undefined,
          isCompletedTraining: true,
          userRoles: [ 'chw' ],
        })),
        ...Array.from({ length: 20 }).map((item, index) => ({
          id: 'form:training:abc-098' + index,
          title: 'A Title',
          code: 'training:form-d',
          isCompletedTraining: false,
          duration: 9,
          userRoles: [ 'chw' ],
        })),
      ];

      const expectedPage2 = [
        ...Array.from({ length: 10 }).map((item, index) => ({
          id: 'form:training:abc-098' + (20 + index),
          title: 'A Title',
          code: 'training:form-d',
          isCompletedTraining: false,
          duration: 9,
          userRoles: [ 'chw' ],
        })),
      ];

      const resultPage1 = await service.getNextTrainings(xforms, 50, 0);

      expect(sessionService.userCtx.calledOnce).to.be.true;
      expect(sessionService.hasRole.callCount).to.equal(90);
      expect(localDb.allDocs.calledOnce).to.be.true;
      expect(localDb.allDocs.args[0][0]).to.deep.equal({
        include_docs: true,
        startkey: 'training:a_user:',
        endkey: 'training:a_user:\ufff0',
      });
      expect(resultPage1?.length).to.equal(50);
      expect(resultPage1).excluding('startDate').to.have.deep.members(expectedPage1);

      const resultPage2 = await service.getNextTrainings(xforms, 50, 50);

      expect(resultPage2?.length).to.equal(10);
      expect(resultPage2).excluding('startDate').to.have.deep.members(expectedPage2);
    });
  });
});
