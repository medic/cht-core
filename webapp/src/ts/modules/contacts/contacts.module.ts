import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { EffectsModule } from '@ngrx/effects';

import { ComponentsModule } from '@mm-components/components.module';
import { PipesModule } from '@mm-pipes/pipes.module';

import { ContactsComponent } from './contacts.component';
import { ContactsContentComponent } from './contacts-content.component';
import { ContactsFiltersComponent } from './contacts-filters.component';
import { ContactsDeceasedComponent } from './contacts-deceased.component';
import { ContactsReportComponent } from './contacts-report.component';
import { ContactsEditComponent } from './contacts-edit.component';
import { ContactsMoreMenuComponent } from './contacts-more-menu.component';
import { ContactsRoutingModule } from './contacts.routes';
import { ContactsEffects } from '@mm-effects/contacts.effects';
import { MatButtonModule } from '@angular/material/button';
import { DirectivesModule } from '@mm-directives/directives.module';

@NgModule({
  declarations: [
    ContactsComponent,
    ContactsContentComponent,
    ContactsFiltersComponent,
    ContactsDeceasedComponent,
    ContactsReportComponent,
    ContactsEditComponent,
    ContactsMoreMenuComponent,
  ],
  imports: [
    ComponentsModule,
    CommonModule,
    PipesModule,
    TranslateModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    ContactsRoutingModule,
    DirectivesModule,
    EffectsModule.forFeature([ ContactsEffects ]),
  ],
  exports: [
    ContactsComponent
  ]
})
export class ContactsModule { }
