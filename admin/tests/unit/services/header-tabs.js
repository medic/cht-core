describe('HeaderTabs service', () => {
  'use strict';

  let service;

  beforeEach(() => {
    module('adminApp');
    inject($injector => service = $injector.get('HeaderTabs'));
  });

  it('returns default tabs when settings not provided', () => {
    const tabs = service();
    chai.expect(tabs).to.shallowDeepEqual([
      { name: 'messages', defaultIcon: 'fa-envelope', icon: undefined },
      { name: 'tasks', defaultIcon: 'fa-flag', icon: undefined },
      { name: 'reports', defaultIcon: 'fa-list-alt', icon: undefined },
      { name: 'contacts', defaultIcon: 'fa-user', icon: undefined },
      { name: 'analytics', defaultIcon: 'fa-bar-chart-o', icon: undefined },
    ]);

    chai.expect(service({})).to.deep.equal(tabs);
    chai.expect(service({ key: 'value' })).to.deep.equal(tabs);
    chai.expect(service({ header_tabs: {} })).to.deep.equal(tabs);
  });

  it('should replace icons when provided', () => {
    const headerTabsSettings = {
      tasks: { icon: 'fa-whatever' },
      reports: { resource_icon: 'some-icon' },
      analytics: { resource_icon: 'other-icon', icon: 'fa-icon' },
      contacts: { resource_icon: 'one-icon', icon: 'not-fa-icon' },
    };

    const tabs = service({ header_tabs: headerTabsSettings });
    chai.expect(tabs).to.shallowDeepEqual([
      { name: 'messages', icon: undefined, resourceIcon: undefined, defaultIcon: 'fa-envelope' },
      { name: 'tasks', icon: 'fa-whatever', resourceIcon: undefined, defaultIcon: 'fa-flag' },
      { name: 'reports', icon: undefined, resourceIcon: 'some-icon', defaultIcon: 'fa-list-alt' },
      { name: 'contacts', icon: undefined, resourceIcon: 'one-icon', defaultIcon: 'fa-user' },
      { name: 'analytics', icon: 'fa-icon', resourceIcon: 'other-icon', defaultIcon: 'fa-bar-chart-o' },
    ]);

  });
});
