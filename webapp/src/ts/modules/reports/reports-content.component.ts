import { Component, OnDestroy, OnInit } from '@angular/core';
import * as _ from 'lodash-es';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Selectors } from '@mm-selectors/index';
import { GlobalActions } from '@mm-actions/global';
import { ReportsActions } from '@mm-actions/reports';
import { ChangesService } from '@mm-services/changes.service';
import { SearchFiltersService } from '@mm-services/search-filters.service';
import { MessageStateService } from '@mm-services/message-state.service';
import { ModalService } from '@mm-services/modal.service';
import { EditMessageGroupComponent } from '@mm-modals/edit-message-group/edit-message-group.component';
import { ResponsiveService } from '@mm-services/responsive.service';
import { FastAction, FastActionButtonService } from '@mm-services/fast-action-button.service';
import { SendMessageComponent } from '@mm-modals/send-message/send-message.component';
import { DbService } from '@mm-services/db.service';
import { SearchTelemetryService } from '@mm-services/search-telemetry.service';
import { NgIf, NgFor, AsyncPipe } from '@angular/common';
import { FastActionButtonComponent } from '../../components/fast-action-button/fast-action-button.component';
import { SenderComponent } from '../../components/sender/sender.component';
import {
  ReportVerifyValidIconComponent,
  ReportVerifyInvalidIconComponent
} from '../../components/status-icons/status-icons.template';
import { ReportImageComponent } from '../../components/report-image/report-image.component';
import { TranslatePipe } from '@ngx-translate/core';
import { LineagePipe, TitlePipe } from '@mm-pipes/message.pipe';
import { RelativeDatePipe, StatePipe } from '@mm-pipes/date.pipe';
import { FormIconPipe } from '@mm-pipes/form-icon.pipe';

@Component({
  templateUrl: './reports-content.component.html',
  standalone: true,
  imports: [
    NgIf,
    FastActionButtonComponent,
    NgFor,
    RouterLink,
    SenderComponent,
    ReportVerifyValidIconComponent,
    ReportVerifyInvalidIconComponent,
    ReportImageComponent,
    AsyncPipe,
    TranslatePipe,
    LineagePipe,
    RelativeDatePipe,
    StatePipe,
    TitlePipe,
    FormIconPipe
  ]
})
export class ReportsContentComponent implements OnInit, OnDestroy {
  subscription: Subscription = new Subscription();
  private globalActions: GlobalActions;
  private reportsActions: ReportsActions;
  forms;
  loadingContent;
  selectedReports;
  selectMode;
  validChecks;
  summaries;
  fastActionList?: FastAction[];

  constructor(
    private readonly changesService:ChangesService,
    private readonly store:Store,
    private readonly dbService: DbService,
    private readonly route:ActivatedRoute,
    private readonly router:Router,
    private readonly searchFiltersService:SearchFiltersService,
    private readonly fastActionButtonService:FastActionButtonService,
    private readonly messageStateService:MessageStateService,
    private readonly responsiveService:ResponsiveService,
    private readonly modalService:ModalService,
    private readonly searchTelemetryService: SearchTelemetryService,
  ) {
    this.globalActions = new GlobalActions(store);
    this.reportsActions = new ReportsActions(store);
  }

  ngOnInit() {
    this.subscribeToStore();
    this.watchReportsContentChanges();

    const routeSubscription = this.route.params.subscribe(params => {
      if (params.id) {
        this.reportsActions.selectReportToOpen(this.route.snapshot.params.id);
        this.globalActions.clearNavigation();
        return;
      }
      this.globalActions.unsetComponents();
    });
    this.subscription.add(routeSubscription);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.reportsActions.setSelectedReport();
  }

  private hasSelectedNewReport(selectedReport, nextSelectedReport): boolean {
    const hadNoReportSelected = selectedReport === null || selectedReport.length === 0;
    const hadDifferentReportSelected = Array.isArray(selectedReport) &&
        selectedReport.length === 1 &&
        selectedReport[0]._id !== nextSelectedReport._id;

    return hadNoReportSelected || hadDifferentReportSelected;
  }

  private async recordSearchTelemetry(selectedReport, nextSelectedReport, nextFilters) {
    if (!nextFilters?.search || !nextSelectedReport) {
      return;
    }

    if (!this.hasSelectedNewReport(selectedReport, nextSelectedReport)) {
      return;
    }

    await this.searchTelemetryService.recordReportSearch(nextSelectedReport.doc, nextFilters.search);
  }

  private subscribeToStore() {
    const reportsSubscription = combineLatest([
      this.store.select(Selectors.getSelectedReport),
      this.store.select(Selectors.getSelectedReports),
      this.store.select(Selectors.getFilters),
    ]).subscribe(([
      selectedReport,
      selectedReports,
      filters
    ]) => {
      void this.recordSearchTelemetry(this.selectedReports, selectedReport, filters);
      if (selectedReport) {
        this.selectedReports = [ selectedReport ];
      } else {
        this.selectedReports = selectedReports && !this.isMobile() ? selectedReports: [];
      }

      this.summaries = this.selectedReports.map(item => item.formatted || item.summary);
      this.validChecks = this.selectedReports.map(item => item.summary?.valid || !item.formatted?.errors?.length);
    });
    this.subscription.add(reportsSubscription);

    const selectedReportSubscription = this.store
      .select(Selectors.getSelectedReportDoc)
      .subscribe(selectedReportDoc => this.updateFastActions(selectedReportDoc));
    this.subscription.add(selectedReportSubscription);

    const contextSubscription = combineLatest(
      this.store.select(Selectors.getForms),
      this.store.select(Selectors.getLoadingContent),
      this.store.select(Selectors.getSelectMode),
    ).subscribe(([
      forms,
      loadingContent,
      selectMode,
    ]) => {
      this.loadingContent = loadingContent;
      this.forms = forms;
      this.selectMode = selectMode;
    });
    this.subscription.add(contextSubscription);
  }

  private watchReportsContentChanges() {
    const isMatchingRouteParam = (change) => this.route.snapshot.params?.id === change.id;

    const changesSubscription = this.changesService.subscribe({
      key: 'reports-content',
      filter: (change) => {
        const isSelected = this.selectedReports &&
          this.selectedReports.length &&
          _.some(this.selectedReports, (item) => item._id === change.id);
        // When submitting new report that gets updated immediately by Sentinel,
        // we might be in a situation where we receive the change before the report was fully selected
        return isSelected || isMatchingRouteParam(change);
      },
      callback: (change) => {
        if (change.deleted) {
          if (this.selectMode) {
            this.deselect(change.id);
            return;
          }
          this.router.navigate([this.route.snapshot.parent?.routeConfig?.path]);
          return;
        }

        if (!this.route.snapshot.params?.id || isMatchingRouteParam(change)) {
          // Avoid selecting this report if a different report is already being routed to
          this.reportsActions.selectReportToOpen(change.id, { silent: true });
          return;
        }
      }
    });
    this.subscription.add(changesSubscription);
  }

  trackByFn(index, item) {
    return item.doc?._id + item.doc?._rev;
  }

  toggleExpand(report) {
    if (!this.selectMode || !report?._id) {
      return;
    }

    const id = report._id;
    if (report.doc || report.expanded) {
      this.reportsActions.updateSelectedReportsItem(id, { expanded: !report.expanded });
    } else {
      this.reportsActions.updateSelectedReportsItem(id, { loading: true, expanded: true });
      this.reportsActions.selectReport(id);
    }
  }

  deselect(report:string|Record<string, any>, event?) {
    if (!this.selectMode) {
      return;
    }

    if (event) {
      event.stopPropagation();
    }

    this.reportsActions.removeSelectedReport(report);
  }

  search(query) {
    if (this.selectMode) {
      return;
    }
    this.searchFiltersService.freetextSearch(query);
  }

  canMute(group) {
    return this.messageStateService.any(group, 'scheduled');
  }

  canSchedule(group) {
    return this.messageStateService.any(group, 'muted');
  }

  private setMessageState(report, group, from, to, localContext:any={}) {
    localContext.loading = true;
    const id = report?._id;
    const groupNumber = group?.rows?.[0]?.group;
    return this.messageStateService
      .set(id, groupNumber, from, to)
      .catch((err) => {
        localContext.loading = false;
        console.error('Error setting message state', err);
      });
  }

  private getReportContact(contactId: string) {
    return this.dbService
      .get()
      .get(contactId)
      .catch(error => {
        // Log the error but continue anyway.
        console.error('Error fetching contact for fast action button', error);
      });
  }

  private async updateFastActions(selectedReportDoc) {
    if (this.selectMode || !selectedReportDoc) {
      return;
    }

    this.fastActionList = await this.fastActionButtonService.getReportRightSideActions({
      reportContentType: selectedReportDoc.content_type,
      communicationContext: {
        sendTo: await this.getReportContact(selectedReportDoc.contact._id),
        callbackOpenSendMessage: (sendTo) => this.modalService.show(SendMessageComponent, { data: { to: sendTo } }),
      },
    });
  }

  mute(report, group, localContext) {
    this.setMessageState(report, group, 'scheduled', 'muted', localContext);
  }

  schedule(report, group, localContext) {
    this.setMessageState(report, group, 'muted', 'scheduled', localContext);
  }

  edit(report, group) {
    return this.modalService.show(EditMessageGroupComponent, { data: { report, group: _.cloneDeep(group) } });
  }

  isMobile() {
    return this.responsiveService.isMobile();
  }
}
