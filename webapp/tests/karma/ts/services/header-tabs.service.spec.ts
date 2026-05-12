import { TestBed } from '@angular/core/testing';
import { expect } from 'chai';
import sinon from 'sinon';

import { HeaderTabsService } from '@mm-services/header-tabs.service';
import { AuthService } from '@mm-services/auth.service';
import { SettingsService } from '@mm-services/settings.service';
import { UiExtensionsService } from '@mm-services/ui-extensions.service';

describe('HeaderTabs service', () => {
  let service: HeaderTabsService;
  let authService;
  let settingsService;
  let uiExtensionsService;

  beforeEach(() => {
    authService = { has: sinon.stub().returns(true) };
    settingsService = { get: sinon.stub().resolves({}) };
    uiExtensionsService = { getPropertiesByType: sinon.stub().resolves([]) };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: SettingsService, useValue: settingsService },
        { provide: UiExtensionsService, useValue: uiExtensionsService },
      ]
    });

    service = TestBed.inject(HeaderTabsService);
  });

  afterEach(() => sinon.restore());

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
          weight: 1,
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
          weight: 3,
        },
        {
          name: 'analytics',
          route: 'analytics',
          defaultIcon: 'fa-bar-chart-o',
          translation: 'Analytics',
          permissions: ['can_view_analytics', 'can_view_analytics_tab'],
          icon: undefined,
          resourceIcon: undefined,
          weight: 5,
        }
      ]);
    });

    it('should return empty array if there arent authorized tabs', async () => {
      authService.has.returns(false);

      const tabs = await service.getAuthorizedTabs();

      expect(tabs).to.deep.equal([]);
    });

    it('should return default tabs when settings have no header_tabs config', async () => {
      settingsService.get.resolves({ key: 'value' });
      authService.has.withArgs(['can_view_messages', 'can_view_messages_tab']).returns(false);
      authService.has.withArgs(['can_view_tasks', 'can_view_tasks_tab']).returns(true);
      authService.has.withArgs(['can_view_reports', 'can_view_reports_tab']).returns(false);
      authService.has.withArgs(['can_view_contacts', 'can_view_contacts_tab']).returns(true);
      authService.has.withArgs(['can_view_analytics', 'can_view_analytics_tab']).returns(true);

      const tabs = await service.getAuthorizedTabs();

      expect(tabs).to.deep.equal([
        {
          name: 'tasks',
          route: 'tasks',
          defaultIcon: 'fa-flag',
          translation: 'Tasks',
          permissions: ['can_view_tasks', 'can_view_tasks_tab'],
          typeName: 'task',
          icon: undefined,
          resourceIcon: undefined,
          weight: 2,
        },
        {
          name: 'contacts',
          route: 'contacts',
          defaultIcon: 'fa-user',
          translation: 'Contacts',
          permissions: ['can_view_contacts', 'can_view_contacts_tab'],
          icon: undefined,
          resourceIcon: undefined,
          weight: 4,
        },
        {
          name: 'analytics',
          route: 'analytics',
          defaultIcon: 'fa-bar-chart-o',
          translation: 'Analytics',
          permissions: ['can_view_analytics', 'can_view_analytics_tab'],
          icon: undefined,
          resourceIcon: undefined,
          weight: 5,
        }
      ]);
    });

    it('should include typeName property for tabs that need bubble counters', async () => {
      const tabs = await service.getAuthorizedTabs();

      const messagesTab = tabs.find(tab => tab.name === 'messages');
      expect(messagesTab).to.exist;
      expect(messagesTab!.typeName).to.equal('message');

      const tasksTab = tabs.find(tab => tab.name === 'tasks');
      expect(tasksTab).to.exist;
      expect(tasksTab!.typeName).to.equal('task');

      const reportsTab = tabs.find(tab => tab.name === 'reports');
      expect(reportsTab).to.exist;
      expect(reportsTab!.typeName).to.equal('report');

      const contactsTab = tabs.find(tab => tab.name === 'contacts');
      expect(contactsTab).to.exist;
      expect(contactsTab!.typeName).to.be.undefined;

      const analyticsTab = tabs.find(tab => tab.name === 'analytics');
      expect(analyticsTab).to.exist;
      expect(analyticsTab!.typeName).to.be.undefined;
    });

    it('should replace icons and weight from settings when provided', async () => {
      settingsService.get.resolves({
        header_tabs: {
          messages: { resource_icon: 'pomegranate-icon', weight: 10 },
          tasks: { icon: 'fa-apple' },
          contacts: { resource_icon: 'pear-icon', icon: 'not-fa-pear-icon' },
          reports: { resource_icon: 'pineapple-icon', icon: 'not-fa-pineapple-icon' },
          analytics: { resource_icon: 'mango-icon', icon: 'fa-mango-icon', weight: 9 },
        }
      });
      authService.has.withArgs(['can_view_messages', 'can_view_messages_tab']).returns(true);
      authService.has.withArgs(['can_view_tasks', 'can_view_tasks_tab']).returns(true);
      authService.has.withArgs(['can_view_reports', 'can_view_reports_tab']).returns(false);
      authService.has.withArgs(['can_view_contacts', 'can_view_contacts_tab']).returns(true);
      authService.has.withArgs(['can_view_analytics', 'can_view_analytics_tab']).returns(true);

      const tabs = await service.getAuthorizedTabs();

      expect(tabs).to.deep.equal([
        {
          name: 'tasks',
          route: 'tasks',
          defaultIcon: 'fa-flag',
          translation: 'Tasks',
          permissions: ['can_view_tasks', 'can_view_tasks_tab'],
          typeName: 'task',
          icon: 'fa-apple',
          resourceIcon: undefined,
          weight: 2,
        },
        {
          name: 'contacts',
          route: 'contacts',
          defaultIcon: 'fa-user',
          translation: 'Contacts',
          permissions: ['can_view_contacts', 'can_view_contacts_tab'],
          icon: undefined,
          resourceIcon: 'pear-icon',
          weight: 4,
        },
        {
          name: 'analytics',
          route: 'analytics',
          defaultIcon: 'fa-bar-chart-o',
          translation: 'Analytics',
          permissions: ['can_view_analytics', 'can_view_analytics_tab'],
          icon: 'fa-mango-icon',
          resourceIcon: 'mango-icon',
          weight: 9,
        },
        {
          name: 'messages',
          route: 'messages',
          defaultIcon: 'fa-envelope',
          translation: 'Messages',
          permissions: ['can_view_messages', 'can_view_messages_tab'],
          typeName: 'message',
          icon: undefined,
          resourceIcon: 'pomegranate-icon',
          weight: 10,
        },
      ]);

      it('should include UI extension tabs', async () => {
        authService.has.returns(true);
        uiExtensionsService.getPropertiesByType
          .withArgs('header_tab')
          .resolves([
            { id: 'first', title: 'First Extension', icon: 'fa-icon-1', resource_icon: 'res-1', weight: 0.5 },
            { id: 'middle', title: 'Middle Extension', icon: 'fa-icon-3' },
            { id: 'last', title: 'Last Extension', resource_icon: 'res-2' },
          ]);

        const tabs = await service.getAuthorizedTabs();

        expect(tabs.map(t => t.name)).to.deep.equal([
          'messages',
          'tasks',
          'reports',
          'contacts',
          'analytics',
          'ui-extension-first',
          'ui-extension-middle',
          'ui-extension-last',
        ]);

        const [firstExt,,,,,, middleExt, lastExt] = tabs;
        expect(firstExt).to.deep.equal({
          name: 'ui-extension-first',
          route: 'ui-extensions/first',
          defaultIcon: 'fa-question-circle',
          translation: 'First Extension',
          permissions: [],
          icon: 'fa-icon-1',
          resourceIcon: 'res-1',
          weight: 0.5,
        });
        expect(middleExt).to.deep.equal({
          name: 'ui-extension-middle',
          route: 'ui-extensions/middle',
          defaultIcon: 'fa-question-circle',
          translation: 'Middle Extension',
          permissions: [],
          icon: 'fa-icon-3',
          resourceIcon: undefined,
          weight: 6,
        });
        expect(lastExt).to.deep.equal({
          name: 'ui-extension-last',
          route: 'ui-extensions/last',
          defaultIcon: 'fa-question-circle',
          translation: 'Last Extension',
          permissions: [],
          icon: undefined,
          resourceIcon: 'res-2',
          weight: 6,
        });
      });

      it('should include UI extensions even when no default tabs are authorized', async () => {
        authService.has.returns(false);
        uiExtensionsService.getPropertiesByType.withArgs('header_tab').resolves([
          { id: 'ext', title: 'Extension', icon: 'fa-icon' },
        ]);

        const tabs = await service.getAuthorizedTabs();

        expect(tabs).to.deep.equal([
          {
            name: 'ui-extension-ext',
            route: 'ui-extensions/ext',
            defaultIcon: 'fa-question-circle',
            translation: 'Extension',
            permissions: [],
            icon: 'fa-icon',
            resourceIcon: undefined,
            weight: 6,
          }
        ]);
        expect(authService.has.callCount).to.equal(5);
      });
    });

    it('should cache tabs after first call', async () => {
      await service.getAuthorizedTabs();
      const tabs = await service.getAuthorizedTabs();
      await service.getAuthorizedTabs();

      expect(settingsService.get.callCount).to.equal(1);
      expect(uiExtensionsService.getPropertiesByType.callCount).to.equal(1);
      expect(tabs).to.have.length(5);
    });
  });

  describe('getPrimaryTab()', () => {
    it('should return the primary tab from the authorized ones', async () => {
      authService.has.withArgs(['can_view_messages', 'can_view_messages_tab']).returns(true);
      authService.has.withArgs(['can_view_tasks', 'can_view_tasks_tab']).returns(false);
      authService.has.withArgs(['can_view_reports', 'can_view_reports_tab']).returns(true);
      authService.has.withArgs(['can_view_contacts', 'can_view_contacts_tab']).returns(false);
      authService.has.withArgs(['can_view_analytics', 'can_view_analytics_tab']).returns(true);

      const tab = await service.getPrimaryTab();

      expect(tab).to.deep.equal({
        name: 'messages',
        route: 'messages',
        defaultIcon: 'fa-envelope',
        translation: 'Messages',
        permissions: ['can_view_messages', 'can_view_messages_tab'],
        typeName: 'message',
        icon: undefined,
        resourceIcon: undefined,
        weight: 1,
      });
    });

    it('should return the primary tab when it is not the first tab from the original list', async () => {
      authService.has.withArgs(['can_view_messages', 'can_view_messages_tab']).returns(false);
      authService.has.withArgs(['can_view_tasks', 'can_view_tasks_tab']).returns(false);
      authService.has.withArgs(['can_view_reports', 'can_view_reports_tab']).returns(true);
      authService.has.withArgs(['can_view_contacts', 'can_view_contacts_tab']).returns(false);
      authService.has.withArgs(['can_view_analytics', 'can_view_analytics_tab']).returns(true);

      const tab = await service.getPrimaryTab();

      expect(tab).to.deep.equal({
        name: 'reports',
        route: 'reports',
        defaultIcon: 'fa-list-alt',
        translation: 'Reports',
        permissions: ['can_view_reports', 'can_view_reports_tab'],
        typeName: 'report',
        icon: undefined,
        resourceIcon: undefined,
        weight: 3,
      });
    });

    it('should return undefined if there arent authorized tabs', async () => {
      authService.has.returns(false);

      const tab = await service.getPrimaryTab();

      expect(tab).to.be.undefined;
    });

    it('should return default tab when settings have no header_tabs config', async () => {
      authService.has.withArgs(['can_view_messages', 'can_view_messages_tab']).returns(false);
      authService.has.withArgs(['can_view_tasks', 'can_view_tasks_tab']).returns(false);
      authService.has.withArgs(['can_view_reports', 'can_view_reports_tab']).returns(false);
      authService.has.withArgs(['can_view_contacts', 'can_view_contacts_tab']).returns(true);
      authService.has.withArgs(['can_view_analytics', 'can_view_analytics_tab']).returns(true);

      const tab = await service.getPrimaryTab();

      expect(tab).to.deep.equal({
        name: 'contacts',
        route: 'contacts',
        defaultIcon: 'fa-user',
        translation: 'Contacts',
        permissions: ['can_view_contacts', 'can_view_contacts_tab'],
        icon: undefined,
        resourceIcon: undefined,
        weight: 4,
      });
    });

    it('should replace icons from settings when provided', async () => {
      settingsService.get.resolves({
        header_tabs: {
          messages: { resource_icon: 'pomegranate-icon' },
          tasks: { icon: 'fa-apple' },
          contacts: { resource_icon: 'pear-icon', icon: 'not-fa-pear-icon' },
          reports: { resource_icon: 'pineapple-icon', icon: 'not-fa-pineapple-icon' },
          analytics: { resource_icon: 'mango-icon', icon: 'fa-mango-icon' },
        }
      });
      authService.has.withArgs(['can_view_messages', 'can_view_messages_tab']).returns(false);
      authService.has.withArgs(['can_view_tasks', 'can_view_tasks_tab']).returns(false);
      authService.has.withArgs(['can_view_reports', 'can_view_reports_tab']).returns(false);
      authService.has.withArgs(['can_view_contacts', 'can_view_contacts_tab']).returns(false);
      authService.has.withArgs(['can_view_analytics', 'can_view_analytics_tab']).returns(true);

      const tab = await service.getPrimaryTab();

      expect(tab).to.deep.equal({
        name: 'analytics',
        route: 'analytics',
        defaultIcon: 'fa-bar-chart-o',
        translation: 'Analytics',
        permissions: ['can_view_analytics', 'can_view_analytics_tab'],
        icon: 'fa-mango-icon',
        resourceIcon: 'mango-icon',
        weight: 5,
      });
    });

    it('should return UI extension tab as primary when no default tabs are authorized', async () => {
      authService.has.returns(false);
      uiExtensionsService.getPropertiesByType.withArgs('header_tab').resolves([
        { id: 'ext', title: 'Extension', icon: 'fa-icon' },
      ]);

      const tab = await service.getPrimaryTab();

      expect(tab).to.deep.equal({
        name: 'ui-extension-ext',
        route: 'ui-extensions/ext',
        defaultIcon: 'fa-question-circle',
        translation: 'Extension',
        permissions: [],
        icon: 'fa-icon',
        resourceIcon: undefined,
        weight: 6,
      });
    });

    it('should return UI extension tab as primary when it has the lowest weight', async () => {
      authService.has.returns(true);
      uiExtensionsService.getPropertiesByType.withArgs('header_tab').resolves([
        { id: 'ext', title: 'Extension', icon: 'fa-icon', weight: 0.5 },
      ]);

      const tab = await service.getPrimaryTab();

      expect(tab).to.deep.equal({
        name: 'ui-extension-ext',
        route: 'ui-extensions/ext',
        defaultIcon: 'fa-question-circle',
        translation: 'Extension',
        permissions: [],
        icon: 'fa-icon',
        resourceIcon: undefined,
        weight: 0.5,
      });
    });
  });
});
