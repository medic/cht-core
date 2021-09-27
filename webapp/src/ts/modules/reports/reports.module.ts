import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportsRoutingModule } from './reports.routes';
import { ReportsComponent } from './reports.component';
import { ReportsContentComponent } from './reports-content.component';
import { ReportsAddComponent } from './reports-add.component';
import { ReportsFiltersComponent } from './reports-filters.component';
import { ComponentsModule } from '@mm-components/components.module';
import { TranslateModule } from '@ngx-translate/core';
import { PipesModule } from '@mm-pipes/pipes.module';

@NgModule({
  imports: [
    CommonModule,
    ReportsRoutingModule,
    ComponentsModule,
    TranslateModule,
    PipesModule,
  ],
  declarations: [
    ReportsComponent,
    ReportsAddComponent,
    ReportsContentComponent,
    ReportsFiltersComponent,
  ],
  exports: [
  ]
})
export class ReportsModule { }
