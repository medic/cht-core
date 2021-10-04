import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EffectsModule } from '@ngrx/effects';
import { ReportsRoutingModule } from './reports.routes';
import { ReportsComponent } from './reports.component';
import { ReportsContentComponent } from './reports-content.component';
import { ReportsAddComponent } from './reports-add.component';
import { ReportsFiltersComponent } from './reports-filters.component';
import { ComponentsModule } from '@mm-components/components.module';
import { TranslateModule } from '@ngx-translate/core';
import { PipesModule } from '@mm-pipes/pipes.module';
import { ReportsEffects } from '@mm-effects/reports.effects';
import { ReportViewModelGeneratorService } from '@mm-services/report-view-model-generator.service';
import { FormatDataRecordService } from '@mm-services/format-data-record.service';

@NgModule({
  imports: [
    CommonModule,
    ReportsRoutingModule,
    ComponentsModule,
    TranslateModule,
    PipesModule,
    EffectsModule.forFeature([ ReportsEffects ]),
  ],
  declarations: [
    ReportsComponent,
    ReportsAddComponent,
    ReportsContentComponent,
    ReportsFiltersComponent,
  ],
  providers: [
    ReportViewModelGeneratorService,
    FormatDataRecordService
  ],
  exports: [
  ]
})
export class ReportsModule { }
