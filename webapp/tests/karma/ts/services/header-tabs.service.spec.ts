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

  describe('getAuthorizedTabs()', () => {
    it('should return authorized tabs', async () => {
      authService.has.withArgs(['can_view_messages', 'can_view_messages_tab']).returns(true);
      authService.has.withArgs(['can_view_tasks', 'can_view_tasks_tab']).returns(false);
      authService.has.withArgs(['can_view_reports', 'can_view_reports_tab']).returns(true);
      authService.has.withArgs(['can_view_contacts', 'can_view_contacts_tab']).returns(false);
      authService.has.withArgs(['can_view_analytics', 'can_view_analytics_tab']).returns(true);

      const tabs = await service.getAuthorizedTabs();

      expect(tabs).to.deep.equal([
        {
          name: 'messages',
          route: 'messages',
          defaultIcon: 'fa-envelope',
          translation: 'Messages',
          permissions: ['can_view_messages', 'can_view_messages_tab'],
          typeName: 'message',
          icon: undefined,
          resourceIcon: undefined,
        },
        {
          name: 'reports',
          route: 'reports',
          defaultIcon: 'fa-list-alt',
          translation: 'Reports',
          permissions: ['can_view_reports', 'can_view_reports_tab'],
          typeName: 'report',
          icon: undefined,
          resourceIcon: undefined,
        },
        {
          name: 'analytics',
          route: 'analytics',
          defaultIcon: 'fa-bar-chart-o',
          translation: 'Analytics',
          permissions: ['can_view_analytics', 'can_view_analytics_tab'],
          icon: undefined,
          resourceIcon: undefined,
        }
      ]);
    });

    it('should return empty array if there arent authorized tabs', async () => {
      authService.has.returns(false);

      const tabs = await service.getAuthorizedTabs();

      expect(tabs).to.deep.equal([]);
    });
  });

  describe('getFirstAuthorizedTab()', () => {
    it('should return first tab from the authorized ones', async () => {
      authService.has.withArgs(['can_view_messages', 'can_view_messages_tab']).returns(true);
      authService.has.withArgs(['can_view_tasks', 'can_view_tasks_tab']).returns(false);
      authService.has.withArgs(['can_view_reports', 'can_view_reports_tab']).returns(true);
      authService.has.withArgs(['can_view_contacts', 'can_view_contacts_tab']).returns(false);
      authService.has.withArgs(['can_view_analytics', 'can_view_analytics_tab']).returns(true);

      const tab = await service.getFirstAuthorizedTab();

      expect(tab).to.deep.equal({
        name: 'messages',
        route: 'messages',
        defaultIcon: 'fa-envelope',
        translation: 'Messages',
        permissions: ['can_view_messages', 'can_view_messages_tab'],
        typeName: 'message',
        icon: undefined,
        resourceIcon: undefined,
      });
    });

    it('should return undefined if there arent authorized tabs', async () => {
      authService.has.returns(false);

      const tab = await service.getFirstAuthorizedTab();

      expect(tab).to.be.undefined;
    });
  });
});
