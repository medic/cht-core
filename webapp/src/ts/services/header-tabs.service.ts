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

  private readonly MESSAGE_TAB = {
    name: 'messages',
    route: 'messages',
    defaultIcon: 'fa-envelope',
    translation: 'Messages',
    typeName: 'message',
    weight: 1,
  };

  private readonly TASKS_TAB = {
    name: 'tasks',
    route: 'tasks',
    defaultIcon: 'fa-flag',
    translation: 'Tasks',
    typeName: 'task',
    weight: 2,
  };

  private readonly REPORTS_TAB = {
    name: 'reports',
    route: 'reports',
    defaultIcon: 'fa-list-alt',
    translation: 'Reports',
    typeName: 'report',
    weight: 3,
  };

  private readonly CONTACTS_TAB = {
    name: 'contacts',
    route: 'contacts',
    defaultIcon: 'fa-user',
    translation: 'Contacts',
    weight: 4,
  };

  private readonly ANALYTICS_TAB = {
    name: 'analytics',
    route: 'analytics',
    defaultIcon: 'fa-bar-chart-o',
    translation: 'Analytics',
    weight: 5,
  };

  private readonly SIDEBAR_HEADER_TABS: HeaderTab[] = [
    { ...this.MESSAGE_TAB, permissions: ['can_view_messages', '!can_view_messages_tab'] },
    { ...this.TASKS_TAB, permissions: ['can_view_tasks', '!can_view_tasks_tab'] },
    { ...this.REPORTS_TAB, permissions: ['can_view_reports', '!can_view_reports_tab'] },
    { ...this.CONTACTS_TAB, permissions: ['can_view_contacts', '!can_view_contacts_tab'] },
    { ...this.ANALYTICS_TAB, permissions: ['can_view_analytics', '!can_view_analytics_tab'] }
  ];

  private readonly DEFAULT_TABS: HeaderTab[] = [
    { ...this.MESSAGE_TAB, permissions: ['can_view_messages', 'can_view_messages_tab'] },
    { ...this.TASKS_TAB, permissions: ['can_view_tasks', 'can_view_tasks_tab'] },
    { ...this.REPORTS_TAB, permissions: ['can_view_reports', 'can_view_reports_tab'] },
    { ...this.CONTACTS_TAB, permissions: ['can_view_contacts', 'can_view_contacts_tab'] },
    { ...this.ANALYTICS_TAB, permissions: ['can_view_analytics', 'can_view_analytics_tab'] }
  ];

  private readonly SIDEBAR_TABS: SidebarTab[] = [
    {
      name: 'trainings',
      route: 'trainings',
      defaultIcon: 'fa-graduation-cap',
      translation: 'training_materials.page.title',
      permissions: [],
    },
    {
      name: 'about',
      route: 'about',
      defaultIcon: 'fa-question',
      translation: 'about',
      permissions: [],
    },
    {
      name: 'user',
      route: 'user',
      defaultIcon: 'fa-user',
      translation: 'edit.user.settings',
      permissions: ['can_edit_profile'],
    },
    {
      name: 'privacy-policy',
      route: 'privacy-policy',
      defaultIcon: 'fa-lock',
      translation: 'privacy.policy',
      permissions: [],
    },
    {
      name: 'bug',
      defaultIcon: 'fa-bug',
      translation: 'Report Bug',
      permissions: [],
    },
  ];

  private readonly DEFAULT_UI_EXTENSION_WEIGHT = this.DEFAULT_TABS.length + 1;

  private tabs?: HeaderTab[];
  private sidebarTabs?: SidebarTab[];

  private async getHeaderTabs(tabs: HeaderTab[]) {
    const { header_tabs } = await this.settingsService.get();
    const headerTabs = tabs.map(tab => {
      const tabSettings = header_tabs?.[tab.name];
      return {
        ...tab,
        icon: tabSettings?.icon?.startsWith('fa-') ? tabSettings.icon : tab.icon,
        resourceIcon: tabSettings?.resource_icon ? tabSettings.resource_icon : tab.resourceIcon,
        weight: tabSettings?.weight ?? tab.weight
      };
    });

    const tabAuthorization = await Promise.all(headerTabs.map(tab => this.authService.has(tab.permissions)));
    return headerTabs.filter((tab, index) => tabAuthorization[index]);
  }

  private async getUiExtensionTabs(type: string) {
    const extensions = await this.uiExtensionsService.getPropertiesByType(type);
    return extensions.map(ext => ({
      name: `ui-extension-${ext.id}`,
      route: `ui-extensions/${ext.id}`,
      defaultIcon: 'fa-question-circle',
      translation: ext.title!,
      permissions: [], // Extensions are already filtered by role in getPropertiesByType
      resourceIcon: ext.resource_icon,
      icon: ext.icon,
      accentColor: ext.accent_color,
      weight: ext.weight ?? this.DEFAULT_UI_EXTENSION_WEIGHT
    }));
  }

  async getSidebarTabs(): Promise<SidebarTab[]> {
    if (!this.sidebarTabs) {
      const [headerTabs, uiExtensionTabs] = await Promise.all([
        this.getHeaderTabs(this.SIDEBAR_HEADER_TABS),
        this.getUiExtensionTabs('sidebar_tab')
      ]);
      headerTabs.sort((a, b) => a.weight - b.weight);
      // sidebar_tab extensions should always come after the headers
      this.sidebarTabs = [
        ...headerTabs,
        ...uiExtensionTabs,
        ...this.SIDEBAR_TABS
      ];
    }

    return this.sidebarTabs;
  }

  /**
   * Returns the list of authorized header tabs according to the current user's permissions.
   *
   * @returns Promise<HeaderTab[]>
   */
  async getAuthorizedTabs(): Promise<HeaderTab[]> {
    if (!this.tabs) {
      const [headerTabs, uiExtensionTabs] = await Promise.all([
        this.getHeaderTabs(this.DEFAULT_TABS),
        this.getUiExtensionTabs('header_tab')
      ]);
      this.tabs = [...headerTabs, ...uiExtensionTabs].sort((a, b) => a.weight - b.weight);
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

export interface SidebarTab {
  name: string;
  route?: string;
  defaultIcon: string;
  translation: string;
  permissions: string[];
  icon?: string;
  resourceIcon?: string;
  accentColor?: string;
}

export interface HeaderTab extends SidebarTab {
  route: string;
  typeName?: string;
  weight: number;
}
