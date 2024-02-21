import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';

import { PipesModule } from '@mm-pipes/pipes.module';
import { ComponentsModule } from '@mm-components/components.module';
import { DirectivesModule } from '@mm-directives/directives.module';

import { AnalyticsComponent } from './analytics.component';
import { AnalyticsTargetsComponent } from './analytics-targets.component';
import { AnalyticsModulesComponent } from './analytics-modules.component';
import { AnalyticsTargetAggregatesComponent } from './analytics-target-aggregates.component';
import { AnalyticsTargetAggregatesDetailComponent } from './analytics-target-aggregates-detail.component';
import { AnalyticsRoutingModule } from './analytics.routes';
import { AnalyticsTargetsProgressComponent } from '@mm-components/analytics-targets-progress/analytics-targets-progress.component';
import { AnalyticsFilterComponent } from '@mm-components/filters/analytics-filter/analytics-filter.component';
import { AnalyticsTargetsDetailsComponent } from '@mm-components/analytics-targets-details/analytics-targets-details.component';

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
    BsDropdownModule,
    FormsModule,
    DirectivesModule,
    MatIconModule,
    MatButtonModule,
    MatBottomSheetModule,
    MatCardModule,
    MatDialogModule,
    MatExpansionModule,
    MatMenuModule,
    AnalyticsRoutingModule,
  ],
  exports: [
    AnalyticsComponent,
  ]
})
export class AnalyticsModule { }
