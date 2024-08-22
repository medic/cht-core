import { createReducer, on } from '@ngrx/store';
import { Data } from '@angular/router';

import { Actions } from '@mm-actions/global';
import { SidebarMenu } from '@mm-components/sidebar-menu/sidebar-menu.component';
import { Snackbar } from '@mm-components/snackbar/snackbar.component';
import { EnketoStatus } from '@mm-components/enketo/enketo.component';
import { VersionNumber } from '@mm-services/browser-detector.service';

export interface GlobalState {
  androidAppVersion: VersionNumber | null;
  navigation: {
    cancelCallback: (() => void) | null;
    preventNavigation: null | boolean;
    cancelTranslationKey: null | string;
    recordTelemetry: null | string;
  };
  currentTab: null | string;
  snapshotData: Data | null;
  enketoStatus: EnketoStatus;
  facilities: Record<string, any>[];
  filters: Record<string, any>; // Selected criteria to filter data.
  sidebarFilter: {
    isOpen?: boolean;
    filterCount?: Record<string, number>;
    defaultFilters?: Record<string, any>;
  };
  sidebarMenu: SidebarMenu;
  forms: null | Record<string, any>[];
  lastChangedDoc: boolean;
  loadingContent: boolean;
  processingReportVerification: boolean;
  replicationStatus: Record<string, any>;
  selectMode: boolean;
  privacyPolicyAccepted: boolean;
  showContent: boolean;
  showPrivacyPolicy: boolean;
  title: null | string;
  unreadCount: Record<string, any>;
  snackbarContent: Snackbar;
  translationsLoaded: boolean;
  userFacilityId: null | string[];
  trainingCardFormId: null | string;
}

const initialState: GlobalState = {
  androidAppVersion: null,
  navigation: {
    cancelCallback: null,
    preventNavigation: null,
    cancelTranslationKey: null,
    recordTelemetry: null,
  },
  currentTab: null,
  snapshotData: null,
  enketoStatus: {
    form: false,
    edited: false,
    saving: false,
    error: null
  },
  facilities: [],
  filters: {}, // Selected criteria to filter data.
  sidebarFilter: {}, // Component state.
  sidebarMenu: { isOpen: false },
  forms: null,
  lastChangedDoc: false,
  loadingContent: false,
  processingReportVerification: false,
  replicationStatus: {},
  selectMode: false,
  privacyPolicyAccepted: false,
  showContent: false,
  showPrivacyPolicy: false,
  title: null,
  unreadCount: {},
  snackbarContent: null as any,
  translationsLoaded: false,
  userFacilityId: null,
  trainingCardFormId: null,
};

const setShowContent = (state, showContent) => {
  if (showContent) {
    $('.app-root').addClass('show-content');
  } else {
    $('.app-root').removeClass('show-content');
  }
  return { ...state, showContent };
};

const _globalReducer = createReducer(
  initialState,
  on(Actions.updateReplicationStatus, (state, { payload: { replicationStatus } }) => {
    return Object.assign({}, state, {
      replicationStatus: Object.assign({}, state.replicationStatus, replicationStatus)
    });
  }),
  on(Actions.setAndroidAppVersion, (state, { payload: { androidAppVersion } }) => {
    return { ...state, androidAppVersion };
  }),
  on(Actions.setCurrentTab, (state, { payload: { currentTab } }) => {
    return { ...state, currentTab };
  }),
  on(Actions.setSnapshotData, (state, { payload: { snapshotData } }) => {
    return { ...state, snapshotData };
  }),
  on(Actions.setSnackbarContent, (state, { payload: { message, action } }) => {
    return { ...state, snackbarContent: { message, action } };
  }),
  on(Actions.setLoadingContent, (state, { payload: { loadingContent } }) => {
    return { ...state, loadingContent };
  }),
  on(Actions.setForms, (state, { payload: { forms } }) => {
    return { ...state, forms };
  }),
  on(Actions.clearFilters, (state, { payload: { skip } }) => {
    const newValue = skip && state.filters[skip] ? { [skip]: state.filters[skip] } : {};
    return { ...state, filters: newValue };
  }),
  on(Actions.setFilters, (state, { payload: { filters } }) => {
    return { ...state, filters };
  }),
  on(Actions.setFilter, (state, { payload: { filter } }) => {
    return {
      ...state,
      filters: { ...state.filters, ...filter }
    };
  }),
  on(Actions.setSidebarFilter, (state, { payload: { sidebarFilter } }) => {
    return {
      ...state,
      sidebarFilter: { ...state.sidebarFilter, ...sidebarFilter }
    };
  }),
  on(Actions.clearSidebarFilter, (state) => {
    return { ...state, sidebarFilter: {} };
  }),
  on(Actions.setTitle, (state, { payload: { title } }) => {
    return { ...state, title };
  }),
  on(Actions.setShowContent, (state, { payload: { showContent } }) => {
    return setShowContent(state, showContent);
  }),
  on(Actions.setSelectMode, (state, { payload: { selectMode } }) => {
    return { ...state, selectMode };
  }),
  on(Actions.setEnketoStatus, (state, { payload: { enketoStatus } }) => {
    return {
      ...state,
      enketoStatus: { ...state.enketoStatus, ...enketoStatus, form: true },
    };
  }),
  on(Actions.clearEnketoStatus, state => ({ ...state, enketoStatus: { ...initialState.enketoStatus } })),
  on(Actions.setPrivacyPolicyAccepted, (state, { payload: { accepted } }) => {
    return { ...state, privacyPolicyAccepted: accepted };
  }),
  on(Actions.setShowPrivacyPolicy, (state, { payload: { show } }) => {
    return { ...state, showPrivacyPolicy: show };
  }),
  on(Actions.setCancelCallback, (state, { payload: { cancelCallback } }) => {
    return {
      ...state,
      navigation: {
        ...state.navigation,
        cancelCallback,
      },
    };
  }),
  on(Actions.setNavigation, (state, { payload }) => {
    const { cancelCallback, preventNavigation, cancelTranslationKey, recordTelemetry } = payload;
    return {
      ...state,
      navigation: {
        ...state.navigation,
        cancelCallback,
        preventNavigation,
        cancelTranslationKey,
        recordTelemetry,
      }
    };
  }),
  on(Actions.setPreventNavigation, (state, { payload: { preventNavigation } }) => {
    return {
      ...state,
      navigation: {
        ...state.navigation,
        preventNavigation,
      },
    };
  }),
  on(Actions.setProcessingReportVerification, (state, { payload: { loading } }) => {
    return { ...state, processingReportVerification: loading };
  }),
  on(Actions.setUnreadCount, (state, { payload: { unreadCount } }) => {
    return { ...state, unreadCount: unreadCount };
  }),
  on(Actions.updateUnreadCount, (state, { payload: { unreadCount } }) => {
    return { ...state, unreadCount: { ...state.unreadCount, ...unreadCount } };
  }),
  on(Actions.setTranslationsLoaded, (state) => ({ ...state, translationsLoaded: true })),
  on(Actions.setUserFacilityId, (state, { payload: { userFacilityId }}) => {
    return { ...state, userFacilityId };
  }),
  on(Actions.setTrainingCardFormId, (state, { payload: { trainingCardFormId }}) => {
    return { ...state, trainingCardFormId };
  }),
  on(Actions.setSidebarMenu, (state, { payload: { sidebarMenu }}) => {
    return { ...state, sidebarMenu: { ...state.sidebarMenu, ...sidebarMenu } };
  }),
);

export const globalReducer = (state, action) => {
  return _globalReducer(state, action);
};
