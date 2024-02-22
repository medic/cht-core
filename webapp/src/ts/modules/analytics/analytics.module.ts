import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';

import { PipesModule } from '@mm-pipes/pipes.module';
import { ComponentsModule } from '@mm-components/components.module';

import { AnalyticsComponent } from './analytics.component';
import { AnalyticsRoutingModule } from './analytics.routes';
import { AnalyticsTargetsComponent } from './analytics-targets.component';
import { AnalyticsModulesComponent } from './analytics-modules.component';
import { AnalyticsTargetAggregatesComponent } from './analytics-target-aggregates.component';
import { AnalyticsTargetAggregatesDetailComponent } from './analytics-target-aggregates-detail.component';
import { AnalyticsFilterComponent } from '@mm-components/filters/analytics-filter/analytics-filter.component';
import { AnalyticsTargetsProgressComponent }
  from '@mm-components/analytics-targets-progress/analytics-targets-progress.component';
import { AnalyticsTargetsDetailsComponent } from
  '@mm-components/analytics-targets-details/analytics-targets-details.component';
import { DirectivesModule } from '@mm-directives/directives.module';

@NgModule({
  declarations: [
    AnalyticsComponent,
    AnalyticsTargetsComponent,
    AnalyticsModulesComponent,
    AnalyticsTargetAggregatesComponent,
    AnalyticsTargetAggregatesDetailComponent,
    AnalyticsTargetsProgressComponent,
    AnalyticsFilterComponent,
    AnalyticsTargetsDetailsComponent,
  ],
  imports: [
    CommonModule,
    TranslateModule,
    PipesModule,
    RouterModule,
    ComponentsModule,
    DirectivesModule,
    AnalyticsRoutingModule,
  ],
  exports: [
    AnalyticsComponent,
  ]
})
export class AnalyticsModule { }
