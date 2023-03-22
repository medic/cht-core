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

describe.only('Session service', () => {
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
    expect(router.navigate.args[0][1]).to.deep.equal({ queryParams: { from: 'list' } });
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
          {
            id: 'child-place-1',
            create_key: 'child-place-1-title',
            icon: 'child-place-1-icon'
          },
          {
            id: 'child-place-2',
            icon: 'child-place-2-icon'
          }
        ],
        xmlReportForms: [

        ],
        callbackContactReportModal: sinon.stub(),
        communicationContext: {
          sendTo: { _id: '1234', phone: '+2541234567890' },
          callbackOpenSendMessage: sinon.stub(),
        },
      };
      authService.has.resolves(true);
      responsiveService.isMobile.returns(false);

      const actions = await service.getContactRightSideActions(context);

      expect(actions.length).to.equal(3);
      expect(authService.has.args[0][0]).to.equal('can_view_call_action');
      expect(authService.has.args[1][0]).to.have.members([ 'can_view_message_action', 'can_edit' ]);
      expect(authService.has.args[2][0]).to.have.members([ 'can_edit', 'can_create_places' ]);
      assertSendMessageAction(actions[0], context.communicationContext);
      assertContactFormAction(actions[1], {
        id: 'child-place-1',
        label: 'child-place-1-title',
        icon: 'child-place-1-icon',
        route: ['/contacts', 'parent-facility-1', 'add', 'child-place-1'],
      });
      assertContactFormAction(actions[2], {
        id: 'child-place-2',
        label: 'child-place-2',
        icon: 'child-place-2-icon',
        route: ['/contacts', 'parent-facility-1', 'add', 'child-place-2'],
      });
    });

    it('should return all Contact tab\'s right side actions for mobile', async () => {
      const context = {
        parentFacilityId: 'parent-facility-1',
        childContactTypes: [

        ],
        xmlReportForms: [

        ],
        callbackContactReportModal: sinon.stub(),
        communicationContext: {
          sendTo: { _id: '1234', phone: '+2541234567890' },
          callbackOpenSendMessage: sinon.stub(),
        },
      };
      authService.has.resolves(true);
      responsiveService.isMobile.returns(true);

      const actions = await service.getContactRightSideActions(context);

      expect(actions.length).to.equal(2);
      expect(authService.has.args[0][0]).to.equal('can_view_call_action');
      expect(authService.has.args[1][0]).to.have.members([ 'can_view_message_action' ]);
      assertPhoneCallActionWithMailto(actions[0], context.communicationContext);
      assertSendMessageActionWithMailto(actions[1], context.communicationContext);
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
        communicationContext: {
          sendTo: { _id: '1234', phone: '+2541234567890' },
          callbackOpenSendMessage: sinon.stub(),
        },
      };
      authService.has.resolves(false);
      responsiveService.isMobile.returns(true);

      const actions = await service.getContactRightSideActions(context);

      expect(actions.length).to.equal(0);
      expect(authService.has.args[0][0]).to.equal('can_view_call_action');
      expect(authService.has.args[1][0]).to.have.members([ 'can_view_message_action' ]);
    });
  });

});
