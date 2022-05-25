import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { GlobalActions } from '@mm-actions/global';
import { DbService } from '@mm-services/db.service';
import { XmlFormsService } from '@mm-services/xml-forms.service';
import { ModalService } from '@mm-modals/mm-modal/mm-modal';
import { TrainingCardsService } from '@mm-services/training-cards.service';
import { SessionService } from '@mm-services/session.service';

describe.only('TrainingCardsService', () => {
  let service: TrainingCardsService;
  let globalActions;
  let xmlFormsService;
  let dbService;
  let modalService;
  let localDb;
  let clock;
  let consoleErrorMock;
  let sessionService;

  beforeEach(() => {
    localDb = { query: sinon.stub() };
    dbService = { get: () => localDb };
    globalActions = { setTrainingCard: sinon.stub(GlobalActions.prototype, 'setTrainingCard') };
    xmlFormsService = { subscribe: sinon.stub() };
    modalService = { show: sinon.stub() };
    sessionService = {
      isDbAdmin: sinon.stub(),
      userCtx: sinon.stub(),
    };
    consoleErrorMock = sinon.stub(console, 'error');

    TestBed.configureTestingModule({
      providers: [
        provideMockStore(),
        { provide: DbService, useValue: dbService },
        { provide: XmlFormsService, useValue: xmlFormsService },
        { provide: ModalService, useValue: modalService },
        { provide: SessionService, useValue: sessionService },
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

  it('should show uncompleted training form when none are completed', async () => {
    sessionService.userCtx.returns({ roles: [] });
    localDb.query.resolves({ rows: [] });
    clock = sinon.useFakeTimers(1653312565642); // 23/05/2022 20:29:25
    const xforms = [
      {
        _id: 'abc-123',
        internalId: 'training:form-a',
        start_date: 1653139765642, // 21/05/2022 20:29:25
        duration: 3
      },
      {
        _id: 'abc-456',
        internalId: 'training:form-b',
        start_date: 1652880565642, // 18/05/2022 20:29:25
        duration: 2
      },
      {
        _id: 'abc-789',
        internalId: 'training:form-c',
        start_date: 1653744565642, // 28/05/2022 20:29:25
        duration: 6
      },
      {
        _id: 'abc-098',
        internalId: 'training:form-d',
        start_date: 1653139765642, // 21/05/2022 20:29:25
        duration: 9
      },
    ];
    service.initTrainingCards();

    expect(xmlFormsService.subscribe.calledOnce).to.be.true;
    expect(xmlFormsService.subscribe.args[0][0]).to.equal('TrainingCards');
    expect(xmlFormsService.subscribe.args[0][1]).to.deep.equal({ trainingForms: true, contactForms: false });
    const callback = xmlFormsService.subscribe.args[0][2];

    await callback(null, xforms);

    expect(sessionService.userCtx.calledOnce).to.be.true;
    expect(localDb.query.calledOnce).to.be.true;
    expect(localDb.query.args[0]).to.have.members([ 'medic-client/trainings_by_form' ]);
    expect(globalActions.setTrainingCard.calledOnce);
    expect(globalActions.setTrainingCard.args[0]).to.have.members([ 'training:form-a' ]);
    expect(modalService.show.calledOnce).to.be.true;
    expect(consoleErrorMock.callCount).to.equal(0);
  });

  it('should show uncompleted training form when there are some completed', async () => {
    sessionService.userCtx.returns({ roles: [] });
    localDb.query.resolves({ rows: [
      { key: [ 'training:form-a' ] },
      { key: [ 'training:form-b' ] },
    ]});
    clock = sinon.useFakeTimers(1653312565642); // 23/05/2022 20:29:25
    const xforms = [
      {
        _id: 'abc-123',
        internalId: 'training:form-a',
        start_date: 1653139765642, // 21/05/2022 20:29:25
        duration: 3
      },
      {
        _id: 'abc-456',
        internalId: 'training:form-b',
        start_date: 1652880565642, // 18/05/2022 20:29:25
        duration: 2
      },
      {
        _id: 'abc-789',
        internalId: 'training:form-c',
        start_date: 1653744565642, // 28/05/2022 20:29:25
        duration: 6
      },
      {
        _id: 'abc-098',
        internalId: 'training:form-d',
        start_date: 1653139765642, // 21/05/2022 20:29:25
        duration: 9
      },
    ];
    service.initTrainingCards();

    expect(xmlFormsService.subscribe.calledOnce).to.be.true;
    expect(xmlFormsService.subscribe.args[0][0]).to.equal('TrainingCards');
    expect(xmlFormsService.subscribe.args[0][1]).to.deep.equal({ trainingForms: true, contactForms: false });
    const callback = xmlFormsService.subscribe.args[0][2];

    await callback(null, xforms);

    expect(sessionService.userCtx.calledOnce).to.be.true;
    expect(localDb.query.calledOnce).to.be.true;
    expect(localDb.query.args[0]).to.have.members([ 'medic-client/trainings_by_form' ]);
    expect(globalActions.setTrainingCard.calledOnce);
    expect(globalActions.setTrainingCard.args[0]).to.have.members([ 'training:form-d' ]);
    expect(modalService.show.calledOnce).to.be.true;
    expect(consoleErrorMock.callCount).to.equal(0);
  });

  it('should show uncompleted training form when they dont have duration set', async () => {
    sessionService.userCtx.returns({ roles: [] });
    localDb.query.resolves({ rows: [
      { key: [ 'training:form-a' ] },
      { key: [ 'training:form-b' ] },
    ]});
    clock = sinon.useFakeTimers(1653312565642); // 23/05/2022 20:29:25
    const xforms = [
      {
        _id: 'abc-789',
        internalId: 'training:form-a',
        start_date: 1653744565642, // 28/05/2022 20:29:25
      },
      {
        _id: 'abc-098',
        internalId: 'training:form-b',
        start_date: 1653139765642, // 21/05/2022 20:29:25
      },
      {
        _id: 'abc-098',
        internalId: 'training:form-c',
        start_date: 1653139765642, // 21/05/2022 20:29:25
      },
    ];
    service.initTrainingCards();

    expect(xmlFormsService.subscribe.calledOnce).to.be.true;
    expect(xmlFormsService.subscribe.args[0][0]).to.equal('TrainingCards');
    expect(xmlFormsService.subscribe.args[0][1]).to.deep.equal({ trainingForms: true, contactForms: false });
    const callback = xmlFormsService.subscribe.args[0][2];

    await callback(null, xforms);

    expect(sessionService.userCtx.calledOnce).to.be.true;
    expect(localDb.query.calledOnce).to.be.true;
    expect(localDb.query.args[0]).to.have.members([ 'medic-client/trainings_by_form' ]);
    expect(globalActions.setTrainingCard.calledOnce);
    expect(globalActions.setTrainingCard.args[0]).to.have.members([ 'training:form-c' ]);
    expect(modalService.show.calledOnce).to.be.true;
    expect(consoleErrorMock.callCount).to.equal(0);
  });

  it('should not show training form when all trainings are completed', async () => {
    sessionService.userCtx.returns({ roles: [] });
    localDb.query.resolves({ rows: [
      { key: [ 'training:form-a' ] },
      { key: [ 'training:form-b' ] },
      { key: [ 'training:form-c' ] },
    ]});
    clock = sinon.useFakeTimers(1653312565642); // 23/05/2022 20:29:25
    const xforms = [
      {
        _id: 'abc-123',
        internalId: 'training:form-a',
        start_date: 1653139765642, // 21/05/2022 20:29:25
        duration: 3
      },
      {
        _id: 'abc-456',
        internalId: 'training:form-b',
        start_date: 1652880565642, // 18/05/2022 20:29:25
        duration: 2
      },
      {
        _id: 'abc-098',
        internalId: 'training:form-c',
        start_date: 1653139765642, // 21/05/2022 20:29:25
        duration: 9
      },
    ];
    service.initTrainingCards();

    expect(xmlFormsService.subscribe.calledOnce).to.be.true;
    expect(xmlFormsService.subscribe.args[0][0]).to.equal('TrainingCards');
    expect(xmlFormsService.subscribe.args[0][1]).to.deep.equal({ trainingForms: true, contactForms: false });
    const callback = xmlFormsService.subscribe.args[0][2];

    await callback(null, xforms);

    expect(sessionService.userCtx.calledOnce).to.be.true;
    expect(localDb.query.calledOnce).to.be.true;
    expect(localDb.query.args[0]).to.have.members([ 'medic-client/trainings_by_form' ]);
    expect(globalActions.setTrainingCard.callCount).to.equal(0);
    expect(modalService.show.callCount).to.equal(0);
    expect(consoleErrorMock.callCount).to.equal(0);
  });

  it('should log error from xmlFormsService', async () => {
    service.initTrainingCards();

    expect(xmlFormsService.subscribe.calledOnce).to.be.true;
    expect(xmlFormsService.subscribe.args[0][0]).to.equal('TrainingCards');
    expect(xmlFormsService.subscribe.args[0][1]).to.deep.equal({ trainingForms: true, contactForms: false });
    const callback = xmlFormsService.subscribe.args[0][2];

    await callback(new Error('some error'), []);

    expect(localDb.query.callCount).to.equal(0);
    expect(sessionService.userCtx.callCount).to.equal(0);
    expect(globalActions.setTrainingCard.callCount).to.equal(0);
    expect(modalService.show.callCount).to.equal(0);
    expect(consoleErrorMock.calledOnce).to.be.true;
    expect(consoleErrorMock.args[0][0]).to.equal('Error fetching training cards.');
    expect(consoleErrorMock.args[0][1].message).to.equal('some error');
  });

  it('should catch exception', async () => {
    sessionService.userCtx.returns({ roles: [] });
    localDb.query.rejects(new Error('some error'));
    clock = sinon.useFakeTimers(1653312565642); // 23/05/2022 20:29:25
    const xforms = [{
      _id: 'abc-123',
      internalId: 'training:form-a',
      start_date: 1653139765642, // 21/05/2022 20:29:25
      duration: 3
    }];
    service.initTrainingCards();

    expect(xmlFormsService.subscribe.calledOnce).to.be.true;
    expect(xmlFormsService.subscribe.args[0][0]).to.equal('TrainingCards');
    expect(xmlFormsService.subscribe.args[0][1]).to.deep.equal({ trainingForms: true, contactForms: false });
    const callback = xmlFormsService.subscribe.args[0][2];

    await callback(null, xforms);

    expect(sessionService.userCtx.calledOnce).to.be.true;
    expect(localDb.query.callCount).to.equal(1);
    expect(globalActions.setTrainingCard.callCount).to.equal(0);
    expect(modalService.show.callCount).to.equal(0);
    expect(consoleErrorMock.calledOnce).to.be.true;
    expect(consoleErrorMock.args[0][0]).to.equal('Error showing training cards modal.');
    expect(consoleErrorMock.args[0][1].message).to.equal('some error');
  });

  it('should do nothing if there is another enketo form in the DOM', async () => {
    const divElement = document.createElement('div');
    divElement.setAttribute('id', 'enketo-test');
    divElement.className += 'enketo';
    document.body.appendChild(divElement);

    service.initTrainingCards();

    expect(sessionService.userCtx.callCount).to.equal(0);
    expect(xmlFormsService.subscribe.callCount).to.equal(0);
    expect(localDb.query.callCount).to.equal(0);
    expect(globalActions.setTrainingCard.callCount).to.equal(0);
    expect(modalService.show.callCount).to.equal(0);
    expect(consoleErrorMock.callCount).to.equal(0);
  });

  it('should do nothing if user is admin', async () => {
    sessionService.isDbAdmin.returns(true);

    service.initTrainingCards();

    expect(sessionService.userCtx.callCount).to.equal(0);
    expect(xmlFormsService.subscribe.callCount).to.equal(0);
    expect(localDb.query.callCount).to.equal(0);
    expect(globalActions.setTrainingCard.callCount).to.equal(0);
    expect(modalService.show.callCount).to.equal(0);
    expect(consoleErrorMock.callCount).to.equal(0);
  });

  it('should show uncompleted training form based on user role', async () => {
    sessionService.userCtx.returns({ roles: [ 'role_a' ] });
    localDb.query.resolves({ rows: [
      { key: [ 'training:form-b' ] },
    ]});
    clock = sinon.useFakeTimers(1653312565642); // 23/05/2022 20:29:25
    const xforms = [
      {
        _id: 'abc-123',
        internalId: 'training:form-a',
        start_date: 1653139765642, // 21/05/2022 20:29:25
        duration: 3,
        user_roles: [ 'role_b', 'role_c' ],
      },
      {
        _id: 'abc-456',
        internalId: 'training:form-b',
        start_date: 1652880565642, // 18/05/2022 20:29:25
        duration: 2,
        user_roles: [ 'role_a', 'role_c' ],
      },
      {
        _id: 'abc-789',
        internalId: 'training:form-c',
        start_date: 1653744565642, // 28/05/2022 20:29:25
        duration: 6,
        user_roles: [ 'role_a' ],
      },
      {
        _id: 'abc-098',
        internalId: 'training:form-d',
        start_date: 1653139765642, // 21/05/2022 20:29:25
        duration: 9,
        user_roles: [ 'role_a', 'role_c' ],
      },
    ];
    service.initTrainingCards();

    expect(xmlFormsService.subscribe.calledOnce).to.be.true;
    expect(xmlFormsService.subscribe.args[0][0]).to.equal('TrainingCards');
    expect(xmlFormsService.subscribe.args[0][1]).to.deep.equal({ trainingForms: true, contactForms: false });
    const callback = xmlFormsService.subscribe.args[0][2];

    await callback(null, xforms);

    expect(sessionService.userCtx.calledOnce).to.be.true;
    expect(localDb.query.calledOnce).to.be.true;
    expect(localDb.query.args[0]).to.have.members([ 'medic-client/trainings_by_form' ]);
    expect(globalActions.setTrainingCard.calledOnce);
    expect(globalActions.setTrainingCard.args[0]).to.have.members([ 'training:form-d' ]);
    expect(modalService.show.calledOnce).to.be.true;
    expect(consoleErrorMock.callCount).to.equal(0);
  });
});
