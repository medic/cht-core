import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

import { GlobalActions } from '@mm-actions/global';
import { PerformanceService } from '@mm-services/performance.service';
import { TrainingCardsService } from '@mm-services/training-cards.service';

// const PAGE_SIZE = 50; // ToDo -- add pagination

@Component({
  templateUrl: './trainings.component.html'
})
export class TrainingsComponent implements AfterViewInit, OnDestroy {
  private globalActions: GlobalActions;
  private trackInitialLoadPerformance;

  subscription: Subscription = new Subscription();
  trainingList = null;
  error = false;
  moreTrainings = false;
  hasTrainings = false;
  loading = true;

  constructor(
    private readonly store: Store,
    private readonly router: Router,
    private readonly performanceService: PerformanceService,
    private readonly trainingCardsService: TrainingCardsService,
  ) {
    this.globalActions = new GlobalActions(this.store);
  }

  ngAfterViewInit() {
    this.trackInitialLoadPerformance = this.performanceService.track();
    this.getTrainings();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.globalActions.unsetSelected();
  }

  async getTrainings() {
    this.trainingList = await this.trainingCardsService.getAllAvailableTrainings();
    console.warn(this.trainingList);
    this.loading = false;
    await this.recordInitialLoadPerformance();
  }

  /*private async prepareReports(reports, isContent=false) {
    const userLineageLevel = await this.userLineageLevel;
    return reports.map(report => {
      const form = _find(this.forms, { code: report.form });
      const subTitle = form ? form.title : report.form;
      report.summary = isContent ? { ...report } : subTitle;
      report.expanded = false;
      report.icon = form && form.icon;
      report.heading = this.getReportHeading(form, report);
      report.lineage = report.subject && report.subject.lineage || report.lineage;
      report.unread = !report.read;
      if (Array.isArray(report.lineage)) {
        report.lineage = this.extractLineageService.removeUserFacility(report.lineage, userLineageLevel);
      }

      return report;
    });
  }*/

  private async recordInitialLoadPerformance() {
    if (!this.trackInitialLoadPerformance) {
      return;
    }
    await this.trackInitialLoadPerformance.stop({ name: 'training_materials_list:load', recordApdex: true });
    this.trackInitialLoadPerformance = null;
  }

  trackBy(index, training) {
    return training._id + training._rev + training.selected;
  }
}
