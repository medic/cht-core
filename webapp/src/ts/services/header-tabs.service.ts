import { Injectable } from '@angular/core';

import { AuthService } from '@mm-services/auth.service';
import { UiExtensionsService } from '@mm-services/ui-extensions.service';
import { SettingsService } from '@mm-services/settings.service';

@Injectable({
  providedIn: 'root'
})
export class HeaderTabsService {
  constructor(
    private readonly authService: AuthService,
    private readonly settingsService: SettingsService,
    private readonly uiExtensionsService: UiExtensionsService
  ) { }

  private readonly DEFAULT_TABS: HeaderTab[] = [
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
      name: 'tasks',
      route: 'tasks',
      defaultIcon: 'fa-flag',
      translation: 'Tasks',
      permissions: ['can_view_tasks', 'can_view_tasks_tab'],
      typeName: 'task',
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
      name: 'contacts',
      route: 'contacts',
      defaultIcon: 'fa-user',
      translation: 'Contacts',
      permissions: ['can_view_contacts', 'can_view_contacts_tab'],
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
  ];

  private tabs?: HeaderTab[];

  private async getHeaderTabs() {
    const { header_tabs } = await this.settingsService.get();
    const headerTabs = this.DEFAULT_TABS.map(tab => {
      const tabSettings = header_tabs?.[tab.name];
      return {
        ...tab,
        icon: tabSettings?.icon?.startsWith('fa-') ? tabSettings.icon : tab.icon,
        resourceIcon: tabSettings?.resource_icon ? tabSettings.resource_icon : tab.resourceIcon
      };
    });

    const tabAuthorization = await Promise.all(headerTabs.map(tab => this.authService.has(tab.permissions)));
    return headerTabs.filter((tab, index) => tabAuthorization[index]);
  }

  private async getUiExtensionTabs() {
    const extensions = await this.uiExtensionsService.getPropertiesByType('app_main_tab');
    return extensions.map(ext => ({
      name: `ui-extension-${ext.id}`,
      route: `ui-extensions/${ext.id}`,
      defaultIcon: 'fa-question-circle',
      translation: ext.title!,
      permissions: [], // Extensions are already filtered by role in getPropertiesByType
      resourceIcon: ext.resource_icon,
      icon: ext.icon
    }));
  }

  /**
   * Returns the list of authorized header tabs according to the current user's permissions.
   *
   * @returns Promise<HeaderTab[]>
   */
  async getAuthorizedTabs(): Promise<HeaderTab[]> {
    if (!this.tabs) {
      const [headerTabs, uiExtensionTabs] = await Promise.all([
        this.getHeaderTabs(),
        this.getUiExtensionTabs()
      ]);
      this.tabs = [...headerTabs, ...uiExtensionTabs];
    }

    return this.tabs;
  }

  /**
   * Returns the primary tab according to the current user's permissions.
   *
   * @returns Promise<HeaderTab>
   */
  async getPrimaryTab(): Promise<HeaderTab> {
    const tabs = await this.getAuthorizedTabs();

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
}
