import { Injectable } from '@angular/core';

import { AuthService } from '@mm-services/auth.service';
import { UiExtensionsService } from '@mm-services/ui-extensions.service';

@Injectable({
  providedIn: 'root'
})
export class HeaderTabsService {
  constructor(
    private readonly authService: AuthService,
    private readonly uiExtensionsService: UiExtensionsService
  ) { }

  private readonly tabs: HeaderTab[] = [
    {
      name: 'messages',
      route: 'messages',
      defaultIcon: 'fa-envelope',
      translation: 'Messages',
      permissions: ['can_view_messages', 'can_view_messages_tab'],
      typeName: 'message',
      icon: undefined,
      resourceIcon: undefined,
      weight: 0,
    },
    {
      name: 'tasks',
      route: 'tasks',
      defaultIcon: 'fa-flag',
      translation: 'Tasks',
      permissions: ['can_view_tasks', 'can_view_tasks_tab'],
      typeName: 'task',
      icon: undefined,
      resourceIcon: undefined,
      weight: 10,
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
      weight: 20,
    },
    {
      name: 'contacts',
      route: 'contacts',
      defaultIcon: 'fa-user',
      translation: 'Contacts',
      permissions: ['can_view_contacts', 'can_view_contacts_tab'],
      icon: undefined,
      resourceIcon: undefined,
      weight: 30,
    },
    {
      name: 'analytics',
      route: 'analytics',
      defaultIcon: 'fa-bar-chart-o',
      translation: 'Analytics',
      permissions: ['can_view_analytics', 'can_view_analytics_tab'],
      icon: undefined,
      resourceIcon: undefined,
      weight: 40,
    }
  ];

  /**
   * Returns the list of header tabs.
   * If settings are passed as parameter, then it will add the tab.icon and tab.resourceIcon when available.
   *
   * @param settings {Object} Settings of CHT-Core instance.
   *
   * @returns HeaderTab[]
   */
  get(settings?): HeaderTab[] {
    const tabs = this.tabs.map(tab => ({ ...tab }));
    if (!settings?.header_tabs) {
      return tabs;
    }

    tabs.forEach(tab => {
      if (!settings.header_tabs[tab.name]) {
        return;
      }

      if (settings.header_tabs[tab.name].icon && settings.header_tabs[tab.name].icon.startsWith('fa-')) {
        tab.icon = settings.header_tabs[tab.name].icon;
      }

      if (settings.header_tabs[tab.name].resource_icon) {
        tab.resourceIcon = settings.header_tabs[tab.name].resource_icon;
      }
    });

    return tabs;
  }

  /**
   * Returns the list of authorized header tabs according to the current user's permissions.
   * If settings are passed as parameter, then it will add the tab.icon and tab.resourceIcon when available.
   *
   * @param settings {Object} Settings of CHT-Core instance.
   *
   * @returns Promise<HeaderTab[]>
   */
  async getAuthorizedTabs(settings?): Promise<HeaderTab[]> {
    const extensions = await this.uiExtensionsService.getPropertiesByType('app_main_tab');
    const extensionTabs: HeaderTab[] = extensions.map(ext => ({
      name: `ui-extension-${ext.id}`,
      route: `ui-extensions/${ext.id}`,
      defaultIcon: 'fa-question-circle',
      translation: ext.title || '',
      permissions: [], // Extensions are already filtered by role in getPropertiesByType
      resourceIcon: ext.icon,
      weight: ext.weight,
    }));

    const tabs = [...this.get(settings), ...extensionTabs];
    const tabAuthorization = await Promise.all(tabs.map(tab => {
      if (!tab.permissions?.length) {
        return true;
      }
      return this.authService.has(tab.permissions);
    }));

    return tabs
      .filter((tab, index) => tabAuthorization[index])
      .sort((a, b) => (a.weight || 0) - (b.weight || 0));
  }

  /**
   * Returns the primary tab according to the current user's permissions.
   * If settings are passed as parameter, then it will add the tab.icon and tab.resourceIcon when available.
   *
   * @param settings {Object} Settings of CHT-Core instance.
   *
   * @returns Promise<HeaderTab>
   */
  async getPrimaryTab(settings?): Promise<HeaderTab> {
    const tabs = await this.getAuthorizedTabs(settings);

    return tabs?.[0];
  }
}

export interface HeaderTab {
  name: string;
  route: string;
  defaultIcon: string;
  translation: string;
  permissions: string[];
  typeName?: string;
  icon?: string;
  resourceIcon?: string;
  weight?: number;
}
