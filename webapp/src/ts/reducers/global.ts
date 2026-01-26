import { createReducer, on } from '@ngrx/store';
import { Data } from '@angular/router';

import { Actions } from '@mm-actions/global';
import { VersionNumber } from '@mm-services/browser-detector.service';

export enum StorageStatus {
  STARTUP,
  NORMAL,
  ERROR
}
export interface StorageInfo {
  status: StorageStatus,
  availableBytes: number;
  storageUsagePercentage: number;
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
  sidebarFilter: {},
  searchBar: { isOpen: false },
  trainingCard: { formId: null, isOpen: false, showConfirmExit: false, nextUrl: null },
  sidebarMenu: { isOpen: false },
  forms: null,
  trainingMaterials: null,
  lastChangedDoc: false,
  loadingContent: false,
  processingReportVerification: false,
  replicationStatus: {},
  selectMode: false,
  privacyPolicyAccepted: false,
  showContent: false,
  showPrivacyPolicy: false,
  title: null,
  bubbleCounter: {},
  snackbarContent: null as any,
  translationsLoaded: false,
  userFacilityIds: [],
  userContactId: null,
  language: null,
  storageInfo: {
    status: StorageStatus.STARTUP,
    availableBytes: 0,
    storageUsagePercentage: 0
  }
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
  on(Actions.setTrainingMaterials, (state, { payload: { trainingMaterials } }) => {
    return { ...state, trainingMaterials };
  }),
  on(Actions.clearFilters, (state, { payload: { skip } }) => {
    const newValue = skip && state.filters[skip] ? { [skip]: state.filters[skip] } : {};
    return { ...state, filters: newValue };
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
  on(Actions.setBubbleCounter, (state, { payload: { bubbleCounter } }) => {
    return { ...state, bubbleCounter };
  }),
  on(Actions.updateBubbleCounter, (state, { payload: { bubbleCounter } }) => {
    return { ...state, bubbleCounter: { ...state.bubbleCounter, ...bubbleCounter } };
  }),
  on(Actions.setTranslationsLoaded, (state) => ({ ...state, translationsLoaded: true })),
  on(Actions.setUserFacilityIds, (state, { payload: { userFacilityIds }}) => {
    userFacilityIds = Array.isArray(userFacilityIds) ? userFacilityIds : [userFacilityIds];
    return { ...state, userFacilityIds };
  }),
  on(Actions.setUserContactId, (state, { payload: { userContactId }}) => ({ ...state, userContactId })),
  on(Actions.setSidebarMenu, (state, { payload: { sidebarMenu }}) => {
    return { ...state, sidebarMenu: { ...state.sidebarMenu, ...sidebarMenu } };
  }),
  on(Actions.setSearchBar, (state, { payload: { searchBar } }) => {
    return { ...state, searchBar: { ...state.searchBar, ...searchBar } };
  }),
  on(Actions.setTrainingCard, (state, { payload: { trainingCard } }) => {
    return { ...state, trainingCard: { ...state.trainingCard, ...trainingCard } };
  }),
  on(Actions.setLanguage, (state, { payload: { language } }) => {
    return { ...state, language };
  }),
  on(Actions.updateStorageInfo, (state, { payload: { storageInfo } }) => {
    return {...state, storageInfo: { ...state.storageInfo, ...storageInfo } };
  }),
);

export const globalReducer = (state, action) => {
  return _globalReducer(state, action);
};

export interface GlobalState {
  androidAppVersion: VersionNumber | null;
  navigation: NavigationState;
  currentTab: null | string;
  snapshotData: Data | null;
  enketoStatus: EnketoStatusState;
  facilities: Record<string, any>[];
  filters: Record<string, any>; // Selected criteria to filter data.
  sidebarFilter: SidebarFilterState;
  searchBar: SearchBarState;
  trainingCard: TrainingCardState;
  sidebarMenu: SidebarMenuState;
  forms: null | Record<string, any>[];
  trainingMaterials: null | Record<string, any>[];
  lastChangedDoc: boolean | Record<string, any>;
  loadingContent: boolean;
  processingReportVerification: boolean;
  replicationStatus: Record<string, any>;
  selectMode: boolean;
  privacyPolicyAccepted: boolean;
  showContent: boolean;
  showPrivacyPolicy: boolean;
  title: null | string;
  bubbleCounter: Record<string, any>;
  snackbarContent: SnackbarState;
  translationsLoaded: boolean;
  userFacilityIds: null | string[];
  userContactId: null | string;
  language: null | Record<string, any>;
  storageInfo: StorageInfo;
}

interface SidebarMenuState {
  isOpen: boolean;
}

interface SearchBarState {
  isOpen: boolean;
}

interface TrainingCardState {
  formId: null | string;
  isOpen: boolean;
  showConfirmExit: boolean;
  nextUrl: null|string;
}

interface SnackbarState {
  message?: string;
  action?: {
    label: string;
    onClick?: () => void;
  };
}

interface EnketoStatusState {
  form: boolean;
  edited: boolean;
  saving: boolean;
  error: null|string;
}

interface NavigationState {
  cancelCallback: (() => void) | null;
  preventNavigation: null | boolean;
  cancelTranslationKey: null | string;
  recordTelemetry: null | string;
}

interface SidebarFilterState {
  isOpen?: boolean;
  filterCount?: Record<string, number>;
  defaultFilters?: Record<string, any>;
}
