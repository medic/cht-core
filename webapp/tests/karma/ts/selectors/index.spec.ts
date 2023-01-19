import { expect } from 'chai';
import { cloneDeep } from 'lodash-es';

import { Selectors } from '@mm-selectors/index';

const state = {
  global: {
    actionBar: { the: 'actionbar' },
    loadingSubActionBar: 'is loading sub action bar',
    replicationStatus: 'somereplicationstatus',
    androidAppVersion: '1.0.8',
    currentTab: 'non-existent-tab',
    snapshotData: { snapshot: 'data' },
    snackbarContent: 'this is just some text',
    loadingContent: 'is loading content',
    showContent: 'is showing content',
    selectMode: 'is in select mode',
    showActionBar: 'is showing action bar',
    forms: ['these', 'are', 'some', 'forms'],
    filters: { some: 'filters' },
    sidebarFilter: {
      isOpen: false,
      filterCount: { total: 5, placeFilter: 3, formFilter: 2 },
    },
    trainingCard: 'form:training:new_change',
    navigation: {
      cancelCallback: function() {},
      preventNavigation: 'prevent',
      cancelTranslationKey: 'cancel key',
      recordTelemetry: 'telemetry entry',
    },
    title: 'the title',
    privacyPolicyAccepted: 'has accepted policy',
    showPrivacyPolicy: 'show policy',
    unreadCount: 1230,
    translationsLoaded: 'have translations loaded',
    userFacilityId: 'facility_uuid',
    enketoStatus: {
      edited: 'is edited',
      saving: 'is saving',
      error: 'has error',
      form: 'is form',
    }
  },
  services: {
    lastChangedDoc: { this: 'is the last changed doc' },
  },
  reports: {
    reports: [
      { _id: 'report1' },
      { _id: 'report2' },
      { _id: 'report3' },
      { _id: 'report4' },
    ],
    reportsById: new Map([
      ['report1', { _id: 'report1' }],
      ['report2', { _id: 'report2' }],
      ['report3', { _id: 'report3' }],
      ['report4', { _id: 'report4' }],
    ]),
    selectedReport: { _id: 'report2', summary: { valid: false } },
    selectedReports: [
      { _id: 'report1', formatted: { errors: ['one', 'two'] }, doc: { _id: 'report1' } },
      { _id: 'report2', summary: { valid: false }, doc: { _id: 'report2' } },
      { _id: 'report3', summary: { valid: true }, doc: { _id: 'report3' } },
      { _id: 'report4', formatted: { }, summary: { _id: 'report4' } },
    ],
    verifyingReport: 'is verifying report',
  },
  messages: {
    error: 'some messages error',
    selected: { _id: 'selected', conversation: 'thing' },
    conversations: [{ _id: 'conversation1' }, { _id: 'conversation2' }],
  },
  contacts: {
    contacts: [
      { _id: 'contact1' },
      { _id: 'contact2' },
      { _id: 'contact3' },
      { _id: 'contact4' },
    ],
    contactsById: new Map([
      ['contact1', { _id: 'contact1' }],
      ['contact2', { _id: 'contact2' }],
      ['contact3', { _id: 'contact3' }],
      ['contact4', { _id: 'contact4' }],
    ]),
    selected: {
      _id: 'contact3',
      doc: { _id: 'contact3' },
      summary: { alive: true },
      children: [{ _id: 'child1' }],
      reports: [{ _id: 'report1' }],
      tasks: [{ _id: 'task1' }],
    },
    loadingSelectedReports: 'is loading reports',
    loadingSummary: 'is loading summary',
  },
  analytics: {
    analyticsModules: ['module1', 'module2'],
  },
  targetAggregates: {
    targetAggregates: [{ _id: 'aggregate1' }, { _id: 'aggregate2' }],
    selected: { _id: 'aggregate2' },
    targetAggregatesLoaded: 'are loaded',
    error: 'the error',
  },
  tasks: {
    tasksList: [{ _id: 'task1' }, { _id: 'task2' }],
    loaded: 'are tasks loaded?',
    selected: { _id: 'selected task' },
    taskGroup: {
      lastSubmittedTask: { _id: 'last submitted task' },
      contact: { the: 'contact' },
      loadingContact: 'loading task group contact'
    },
  },
};
const clonedState = cloneDeep(state);

describe('Selectors', () => {
  afterEach(() => {
    // state is never mutated!!!
    expect(state).to.deep.equal(clonedState);
  });

  describe('global', () => {
    it('should getActionBarr', () => {
      expect(Selectors.getActionBar(state)).to.deep.equal(clonedState.global.actionBar);
    });

    it('should getLoadingSubActionBar', () => {
      expect(Selectors.getLoadingSubActionBar(state)).to.equal(clonedState.global.loadingSubActionBar);
    });

    it('should getReplicationStatus', () => {
      expect(Selectors.getReplicationStatus(state)).to.equal(clonedState.global.replicationStatus);
    });

    it('should getAndroidAppVersion', () => {
      expect(Selectors.getAndroidAppVersion(state)).to.equal(clonedState.global.androidAppVersion);
    });

    it('should getCurrentTab', () => {
      expect(Selectors.getCurrentTab(state)).to.equal(clonedState.global.currentTab);
    });

    it('should getSnapshotData', () => {
      expect(Selectors.getSnapshotData(state)).to.deep.equal(clonedState.global.snapshotData);
    });

    it('should getSnackbarContent', () => {
      expect(Selectors.getSnackbarContent(state)).to.equal(clonedState.global.snackbarContent);
    });

    it('should getLoadingContent', () => {
      expect(Selectors.getLoadingContent(state)).to.equal(clonedState.global.loadingContent);
    });

    it('should getShowContent', () => {
      expect(Selectors.getShowContent(state)).to.equal(clonedState.global.showContent);
    });

    it('should getSelectMode', () => {
      expect(Selectors.getSelectMode(state)).to.equal(clonedState.global.selectMode);
    });

    it('should getShowActionBar', () => {
      expect(Selectors.getShowActionBar(state)).to.equal(clonedState.global.showActionBar);
    });

    it('should getForms', () => {
      expect(Selectors.getForms(state)).to.deep.equal(clonedState.global.forms);
    });

    it('should getFilters', () => {
      expect(Selectors.getFilters(state)).to.deep.equal(clonedState.global.filters);
    });

    it('should getSidebarFilter', () => {
      expect(Selectors.getSidebarFilter(state)).to.deep.equal(clonedState.global.sidebarFilter);
    });

    it('should getCancelCallback', () => {
      expect(Selectors.getCancelCallback(state)).to.deep.equal(clonedState.global.navigation.cancelCallback);
    });

    it('should getNavigation', () => {
      expect(Selectors.getNavigation(state)).to.deep.equal(clonedState.global.navigation);
    });

    it('should getPreventNavigation', () => {
      expect(Selectors.getPreventNavigation(state)).to.deep.equal(clonedState.global.navigation.preventNavigation);
    });

    it('should getTitle', () => {
      expect(Selectors.getTitle(state)).to.equal(clonedState.global.title);
    });

    it('should getPrivacyPolicyAccepted', () => {
      expect(Selectors.getPrivacyPolicyAccepted(state)).to.equal(clonedState.global.privacyPolicyAccepted);
    });

    it('should getShowPrivacyPolicy', () => {
      expect(Selectors.getShowPrivacyPolicy(state)).to.equal(clonedState.global.showPrivacyPolicy);
    });

    it('should getUnreadCount', () => {
      expect(Selectors.getUnreadCount(state)).to.equal(clonedState.global.unreadCount);
    });

    it('should getTranslationsLoaded', () => {
      expect(Selectors.getTranslationsLoaded(state)).to.equal(clonedState.global.translationsLoaded);
    });

    it('should getUserFacilityId', () => {
      expect(Selectors.getUserFacilityId(state)).to.equal(clonedState.global.userFacilityId);
    });

    it('should getEnketoStatus', () => {
      expect(Selectors.getEnketoStatus(state)).to.deep.equal(clonedState.global.enketoStatus);
    });

    it('should getEnketoEditedStatus', () => {
      expect(Selectors.getEnketoEditedStatus(state)).to.equal(clonedState.global.enketoStatus.edited);
    });

    it('should getEnketoSavingStatus', () => {
      expect(Selectors.getEnketoSavingStatus(state)).to.equal(clonedState.global.enketoStatus.saving);
    });

    it('should getEnketoForm', () => {
      expect(Selectors.getEnketoForm(state)).to.equal(clonedState.global.enketoStatus.form);
    });

    it('should getEnketoError', () => {
      expect(Selectors.getEnketoError(state)).to.equal(clonedState.global.enketoStatus.error);
    });

    it('should getTrainingCard', () => {
      expect(Selectors.getTrainingCard(state)).to.equal(clonedState.global.trainingCard);
    });

    // null checks
    it('should null check global state', () => {
      expect(Selectors.getUserFacilityId({})).to.equal(undefined);
    });

    it('should null check enketo state', () => {
      expect(Selectors.getEnketoError({})).to.equal(undefined);
    });
  });

  describe('services', () => {
    it('should getLastChangedDoc', () => {
      expect(Selectors.getLastChangedDoc(state)).to.deep.equal(clonedState.services.lastChangedDoc);
    });

    it('should null check services state', () => {
      expect(Selectors.getLastChangedDoc({})).to.equal(undefined);
    });
  });

  describe('reports', () => {
    it('should getReportsList', () => {
      expect(Selectors.getReportsList(state)).to.deep.equal(clonedState.reports.reports);
    });

    it('should getListReport', () => {
      expect(Selectors.getListReport(state)).to.equal(undefined);
      // @ts-ignore
      expect(Selectors.getListReport(state, {})).to.equal(undefined);
      // @ts-ignore
      expect(Selectors.getListReport(state, { id: 'fake'})).to.equal(undefined);
      // @ts-ignore
      expect(Selectors.getListReport(state, { id: 'report2'}))
        .to.deep.equal(clonedState.reports.reportsById.get('report2'));
    });

    it('should listContains', () => {
      const listContains = Selectors.listContains(state);
      expect(listContains('thing')).to.equal(false);
      expect(listContains('report1')).to.equal(true);
    });

    it('should getSelectedReport', () => {
      expect(Selectors.getSelectedReport(state)).to.deep.equal(clonedState.reports.selectedReport);
    });

    it('should getSelectedReports', () => {
      expect(Selectors.getSelectedReports(state)).to.deep.equal(clonedState.reports.selectedReports);
    });

    it('should getSelectedReportDoc', () => {
      expect(Selectors.getSelectedReportDoc(state)).to.deep.equal(clonedState.reports.selectedReport.summary);
    });

    it('should getVerifyingReport', () => {
      expect(Selectors.getVerifyingReport(state)).to.equal(clonedState.reports.verifyingReport);
    });

    it('should null check reports state', () => {
      expect(Selectors.getSelectedReports({})).to.deep.equal(undefined);
    });
  });

  describe('messages', () => {
    it('should getMessagesError', () => {
      expect(Selectors.getMessagesError(state)).to.equal(clonedState.messages.error);
    });

    it('should getSelectedConversation', () => {
      expect(Selectors.getSelectedConversation(state)).to.deep.equal(clonedState.messages.selected);
    });

    it('should getConversations', () => {
      expect(Selectors.getConversations(state)).to.deep.equal(clonedState.messages.conversations);
    });

    it('should null check messages state', () => {
      expect(Selectors.getMessagesError({})).to.deep.equal(undefined);
    });
  });

  describe('contacts', () => {
    it('should getContactsList', () => {
      expect(Selectors.getContactsList(state)).to.deep.equal(clonedState.contacts.contacts);
    });

    it('should contactListContains', () => {
      const contactListContains = Selectors.contactListContains(state);
      expect(contactListContains('thing')).to.equal(false);
      expect(contactListContains('contact1')).to.equal(true);
    });

    it('should getSelectedContact', () => {
      expect(Selectors.getSelectedContact(state)).to.deep.equal(clonedState.contacts.selected);
    });

    it('should getSelectedContactDoc', () => {
      expect(Selectors.getSelectedContactDoc(state)).to.deep.equal(clonedState.contacts.selected.doc);
    });

    it('should getSelectedContactSummary', () => {
      expect(Selectors.getSelectedContactSummary(state)).to.deep.equal(clonedState.contacts.selected.summary);
    });

    it('should getSelectedContactChildren', () => {
      expect(Selectors.getSelectedContactChildren(state)).to.deep.equal(clonedState.contacts.selected.children);
    });

    it('should getSelectedContactReports', () => {
      expect(Selectors.getSelectedContactReports(state)).to.deep.equal(clonedState.contacts.selected.reports);
    });

    it('should getSelectedContactTasks', () => {
      expect(Selectors.getSelectedContactTasks(state)).to.deep.equal(clonedState.contacts.selected.tasks);
    });

    it('should getLoadingSelectedContactReports', () => {
      expect(Selectors.getLoadingSelectedContactReports(state)).to.equal(clonedState.contacts.loadingSelectedReports);
    });

    it('should getContactsLoadingSummary', () => {
      expect(Selectors.getContactsLoadingSummary(state)).to.equal(clonedState.contacts.loadingSummary);
    });

    it('should null check contacts state', () => {
      expect(Selectors.getSelectedContact({})).to.deep.equal(undefined);
    });

    it('should null check selected contact', () => {
      expect(Selectors.getSelectedContactChildren({})).to.deep.equal(undefined);
    });
  });

  describe('analytics', () => {
    it('should getAnalyticsModules', () => {
      expect(Selectors.getAnalyticsModules(state)).to.deep.equal(clonedState.analytics.analyticsModules);
    });

    it('should null check analytics state', () => {
      expect(Selectors.getAnalyticsModules({})).to.deep.equal(undefined);
    });
  });

  describe('targetAggregates', () => {
    it('should getTargetAggregates', () => {
      expect(Selectors.getTargetAggregates(state)).to.deep.equal(clonedState.targetAggregates.targetAggregates);
    });

    it('should getSelectedTargetAggregate', () => {
      expect(Selectors.getSelectedTargetAggregate(state)).to.deep.equal(clonedState.targetAggregates.selected);
    });

    it('should getTargetAggregatesLoaded', () => {
      expect(Selectors.getTargetAggregatesLoaded(state)).to.equal(clonedState.targetAggregates.targetAggregatesLoaded);
    });

    it('should getTargetAggregatesError', () => {
      expect(Selectors.getTargetAggregatesError(state)).to.equal(clonedState.targetAggregates.error);
    });

    it('should null check targetAggregates', () => {
      expect(Selectors.getTargetAggregates({})).to.deep.equal(undefined);
    });
  });

  describe('tasks', () => {
    it('should getTasksList', () => {
      expect(Selectors.getTasksList(state)).to.deep.equal(clonedState.tasks.tasksList);
    });

    it('should getTasksLoaded', () => {
      expect(Selectors.getTasksLoaded(state)).to.equal(clonedState.tasks.loaded);
    });

    it('should getSelectedTask', () => {
      expect(Selectors.getSelectedTask(state)).to.deep.equal(clonedState.tasks.selected);
    });

    it('should null check tasks state', () => {
      expect(Selectors.getSelectedTask({})).to.equal(undefined);
    });

    it('should getLastSubmittedTask', () => {
      expect(Selectors.getLastSubmittedTask(state)).to.deep.equal(clonedState.tasks.taskGroup.lastSubmittedTask);
      const alternativeState = { tasks: { taskGroup: {} } };
      expect(Selectors.getLastSubmittedTask(alternativeState)).to.equal(undefined);
    });

    it('should getTaskGroupContact', () => {
      expect(Selectors.getTaskGroupContact(state)).to.deep.equal(clonedState.tasks.taskGroup.contact);
      const alternativeState = { tasks: { taskGroup: {} } };
      expect(Selectors.getTaskGroupContact(alternativeState)).to.equal(undefined);
    });

    it('should getTaskGroupLoadingContact', () => {
      expect(Selectors.getTaskGroupLoadingContact(state)).to.deep.equal(clonedState.tasks.taskGroup.loadingContact);
      const alternativeState = { tasks: { taskGroup: {} } };
      expect(Selectors.getTaskGroupLoadingContact(alternativeState)).to.equal(undefined);
    });
  });
});
