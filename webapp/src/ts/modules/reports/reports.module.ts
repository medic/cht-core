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
import { EffectsModule } from '@ngrx/effects';

import { PipesModule } from '@mm-pipes/pipes.module';
import { ComponentsModule } from '@mm-components/components.module';
import { DirectivesModule } from '@mm-directives/directives.module';

import { ReportsComponent } from './reports.component';
import { ReportsContentComponent } from './reports-content.component';
import { ReportsAddComponent } from './reports-add.component';
import { ReportsFiltersComponent } from './reports-filters.component';
import { ReportsSidebarFilterComponent } from './reports-sidebar-filter.component';
import { ReportsMoreMenuComponent } from './reports-more-menu.component';
import { ReportsEffects } from '@mm-effects/reports.effects';
import { ReportsRoutingModule } from './reports.routes';
import { DateFilterComponent } from '@mm-components/filters/date-filter/date-filter.component';

@NgModule({
  declarations: [
    ReportsComponent,
    ReportsAddComponent,
    ReportsContentComponent,
    ReportsFiltersComponent,
    ReportsSidebarFilterComponent,
    ReportsMoreMenuComponent,
    DateFilterComponent,
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
    ReportsRoutingModule,
    EffectsModule.forFeature([ ReportsEffects ]),
  ],
  exports: [
    ReportsComponent,
  ]
})
export class ReportsModule { }
