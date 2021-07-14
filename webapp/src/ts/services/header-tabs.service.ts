import { Injectable } from '@angular/core';

import { AuthService } from '@mm-services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class HeaderTabsService {
  constructor(
    private authService: AuthService
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
    },
    {
      name: 'tasks',
      route: 'tasks',
      defaultIcon: 'fa-flag',
      translation: 'Tasks',
      permissions: ['can_view_tasks', 'can_view_tasks_tab'],
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
      name:'contacts',
      route:'contacts',
      defaultIcon:'fa-user',
      translation:'Contacts',
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

  get(settings:any = {}): HeaderTab[] {
    if (!settings.header_tabs) {
      return this.tabs;
    }

    this.tabs.forEach(tab => {
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

    return this.tabs;
  }

  async getAuthorizedTabs(settings:any = {}): Promise<HeaderTab[]> {
    const tabs = this.get(settings);
    const results = await Promise.all(tabs.map(tab => this.authService.has(tab.permissions)));

    return tabs.filter((tab, index) => results[index]);
  }

  async getFirstAuthorizedTab(settings:any = {}): Promise<HeaderTab> {
    const tabs = await this.getAuthorizedTabs(settings);

    if (!tabs.length) {
      return;
    }

    return tabs[0];
  }
}

interface HeaderTab {
  name: string;
  route: string;
  defaultIcon: string;
  translation: string;
  permissions: string[];
  typeName?: string;
  icon?: string;
  resourceIcon?: string;
}
