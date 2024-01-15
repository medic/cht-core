import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Router } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import sinon from 'sinon';
import { expect } from 'chai';

import { FastActionButtonService, IconType } from '@mm-services/fast-action-button.service';
import { AuthService } from '@mm-services/auth.service';
import { ResponsiveService } from '@mm-services/responsive.service';
import { TranslateService } from '@mm-services/translate.service';
import { TranslateFromService } from '@mm-services/translate-from.service';
import { ButtonType } from '@mm-components/fast-action-button/fast-action-button.component';
import { ReportsActions } from '@mm-actions/reports';

describe('Session service', () => {
  let service: FastActionButtonService;
  let router;
  let authService;
  let responsiveService;
  let translateService;
  let translateFromService;
  let documentMock;
  let domElement;

  beforeEach(() => {
    router = { navigate: sinon.stub() };
    authService = { has: sinon.stub() };
    responsiveService = { isMobile: sinon.stub() };
    translateService = { instant: sinon.stub().returnsArg(0) };
    translateFromService = { get: sinon.stub().returnsArg(0) };
    domElement = {
      click: sinon.stub(),
      remove: sinon.stub(),
    };
    documentMock = {
      createElement: sinon.stub().returns(domElement),
      querySelectorAll: sinon.stub().returns([]),
    };

    TestBed.configureTestingModule({
      providers: [
        provideMockStore(),
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: authService },
        { provide: ResponsiveService, useValue: responsiveService },
        { provide: TranslateService, useValue: translateService },
        { provide: TranslateFromService, useValue: translateFromService },
        { provide: DOCUMENT, useValue: documentMock},
      ],
    });
    service = TestBed.inject(FastActionButtonService);
  });

  afterEach(() => {
    sinon.restore();
  });

  const assertPhoneCallActionWithMailto = (action, context) => {
    expect(action.id).to.equal('phone-call');
    expect(action.labelKey).to.equal('fast_action_button.phone_call');
    expect(action.icon).to.deep.equal({ name: 'fa-phone', type: IconType.FONT_AWESOME });

    sinon.resetHistory();
    action.execute();

    expect(documentMock.createElement.calledOnce).to.be.true;
    expect(domElement.href).to.equal(`tel:${context.sendTo.phone}`);
    expect(domElement.click.calledOnce).to.be.true;
    expect(domElement.remove.calledOnce).to.be.true;
  };

  const assertSendMessageAction = (action, context) => {
    expect(action.id).to.equal('send-message');
    expect(action.labelKey).to.equal('fast_action_button.send_message');
    expect(action.icon).to.deep.equal({ name: 'fa-envelope', type: IconType.FONT_AWESOME });

    sinon.resetHistory();
    action.execute();

    expect(context.callbackOpenSendMessage.calledOnce).to.be.true;
    expect(context.callbackOpenSendMessage.args[0][0]).to.equal(context.sendTo._id);
    expect(documentMock.createElement.notCalled).to.be.true;
    expect(domElement.href).to.be.undefined;
    expect(domElement.click.notCalled).to.be.true;
    expect(domElement.remove.notCalled).to.be.true;
  };

  const assertSendMessageActionWithMailto = (action, context) => {
    expect(action.id).to.equal('send-message');
    expect(action.labelKey).to.equal('fast_action_button.send_message');
    expect(action.icon).to.deep.equal({ name: 'fa-envelope', type: IconType.FONT_AWESOME });

    sinon.resetHistory();
    action.execute();

    expect(context.callbackOpenSendMessage.notCalled).to.be.true;
    expect(documentMock.createElement.calledOnce).to.be.true;
    expect(domElement.href).to.equal(`sms:${context.sendTo.phone}`);
    expect(domElement.click.calledOnce).to.be.true;
    expect(domElement.remove.calledOnce).to.be.true;
  };

  const assertContactFormAction = (action, expectedAction) => {
    expect(action.id).to.equal(expectedAction.id);
    expect(action.label).to.equal(expectedAction.label);
    expect(action.icon).to.deep.equal({ name: expectedAction.icon, type: IconType.RESOURCE });

    sinon.resetHistory();
    action.execute();

    expect(router.navigate.calledOnce).to.be.true;
    expect(router.navigate.args[0][0]).to.have.members(expectedAction.route);
    expect(router.navigate.args[0][1]).to.deep.equal({ queryParams: expectedAction.queryParams });
  };

  const assertReportFormAction = (action, expectedAction, context?) => {
    expect(action.id).to.equal(expectedAction.id);
    expect(action.label).to.equal(expectedAction.label);
    expect(action.icon).to.deep.equal({ name: expectedAction.icon, type: IconType.RESOURCE });

    sinon.resetHistory();
    action.execute();

    if (expectedAction.route) {
      expect(router.navigate.calledOnce).to.be.true;
      expect(router.navigate.args[0][0]).to.have.members(expectedAction.route);
      return;
    }

    expect(context?.callbackContactReportModal.calledOnce).to.be.true;
    expect(context?.callbackContactReportModal.args[0][0]).to.deep.equal(expectedAction.form);
  };

  const assertUpdateFacilityAction = (action) => {
    const launchEditFacilityDialog = sinon.stub(ReportsActions.prototype, 'launchEditFacilityDialog');
    expect(action.id).to.equal('update-facility');
    expect(action.labelKey).to.equal('fast_action_button.update_facility');
    expect(action.icon).to.deep.equal({ name: 'fa-pencil', type: IconType.FONT_AWESOME });

    action.execute();
    expect(launchEditFacilityDialog.calledOnce).to.be.true;
  };

  it('should return the correct button type based on the current display', () => {
    responsiveService.isMobile.returns(false);
    expect(service.getButtonTypeForContentList()).to.equal(ButtonType.FLAT);

    responsiveService.isMobile.returns(true);
    expect(service.getButtonTypeForContentList()).to.equal(ButtonType.FAB);
  });

  describe('getMessageActions()', () => {
    it('should return Message tab actions when contact info is correct', async () => {
      const context = {
        sendTo: { _id: '1234', phone: '+2541234567890' },
        callbackOpenSendMessage: sinon.stub(),
      };
      authService.has.resolves(true);
      responsiveService.isMobile.returns(false);

      const actions = await service.getMessageActions(context);

      expect(actions.length).to.equal(1);
      expect(authService.has.args[0][0]).to.have.members([ 'can_view_message_action', 'can_edit' ]);
      assertSendMessageAction(actions[0], context);

      sinon.resetHistory();
      responsiveService.isMobile.returns(true);

      const mobileActions = await service.getMessageActions(context);

      expect(mobileActions.length).to.equal(1);
      expect(authService.has.args[0][0]).to.have.members([ 'can_view_message_action', 'can_edit' ]);
      // Message tab doesn't use mailto in mobile display, the action should be the same as in desktop
      assertSendMessageAction(actions[0], context);
    });

    it('should return Message tab actions when no phone provided', async () => {
      const context = {
        sendTo: { _id: '1234' },
        callbackOpenSendMessage: sinon.stub(),
      };
      authService.has.resolves(true);

      const actions = await service.getMessageActions(context);

      expect(actions.length).to.equal(1);
      expect(authService.has.args[0][0]).to.have.members([ 'can_view_message_action', 'can_edit' ]);
      assertSendMessageAction(actions[0], context);
    });
  });

  describe('getContactRightSideActions()', () => {
    it('should return all Contact tab\'s right side actions for desktop', async () => {
      const context = {
        parentFacilityId: 'parent-facility-1',
        childContactTypes: [
          { id: 'child-place-1', create_key: 'child-place-1-title', icon: 'child-place-1-icon' },
          { id: 'child-place-2', icon: 'child-place-2-icon' },
          { id: 'child-place-3', icon: 'child-place-3-icon', person: true },
        ],
        xmlReportForms: [
          { code: 'report-form-1', titleKey: 'report-form-1-title-key', icon: 'report-form-1-icon' },
          { code: 'report-form-2', title: 'report-form-2-title', icon: 'report-form-2-icon' },
          { code: 'report-form-3', icon: 'report-form-3-icon' },
        ],
        communicationContext: {
          sendTo: { _id: '1234', phone: '+2541234567890' },
          callbackOpenSendMessage: sinon.stub(),
        },
      };
      authService.has.resolves(true);
      responsiveService.isMobile.returns(false);

      const actions = await service.getContactRightSideActions(context);

      expect(actions.length).to.equal(7);
      expect(authService.has.args).to.have.deep.members([
        [ 'can_view_call_action' ],
        [ [ 'can_view_message_action', 'can_edit' ] ],
        [ [ 'can_edit', 'can_create_places' ] ],
        [ [ 'can_edit', 'can_create_places' ] ],
        [ [ 'can_edit', 'can_create_people' ] ],
        [ 'can_edit' ],
        [ 'can_edit' ],
        [ 'can_edit' ],
      ]);

      assertSendMessageAction(actions[0], context.communicationContext);
      assertContactFormAction(actions[1], {
        id: 'child-place-1',
        label: 'child-place-1-title',
        icon: 'child-place-1-icon',
        route: [ '/contacts', 'parent-facility-1', 'add', 'child-place-1' ],
        queryParams: null,
      });
      assertContactFormAction(actions[2], {
        id: 'child-place-2',
        label: 'child-place-2',
        icon: 'child-place-2-icon',
        route: [ '/contacts', 'parent-facility-1', 'add', 'child-place-2' ],
        queryParams: null,
      });
      assertContactFormAction(actions[3], {
        id: 'child-place-3',
        label: 'child-place-3',
        icon: 'child-place-3-icon',
        route: [ '/contacts', 'parent-facility-1', 'add', 'child-place-3' ],
        queryParams: null,
      });
      assertReportFormAction(actions[4], {
        id: 'report-form-1',
        label: 'report-form-1-title-key',
        icon: 'report-form-1-icon',
        route: [ '/reports', 'add', 'report-form-1' ],
      });
      assertReportFormAction(actions[5], {
        id: 'report-form-2',
        label: 'report-form-2-title',
        icon: 'report-form-2-icon',
        route: [ '/reports', 'add', 'report-form-2' ],
      });
      assertReportFormAction(actions[6], {
        id: 'report-form-3',
        label: 'report-form-3',
        icon: 'report-form-3-icon',
        route: [ '/reports', 'add', 'report-form-3' ],
      });
    });

    it('should return all Contact tab\'s right side actions for mobile', async () => {
      const context = {
        parentFacilityId: 'parent-facility-1',
        childContactTypes: [
          { id: 'child-place-1', create_key: 'child-place-1-title', icon: 'child-place-1-icon' },
          { id: 'child-place-2', icon: 'child-place-2-icon' },
          { id: 'child-place-3', icon: 'child-place-3-icon', person: true },
        ],
        xmlReportForms: [
          { code: 'report-form-1', titleKey: 'report-form-1-title-key', icon: 'report-form-1-icon' },
          { code: 'report-form-2', title: 'report-form-2-title', icon: 'report-form-2-icon' },
          { code: 'report-form-3', icon: 'report-form-3-icon' },
        ],
        communicationContext: {
          sendTo: { _id: '1234', phone: '+2541234567890' },
          callbackOpenSendMessage: sinon.stub(),
        },
      };
      authService.has.resolves(true);
      responsiveService.isMobile.returns(true);

      const actions = await service.getContactRightSideActions(context);

      expect(actions.length).to.equal(8);
      expect(authService.has.args).to.have.deep.members([
        [ 'can_view_call_action' ],
        [ [ 'can_view_message_action' ] ],
        [ [ 'can_edit', 'can_create_places' ] ],
        [ [ 'can_edit', 'can_create_places' ] ],
        [ [ 'can_edit', 'can_create_people' ] ],
        [ 'can_edit' ],
        [ 'can_edit' ],
        [ 'can_edit' ],
      ]);

      assertPhoneCallActionWithMailto(actions[0], context.communicationContext);
      assertSendMessageActionWithMailto(actions[1], context.communicationContext);
      assertContactFormAction(actions[2], {
        id: 'child-place-1',
        label: 'child-place-1-title',
        icon: 'child-place-1-icon',
        route: [ '/contacts', 'parent-facility-1', 'add', 'child-place-1' ],
        queryParams: null,
      });
      assertContactFormAction(actions[3], {
        id: 'child-place-2',
        label: 'child-place-2',
        icon: 'child-place-2-icon',
        route: [ '/contacts', 'parent-facility-1', 'add', 'child-place-2' ],
        queryParams: null,
      });
      assertContactFormAction(actions[4], {
        id: 'child-place-3',
        label: 'child-place-3',
        icon: 'child-place-3-icon',
        route: [ '/contacts', 'parent-facility-1', 'add', 'child-place-3' ],
        queryParams: null,
      });
      assertReportFormAction(actions[5], {
        id: 'report-form-1',
        label: 'report-form-1-title-key',
        icon: 'report-form-1-icon',
        route: [ '/reports', 'add', 'report-form-1' ],
      });
      assertReportFormAction(actions[6], {
        id: 'report-form-2',
        label: 'report-form-2-title',
        icon: 'report-form-2-icon',
        route: [ '/reports', 'add', 'report-form-2' ],
      });
      assertReportFormAction(actions[7], {
        id: 'report-form-3',
        label: 'report-form-3',
        icon: 'report-form-3-icon',
        route: [ '/reports', 'add', 'report-form-3' ],
      });
    });

    it('should not return phone call and send message actions if phone is not provided', async () => {
      const context = {
        parentFacilityId: 'parent-facility-1',
        communicationContext: {
          sendTo: { _id: '1234' },
          callbackOpenSendMessage: sinon.stub(),
        },
      };
      authService.has.resolves(true);
      responsiveService.isMobile.returns(true);

      const actions = await service.getContactRightSideActions(context);

      expect(actions.length).to.equal(0);
    });

    it('should not return actions if no permissions', async () => {
      const context = {
        parentFacilityId: 'parent-facility-1',
        childContactTypes: [
          { id: 'child-place-1', create_key: 'child-place-1-title', icon: 'child-place-1-icon' },
          { id: 'child-place-2', icon: 'child-place-2-icon' },
        ],
        xmlReportForms: [
          { code: 'report-form-1', titleKey: 'report-form-1-title-key', icon: 'report-form-1-icon' },
          { code: 'report-form-2', title: 'report-form-2-title', icon: 'report-form-2-icon' },
          { code: 'report-form-3', icon: 'report-form-3-icon' },
        ],
        communicationContext: {
          sendTo: { _id: '1234', phone: '+2541234567890' },
          callbackOpenSendMessage: sinon.stub(),
        },
      };
      authService.has.resolves(false);
      responsiveService.isMobile.returns(true);

      const actions = await service.getContactRightSideActions(context);

      expect(actions.length).to.equal(0);
      expect(authService.has.args).to.have.deep.members([
        [ 'can_view_call_action' ],
        [ [ 'can_view_message_action' ] ],
        [ [ 'can_edit', 'can_create_places' ] ],
        [ [ 'can_edit', 'can_create_places' ] ],
        [ 'can_edit' ],
        [ 'can_edit' ],
        [ 'can_edit' ],
      ]);
    });

    it('should build a correct route when parent ID is not provided', async () => {
      const context = {
        childContactTypes: [
          { id: 'place-1', create_key: 'place-1-title', icon: 'place-1-icon' },
          { id: 'place-2', icon: 'place-2-icon' },
        ],
        communicationContext: {
          sendTo: { _id: 'chw-1' },
          callbackOpenSendMessage: sinon.stub(),
        },
      };
      authService.has.resolves(true);

      const actions = await service.getContactRightSideActions(context);

      expect(actions.length).to.equal(2);
      expect(authService.has.args).to.have.deep.members([
        [ [ 'can_edit', 'can_create_places' ] ],
        [ [ 'can_edit', 'can_create_places' ] ],
      ]);
      assertContactFormAction(actions[0], {
        id: 'place-1',
        label: 'place-1-title',
        icon: 'place-1-icon',
        route: [ '/contacts', 'add', 'place-1' ],
        queryParams: null,
      });
      assertContactFormAction(actions[1], {
        id: 'place-2',
        label: 'place-2',
        icon: 'place-2-icon',
        route: [ '/contacts', 'add', 'place-2' ],
        queryParams: null,
      });
    });

    it('should call report modal when callback provided', async () => {
      const context = {
        xmlReportForms: [
          { code: 'report-form-1', titleKey: 'report-form-1-title-key', icon: 'report-form-1-icon' },
        ],
        callbackContactReportModal: sinon.stub(),
        communicationContext: {
          sendTo: { _id: '1234' },
          callbackOpenSendMessage: sinon.stub(),
        },
      };
      authService.has.resolves(true);
      responsiveService.isMobile.returns(false);

      const actions = await service.getContactRightSideActions(context);

      expect(actions.length).to.equal(1);
      expect(authService.has.args).to.have.deep.members([ [ 'can_edit' ] ]);
      assertReportFormAction(
        actions[0],
        {
          id: 'report-form-1',
          label: 'report-form-1-title-key',
          icon: 'report-form-1-icon',
          form: { code: 'report-form-1', titleKey: 'report-form-1-title-key', icon: 'report-form-1-icon' },
        },
        context,
      );
    });
  });

  describe('getContactLeftSideActions()', () => {
    it('should return all Contact tab\'s left side actions for desktop', async () => {
      const context = {
        parentFacilityId: 'parent-facility-1',
        childContactTypes: [
          { id: 'child-place-1', create_key: 'child-place-1-title', icon: 'child-place-1-icon' },
          { id: 'child-place-2', icon: 'child-place-2-icon' },
        ],
      };
      authService.has.resolves(true);
      responsiveService.isMobile.returns(false);

      const actions = await service.getContactLeftSideActions(context);

      expect(actions.length).to.equal(2);
      expect(authService.has.args).to.have.deep.members([
        [ [ 'can_edit', 'can_create_places' ] ],
        [ [ 'can_edit', 'can_create_places' ] ],
      ]);

      assertContactFormAction(actions[0], {
        id: 'child-place-1',
        label: 'child-place-1-title',
        icon: 'child-place-1-icon',
        route: [ '/contacts', 'parent-facility-1', 'add', 'child-place-1' ],
        queryParams: { from: 'list' },
      });
      assertContactFormAction(actions[1], {
        id: 'child-place-2',
        label: 'child-place-2',
        icon: 'child-place-2-icon',
        route: [ '/contacts', 'parent-facility-1', 'add', 'child-place-2' ],
        queryParams: { from: 'list' },
      });
    });

    it('should return all Contact tab\'s left side actions for mobile', async () => {
      const context = {
        parentFacilityId: 'parent-facility-1',
        childContactTypes: [
          { id: 'child-place-1', create_key: 'child-place-1-title', icon: 'child-place-1-icon' },
          { id: 'child-place-2', icon: 'child-place-2-icon' },
        ],
      };
      authService.has.resolves(true);
      responsiveService.isMobile.returns(true);

      const actions = await service.getContactLeftSideActions(context);

      expect(actions.length).to.equal(2);
      expect(authService.has.args).to.have.deep.members([
        [ [ 'can_edit', 'can_create_places' ] ],
        [ [ 'can_edit', 'can_create_places' ] ],
      ]);

      assertContactFormAction(actions[0], {
        id: 'child-place-1',
        label: 'child-place-1-title',
        icon: 'child-place-1-icon',
        route: [ '/contacts', 'parent-facility-1', 'add', 'child-place-1' ],
        queryParams: { from: 'list' },
      });
      assertContactFormAction(actions[1], {
        id: 'child-place-2',
        label: 'child-place-2',
        icon: 'child-place-2-icon',
        route: [ '/contacts', 'parent-facility-1', 'add', 'child-place-2' ],
        queryParams: { from: 'list' },
      });
    });

    it('should not return actions if no permissions', async () => {
      const context = {
        parentFacilityId: 'parent-facility-1',
        childContactTypes: [
          { id: 'child-place-1', create_key: 'child-place-1-title', icon: 'child-place-1-icon' },
          { id: 'child-place-2', icon: 'child-place-2-icon' },
        ],
      };
      authService.has.resolves(false);
      responsiveService.isMobile.returns(true);

      const actions = await service.getContactLeftSideActions(context);

      expect(actions.length).to.equal(0);
      expect(authService.has.args).to.have.deep.members([
        [ [ 'can_edit', 'can_create_places' ] ],
        [ [ 'can_edit', 'can_create_places' ] ],
      ]);
    });

    it('should build a correct route when parent ID is not provided', async () => {
      const context = {
        childContactTypes: [
          { id: 'place-1', create_key: 'place-1-title', icon: 'place-1-icon' },
          { id: 'place-2', icon: 'place-2-icon' },
        ],
      };
      authService.has.resolves(true);

      const actions = await service.getContactLeftSideActions(context);

      expect(actions.length).to.equal(2);
      expect(authService.has.args).to.have.deep.members([
        [ [ 'can_edit', 'can_create_places' ] ],
        [ [ 'can_edit', 'can_create_places' ] ],
      ]);
      assertContactFormAction(actions[0], {
        id: 'place-1',
        label: 'place-1-title',
        icon: 'place-1-icon',
        route: [ '/contacts', 'add', 'place-1' ],
        queryParams: { from: 'list' },
      });
      assertContactFormAction(actions[1], {
        id: 'place-2',
        label: 'place-2',
        icon: 'place-2-icon',
        route: [ '/contacts', 'add', 'place-2' ],
        queryParams: { from: 'list' },
      });
    });
  });

  describe('getReportLeftSideActions()', () => {
    it('should return all Report tab\'s left side actions for desktop', async () => {
      const context = {
        xmlReportForms: [
          { code: 'report-form-1', titleKey: 'report-form-1-title-key', icon: 'report-form-1-icon' },
          { code: 'report-form-2', title: 'report-form-2-title', icon: 'report-form-2-icon' },
          { code: 'report-form-3', icon: 'report-form-3-icon' },
        ],
      };
      authService.has.resolves(true);
      responsiveService.isMobile.returns(false);

      const actions = await service.getReportLeftSideActions(context);

      expect(actions.length).to.equal(3);
      expect(authService.has.args).to.have.deep.members([
        [ 'can_edit' ],
        [ 'can_edit' ],
        [ 'can_edit' ],
      ]);

      assertReportFormAction(actions[0], {
        id: 'report-form-1',
        label: 'report-form-1-title-key',
        icon: 'report-form-1-icon',
        route: [ '/reports', 'add', 'report-form-1' ],
      });
      assertReportFormAction(actions[1], {
        id: 'report-form-2',
        label: 'report-form-2-title',
        icon: 'report-form-2-icon',
        route: [ '/reports', 'add', 'report-form-2' ],
      });
      assertReportFormAction(actions[2], {
        id: 'report-form-3',
        label: 'report-form-3',
        icon: 'report-form-3-icon',
        route: [ '/reports', 'add', 'report-form-3' ],
      });
    });

    it('should return all Report tab\'s left side actions for mobile', async () => {
      const context = {
        xmlReportForms: [
          { code: 'report-form-1', titleKey: 'report-form-1-title-key', icon: 'report-form-1-icon' },
          { code: 'report-form-2', title: 'report-form-2-title', icon: 'report-form-2-icon' },
          { code: 'report-form-3', icon: 'report-form-3-icon' },
        ],
      };
      authService.has.resolves(true);
      responsiveService.isMobile.returns(true);

      const actions = await service.getReportLeftSideActions(context);

      expect(actions.length).to.equal(3);
      expect(authService.has.args).to.have.deep.members([
        [ 'can_edit' ],
        [ 'can_edit' ],
        [ 'can_edit' ],
      ]);

      assertReportFormAction(actions[0], {
        id: 'report-form-1',
        label: 'report-form-1-title-key',
        icon: 'report-form-1-icon',
        route: [ '/reports', 'add', 'report-form-1' ],
      });
      assertReportFormAction(actions[1], {
        id: 'report-form-2',
        label: 'report-form-2-title',
        icon: 'report-form-2-icon',
        route: [ '/reports', 'add', 'report-form-2' ],
      });
      assertReportFormAction(actions[2], {
        id: 'report-form-3',
        label: 'report-form-3',
        icon: 'report-form-3-icon',
        route: [ '/reports', 'add', 'report-form-3' ],
      });
    });

    it('should not return actions if no permissions', async () => {
      const context = {
        xmlReportForms: [
          { code: 'report-form-1', titleKey: 'report-form-1-title-key', icon: 'report-form-1-icon' },
          { code: 'report-form-2', title: 'report-form-2-title', icon: 'report-form-2-icon' },
          { code: 'report-form-3', icon: 'report-form-3-icon' },
        ],
      };
      authService.has.resolves(false);
      responsiveService.isMobile.returns(true);

      const actions = await service.getReportLeftSideActions(context);

      expect(actions.length).to.equal(0);
      expect(authService.has.args).to.have.deep.members([
        [ 'can_edit' ],
        [ 'can_edit' ],
        [ 'can_edit' ],
      ]);
    });
  });

  describe('getReportRightSideActions()', () => {
    it('should return all Report tab\'s right side actions for desktop', async () => {
      const context = {
        reportContentType: 'other',
        communicationContext: {
          sendTo: { _id: '1234', phone: '+2541234567890' },
          callbackOpenSendMessage: sinon.stub(),
        },
      };
      authService.has.resolves(true);
      responsiveService.isMobile.returns(false);

      const actions = await service.getReportRightSideActions(context);

      expect(actions.length).to.equal(2);
      expect(authService.has.args).to.have.deep.members([
        [ [ 'can_view_message_action', 'can_edit' ] ],
        [ 'can_edit' ],
      ]);

      assertSendMessageAction(actions[0], context.communicationContext);
      assertUpdateFacilityAction(actions[1]);
    });

    it('should return all Report tab\'s right side actions for mobile', async () => {
      const context = {
        reportContentType: 'other',
        communicationContext: {
          sendTo: { _id: '1234', phone: '+2541234567890' },
          callbackOpenSendMessage: sinon.stub(),
        },
      };
      authService.has.resolves(true);
      responsiveService.isMobile.returns(true);

      const actions = await service.getReportRightSideActions(context);

      expect(actions.length).to.equal(2);
      expect(authService.has.args).to.have.deep.members([
        [ [ 'can_view_message_action' ] ],
        [ 'can_edit' ],
      ]);

      assertSendMessageActionWithMailto(actions[0], context.communicationContext);
      assertUpdateFacilityAction(actions[1]);
    });

    it('should not return send message action if phone is not provided', async () => {
      const context = {
        reportContentType: 'other',
        communicationContext: {
          sendTo: { _id: '1234' },
          callbackOpenSendMessage: sinon.stub(),
        },
      };
      authService.has.resolves(true);
      responsiveService.isMobile.returns(true);

      const actions = await service.getReportRightSideActions(context);

      expect(actions.length).to.equal(1);
      expect(authService.has.args).to.have.deep.members([
        [ 'can_edit' ],
      ]);

      assertUpdateFacilityAction(actions[0]);
    });

    it('should not return actions if no permissions', async () => {
      const context = {
        reportContentType: 'other',
        communicationContext: {
          sendTo: { _id: '1234', phone: '+2541234567890' },
          callbackOpenSendMessage: sinon.stub(),
        },
      };
      authService.has.resolves(false);
      responsiveService.isMobile.returns(false);

      const actions = await service.getReportRightSideActions(context);

      expect(actions.length).to.equal(0);
      expect(authService.has.args).to.have.deep.members([
        [ [ 'can_view_message_action', 'can_edit' ] ],
        [ 'can_edit' ],
      ]);
    });

    it('should not return update facility action if report is xml', async () => {
      const context = {
        reportContentType: 'xml',
        communicationContext: {
          sendTo: { _id: '1234', phone: '+2541234567890' },
          callbackOpenSendMessage: sinon.stub(),
        },
      };
      authService.has.resolves(true);
      responsiveService.isMobile.returns(false);

      const actions = await service.getReportRightSideActions(context);

      expect(actions.length).to.equal(1);
      expect(authService.has.args).to.have.deep.members([
        [ [ 'can_view_message_action', 'can_edit' ] ],
      ]);

      assertSendMessageAction(actions[0], context.communicationContext);
    });
  });
});
