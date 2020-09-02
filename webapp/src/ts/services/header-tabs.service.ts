import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class HeaderTabs {
  constructor() {}

  private readonly tabs = [
    {
      name: 'messages',
      state: 'messages.detail',
      defaultIcon: 'fa-envelope',
      translation: 'Messages',
      permissions: ['can_view_messages', 'can_view_messages_tab'],
      typeName: 'message',
      icon: undefined,
      resourceIcon: undefined,
    },
    {
      name: 'tasks',
      state: 'tasks.detail',
      defaultIcon: 'fa-flag',
      translation: 'Tasks',
      permissions: ['can_view_tasks','can_view_tasks_tab'],
      icon: undefined,
      resourceIcon: undefined,
    },
    {
      name: 'reports',
      state: 'reports.detail',
      defaultIcon: 'fa-list-alt',
      translation: 'Reports',
      permissions: ['can_view_reports','can_view_reports_tab'],
      typeName: 'report',
      icon: undefined,
      resourceIcon: undefined,
    },
    {
      name:'contacts',
      state:'contacts.detail',
      defaultIcon:'fa-user',
      translation:'Contacts',
      permissions: ['can_view_contacts','can_view_contacts_tab'],
      icon: undefined,
      resourceIcon: undefined,
    },
    {
      name: 'analytics',
      state: 'analytics',
      defaultIcon: 'fa-bar-chart-o',
      translation: 'Analytics',
      permissions: ['can_view_analytics','can_view_analytics_tab'],
      icon: undefined,
      resourceIcon: undefined,
    }
  ];

  get(settings:any = {}) {
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
}
