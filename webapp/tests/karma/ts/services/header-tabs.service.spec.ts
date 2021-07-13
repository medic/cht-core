import { TestBed } from '@angular/core/testing';
import * as chai from 'chai';
import { expect } from 'chai';
import sinon from 'sinon';
chai.use(require('chai-shallow-deep-equal'));

import { HeaderTabsService } from '@mm-services/header-tabs.service';
import { AuthService } from '@mm-services/auth.service';

describe('HeaderTabs service', () => {
  let service:HeaderTabsService;
  let authService;

  beforeEach(() => {
    authService = { has: sinon.stub() };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService }
      ]
    });
    service = TestBed.inject(HeaderTabsService);
  });

  afterEach(() => sinon.restore());

  describe('get()', () => {
    it('returns default tabs when settings not provided', () => {
      const tabs = service.get();
      // @ts-ignore
      expect(tabs).to.shallowDeepEqual([
        { name: 'messages', defaultIcon: 'fa-envelope', icon: undefined },
        { name: 'tasks', defaultIcon: 'fa-flag', icon: undefined },
        { name: 'reports', defaultIcon: 'fa-list-alt', icon: undefined },
        { name: 'contacts', defaultIcon: 'fa-user', icon: undefined },
        { name: 'analytics', defaultIcon: 'fa-bar-chart-o', icon: undefined },
      ]);

      expect(service.get({})).to.deep.equal(tabs);
      expect(service.get({ key: 'value' })).to.deep.equal(tabs);
      expect(service.get({ header_tabs: {} })).to.deep.equal(tabs);
    });

    it('should replace icons when provided', () => {
      const headerTabsSettings = {
        tasks: { icon: 'fa-whatever' },
        reports: { resource_icon: 'some-icon' },
        analytics: { resource_icon: 'other-icon', icon: 'fa-icon' },
        contacts: { resource_icon: 'one-icon', icon: 'not-fa-icon' },
      };

      const tabs = service.get({ header_tabs: headerTabsSettings });
      // @ts-ignore
      expect(tabs).to.shallowDeepEqual([
        { name: 'messages', icon: undefined, resourceIcon: undefined, defaultIcon: 'fa-envelope' },
        { name: 'tasks', icon: 'fa-whatever', resourceIcon: undefined, defaultIcon: 'fa-flag' },
        { name: 'reports', icon: undefined, resourceIcon: 'some-icon', defaultIcon: 'fa-list-alt' },
        { name: 'contacts', icon: undefined, resourceIcon: 'one-icon', defaultIcon: 'fa-user' },
        { name: 'analytics', icon: 'fa-icon', resourceIcon: 'other-icon', defaultIcon: 'fa-bar-chart-o' },
      ]);
    });
  });

  describe('canAccessTab()', () => {
    it('should resolve if tab is found', async () => {
      authService.has.resolves(true);

      const messagesTab = await service.canAccessTab('messages');
      const tasksTab = await service.canAccessTab('tasks');
      const reportsTab = await service.canAccessTab('reports');
      const contactsTab = await service.canAccessTab('contacts');
      const analyticsTab = await service.canAccessTab('analytics');

      expect(messagesTab).to.be.true;
      expect(authService.has.callCount).to.equal(5);
      expect(authService.has.args[0]).to.deep.equal([['can_view_messages', 'can_view_messages_tab']]);
      expect(tasksTab).to.be.true;
      expect(authService.has.args[1]).to.deep.equal([['can_view_tasks', 'can_view_tasks_tab']]);
      expect(reportsTab).to.be.true;
      expect(authService.has.args[2]).to.deep.equal([['can_view_reports', 'can_view_reports_tab']]);
      expect(contactsTab).to.be.true;
      expect(authService.has.args[3]).to.deep.equal([['can_view_contacts', 'can_view_contacts_tab']]);
      expect(analyticsTab).to.be.true;
      expect(authService.has.args[4]).to.deep.equal([['can_view_analytics', 'can_view_analytics_tab']]);
    });

    it('should reject if tab is not found', async () => {
      authService.has.resolves(true);

      const undefinedTab = await service
        .canAccessTab(null)
        .catch(error => {
          const expectedError = 'HeaderTabsService :: Tab \'null\' not found, cannot determine tab permissions.';
          expect(error.message).to.equal(expectedError);
        });

      const unknownTab = await service
        .canAccessTab('abc')
        .catch(error => {
          const expectedError = 'HeaderTabsService :: Tab \'abc\' not found, cannot determine tab permissions.';
          expect(error.message).to.equal(expectedError);
        });

      expect(undefinedTab).to.not.be.true;
      expect(unknownTab).to.not.be.true;
    });
  });
});
