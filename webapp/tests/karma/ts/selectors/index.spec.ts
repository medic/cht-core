import { expect } from 'chai';
import { cloneDeep } from 'lodash-es';

import { Selectors } from '@mm-selectors/index';
import { GlobalState } from '@mm-reducers/global';

const globalState: GlobalState = {
  processingReportVerification: true,
  replicationStatus: { current: true },
  androidAppVersion: 'SNAPSHOT',
  currentTab: 'non-existent-tab',
  snapshotData: { snapshot: 'data' },
  snackbarContent: { message: '' },
  loadingContent: false,
  showContent: true,
  selectMode: false,
  forms: [ { _id: 'these' } ],
  trainingMaterials: [ { _id: 'these' } ],
  filters: { some: 'filters' },
  sidebarFilter: {
    isOpen: false,
    filterCount: { total: 5, placeFilter: 3, formFilter: 2 },
  },
  searchBar: { isOpen: false },
  trainingCard: { formId: 'training:new_change', isOpen: false, showConfirmExit: false, nextUrl: '' },
  navigation: {
    cancelCallback: function() {},
    preventNavigation: true,
    cancelTranslationKey: 'cancel key',
    recordTelemetry: 'telemetry entry',
  },
  title: 'the title',
  privacyPolicyAccepted: false,
  showPrivacyPolicy: true,
  unreadCount: { report: 2 },
  translationsLoaded: false,
  userFacilityIds: ['facility_uuid'],
  userContactId: 'contact_uuid',
  enketoStatus: { edited: true, saving: false, error: 'has error', form: true },
  sidebarMenu: { isOpen: false },
  lastChangedDoc: { _id: '1234' },
  facilities: [ { _id: '1234' }, { _id: '1234' } ],
};

const state = {
  global: globalState,
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
    contactIdToLoad: 'contact3',
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
    it('should getProcessingReportVerification', () => {
      expect(Selectors.getProcessingReportVerification.projector(state.global)).to.equal(
        clonedState.global.processingReportVerification
      );
    });

    it('should getReplicationStatus', () => {
      expect(Selectors.getReplicationStatus.projector(state.global)).to.deep.equal(
        clonedState.global.replicationStatus
      );
    });

    it('should getAndroidAppVersion', () => {
      expect(Selectors.getAndroidAppVersion.projector(state.global)).to.equal(clonedState.global.androidAppVersion);
    });

    it('should getCurrentTab', () => {
      expect(Selectors.getCurrentTab.projector(state.global)).to.equal(clonedState.global.currentTab);
    });

    it('should getSnapshotData', () => {
      expect(Selectors.getSnapshotData.projector(state.global)).to.deep.equal(clonedState.global.snapshotData);
    });

    it('should getSnackbarContent', () => {
      expect(Selectors.getSnackbarContent.projector(state.global)).to.deep.equal(clonedState.global.snackbarContent);
    });

    it('should getLoadingContent', () => {
      expect(Selectors.getLoadingContent.projector(state.global)).to.equal(clonedState.global.loadingContent);
    });

    it('should getShowContent', () => {
      expect(Selectors.getShowContent.projector(state.global)).to.equal(clonedState.global.showContent);
    });

    it('should getSelectMode', () => {
      expect(Selectors.getSelectMode.projector(state.global)).to.equal(clonedState.global.selectMode);
    });

    it('should getForms', () => {
      expect(Selectors.getForms.projector(state.global)).to.deep.equal(clonedState.global.forms);
    });

    it('should getFilters', () => {
      expect(Selectors.getFilters.projector(state.global)).to.deep.equal(clonedState.global.filters);
    });

    it('should getSidebarFilter', () => {
      expect(Selectors.getSidebarFilter.projector(state.global)).to.deep.equal(clonedState.global.sidebarFilter);
    });

    it('should getCancelCallback', () => {
      expect(Selectors.getCancelCallback.projector(state.global))
        .to.deep.equal(clonedState.global.navigation.cancelCallback);
    });

    it('should getNavigation', () => {
      expect(Selectors.getNavigation.projector(state.global)).to.deep.equal(clonedState.global.navigation);
    });

    it('should getPreventNavigation', () => {
      expect(Selectors.getPreventNavigation.projector(state.global))
        .to.deep.equal(clonedState.global.navigation.preventNavigation);
    });

    it('should getTitle', () => {
      expect(Selectors.getTitle.projector(state.global)).to.equal(clonedState.global.title);
    });

    it('should getPrivacyPolicyAccepted', () => {
      expect(Selectors.getPrivacyPolicyAccepted.projector(state.global))
        .to.equal(clonedState.global.privacyPolicyAccepted);
    });

    it('should getShowPrivacyPolicy', () => {
      expect(Selectors.getShowPrivacyPolicy.projector(state.global)).to.equal(clonedState.global.showPrivacyPolicy);
    });

    it('should getUnreadCount', () => {
      expect(Selectors.getUnreadCount.projector(state.global)).to.deep.equal(clonedState.global.unreadCount);
    });

    it('should getTranslationsLoaded', () => {
      expect(Selectors.getTranslationsLoaded.projector(state.global)).to.equal(clonedState.global.translationsLoaded);
    });

    it('should getUserFacilityId', () => {
      expect(Selectors.getUserFacilityIds.projector(state.global)).to.deep.equal(clonedState.global.userFacilityIds);
    });

    it('should getUserContactId', () => {
      expect(Selectors.getUserContactId.projector(state.global)).to.equal(clonedState.global.userContactId);
    });

    it('should getEnketoStatus', () => {
      expect(Selectors.getEnketoStatus.projector(state.global)).to.deep.equal(clonedState.global.enketoStatus);
    });

    it('should getEnketoEditedStatus', () => {
      expect(Selectors.getEnketoEditedStatus.projector(state.global)).to.equal(clonedState.global.enketoStatus.edited);
    });

    it('should getEnketoSavingStatus', () => {
      expect(Selectors.getEnketoSavingStatus.projector(state.global)).to.equal(clonedState.global.enketoStatus.saving);
    });

    it('should getEnketoForm', () => {
      expect(Selectors.getEnketoForm.projector(state.global)).to.equal(clonedState.global.enketoStatus.form);
    });

    it('should getEnketoError', () => {
      expect(Selectors.getEnketoError.projector(state.global)).to.equal(clonedState.global.enketoStatus.error);
    });

    it('should getTrainingCardFormId', () => {
      expect(Selectors.getTrainingCardFormId.projector(state.global)).to.equal(clonedState.global.trainingCard?.formId);
    });

    // null checks
    it('should null check global state', () => {
      // @ts-ignore
      expect(Selectors.getUserFacilityIds.projector({})).to.equal(undefined);
    });

    it('should null check enketo state', () => {
      // @ts-ignore
      expect(Selectors.getEnketoError.projector({})).to.equal(undefined);
    });
  });

  describe('services', () => {
    it('should getLastChangedDoc', () => {
      expect(Selectors.getLastChangedDoc.projector(state.services)).to.deep.equal(clonedState.services.lastChangedDoc);
    });

    it('should null check services state', () => {
      expect(Selectors.getLastChangedDoc.projector({})).to.equal(undefined);
    });
  });

  describe('reports', () => {
    it('should getReportsList', () => {
      expect(Selectors.getReportsList.projector(state.reports)).to.deep.equal(clonedState.reports.reports);
    });

    it('should getListReport', () => {
      expect(Selectors.getListReport.projector(state.reports)).to.equal(undefined);
      // @ts-ignore
      expect(Selectors.getListReport.projector(state.reports, {})).to.equal(undefined);
      // @ts-ignore
      expect(Selectors.getListReport.projector(state.reports, { id: 'fake'})).to.equal(undefined);
      // @ts-ignore
      expect(Selectors.getListReport.projector(state.reports, { id: 'report2'}))
        .to.deep.equal(clonedState.reports.reportsById.get('report2'));
    });

    it('should listContains', () => {
      const listContains = Selectors.listContains.projector(state.reports);
      expect(listContains('thing')).to.equal(false);
      expect(listContains('report1')).to.equal(true);
    });

    it('should getSelectedReport', () => {
      expect(Selectors.getSelectedReport.projector(state.reports)).to.deep.equal(clonedState.reports.selectedReport);
    });

    it('should getSelectedReports', () => {
      expect(Selectors.getSelectedReports.projector(state.reports)).to.deep.equal(clonedState.reports.selectedReports);
    });

    it('should getSelectedReportDoc', () => {
      expect(Selectors.getSelectedReportDoc.projector(state.reports))
        .to.deep.equal(clonedState.reports.selectedReport.summary);
    });

    it('should getVerifyingReport', () => {
      expect(Selectors.getVerifyingReport.projector(state.reports)).to.equal(clonedState.reports.verifyingReport);
    });

    it('should null check reports state', () => {
      expect(Selectors.getSelectedReports.projector({})).to.deep.equal(undefined);
    });
  });

  describe('messages', () => {
    it('should getMessagesError', () => {
      expect(Selectors.getMessagesError.projector(state.messages)).to.equal(clonedState.messages.error);
    });

    it('should getSelectedConversation', () => {
      expect(Selectors.getSelectedConversation.projector(state.messages)).to.deep.equal(clonedState.messages.selected);
    });

    it('should getConversations', () => {
      expect(Selectors.getConversations.projector(state.messages)).to.deep.equal(clonedState.messages.conversations);
    });

    it('should null check messages state', () => {
      expect(Selectors.getMessagesError.projector({})).to.deep.equal(undefined);
    });
  });

  describe('contacts', () => {
    it('should getContactsList', () => {
      expect(Selectors.getContactsList.projector(state.contacts)).to.deep.equal(clonedState.contacts.contacts);
    });

    it('should contactListContains', () => {
      const contactListContains = Selectors.contactListContains.projector(state.contacts);
      expect(contactListContains('thing')).to.equal(false);
      expect(contactListContains('contact1')).to.equal(true);
    });

    it('should getSelectedContact', () => {
      expect(Selectors.getSelectedContact.projector(state.contacts)).to.deep.equal(clonedState.contacts.selected);
    });

    it('should getSelectedContactDoc', () => {
      expect(Selectors.getSelectedContactDoc.projector(state.contacts))
        .to.deep.equal(clonedState.contacts.selected.doc);
    });

    it('should getSelectedContactSummary', () => {
      expect(Selectors.getSelectedContactSummary.projector(state.contacts))
        .to.deep.equal(clonedState.contacts.selected.summary);
    });

    it('should getSelectedContactChildren', () => {
      expect(Selectors.getSelectedContactChildren.projector(state.contacts))
        .to.deep.equal(clonedState.contacts.selected.children);
    });

    it('should getSelectedContactReports', () => {
      expect(Selectors.getSelectedContactReports.projector(state.contacts))
        .to.deep.equal(clonedState.contacts.selected.reports);
    });

    it('should getSelectedContactTasks', () => {
      expect(Selectors.getSelectedContactTasks.projector(state.contacts))
        .to.deep.equal(clonedState.contacts.selected.tasks);
    });

    it('should getLoadingSelectedContactReports', () => {
      expect(Selectors.getLoadingSelectedContactReports.projector(state.contacts))
        .to.equal(clonedState.contacts.loadingSelectedReports);
    });

    it('should getContactsLoadingSummary', () => {
      expect(Selectors.getContactsLoadingSummary.projector(state.contacts))
        .to.equal(clonedState.contacts.loadingSummary);
    });

    it('should null check selected contact', () => {
      expect(Selectors.getSelectedContactChildren.projector({})).to.deep.equal(undefined);
    });

    it('should contactIdToLoad', () => {
      expect(Selectors.getContactIdToLoad.projector(state.contacts)).to.deep.equal('contact3');
    });
  });

  describe('analytics', () => {
    it('should getAnalyticsModules', () => {
      expect(Selectors.getAnalyticsModules.projector(state.analytics))
        .to.deep.equal(clonedState.analytics.analyticsModules);
    });

    it('should null check analytics state', () => {
      expect(Selectors.getAnalyticsModules.projector({})).to.deep.equal(undefined);
    });
  });

  describe('targetAggregates', () => {
    it('should getTargetAggregates', () => {
      expect(Selectors.getTargetAggregates.projector(state.targetAggregates))
        .to.deep.equal(clonedState.targetAggregates.targetAggregates);
    });

    it('should getSelectedTargetAggregate', () => {
      expect(Selectors.getSelectedTargetAggregate.projector(state.targetAggregates))
        .to.deep.equal(clonedState.targetAggregates.selected);
    });

    it('should getTargetAggregatesLoaded', () => {
      expect(Selectors.getTargetAggregatesLoaded.projector(state.targetAggregates))
        .to.equal(clonedState.targetAggregates.targetAggregatesLoaded);
    });

    it('should getTargetAggregatesError', () => {
      expect(Selectors.getTargetAggregatesError.projector(state.targetAggregates))
        .to.equal(clonedState.targetAggregates.error);
    });

    it('should null check targetAggregates', () => {
      expect(Selectors.getTargetAggregates.projector({})).to.deep.equal(undefined);
    });
  });

  describe('tasks', () => {
    it('should getTasksList', () => {
      expect(Selectors.getTasksList.projector(state.tasks)).to.deep.equal(clonedState.tasks.tasksList);
    });

    it('should getTasksLoaded', () => {
      expect(Selectors.getTasksLoaded.projector(state.tasks)).to.equal(clonedState.tasks.loaded);
    });

    it('should getSelectedTask', () => {
      expect(Selectors.getSelectedTask.projector(state.tasks)).to.deep.equal(clonedState.tasks.selected);
    });

    it('should null check tasks state', () => {
      expect(Selectors.getSelectedTask.projector({})).to.equal(undefined);
    });

    it('should getLastSubmittedTask', () => {
      expect(Selectors.getLastSubmittedTask.projector(state.tasks))
        .to.deep.equal(clonedState.tasks.taskGroup.lastSubmittedTask);

      const alternativeState = { tasks: { taskGroup: {} } };
      expect(Selectors.getLastSubmittedTask.projector(alternativeState.tasks)).to.equal(undefined);
    });

    it('should getTaskGroupContact', () => {
      expect(Selectors.getTaskGroupContact.projector(state.tasks)).to.deep.equal(clonedState.tasks.taskGroup.contact);
      const alternativeState = { tasks: { taskGroup: {} } };
      expect(Selectors.getTaskGroupContact.projector(alternativeState.tasks)).to.equal(undefined);
    });

    it('should getTaskGroupLoadingContact', () => {
      expect(Selectors.getTaskGroupLoadingContact.projector(state.tasks))
        .to.deep.equal(clonedState.tasks.taskGroup.loadingContact);
      const alternativeState = { tasks: { taskGroup: {} } };
      expect(Selectors.getTaskGroupLoadingContact.projector(alternativeState.tasks)).to.equal(undefined);
    });
  });
});
