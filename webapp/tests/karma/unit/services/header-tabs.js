describe('HeaderTabs service', () => {
  'use strict';

  let service;

  beforeEach(() => {
    module('inboxApp');
    inject($injector => service = $injector.get('HeaderTabs'));
  });

  it('returns default tabs when settings not provided', () => {
    const tabs = service();
    chai.expect(tabs).to.shallowDeepEqual([
      { name: 'messages', icon: 'fa-envelope' },
      { name: 'tasks', icon: 'fa-flag' },
      { name: 'reports', icon: 'fa-list-alt' },
      { name: 'contacts', icon: 'fa-user' },
      { name: 'analytics', icon: 'fa-bar-chart-o' },
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
    };

    const tabs = service({ header_tabs: headerTabsSettings });
    chai.expect(tabs).to.shallowDeepEqual([
      { name: 'messages', icon: 'fa-envelope', resourceIcon: undefined },
      { name: 'tasks', icon: 'fa-whatever', resourceIcon: undefined },
      { name: 'reports', icon: 'fa-list-alt', resourceIcon: 'some-icon' },
      { name: 'contacts', icon: 'fa-user', resourceIcon: undefined },
      { name: 'analytics', icon: 'fa-bar-chart-o', resourceIcon: 'other-icon' },
    ]);

  });
});
