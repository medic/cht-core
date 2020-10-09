import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';

import { PipesModule } from '../pipes/pipes.module';

import { AboutComponent } from './about/about.component';
import { ErrorComponent } from './error/error.component';
import { AnalyticsComponent } from './analytics/analytics.component';
import { ReportsComponent } from './reports/reports.component';
import { ReportsContentComponent } from './reports/reports-content.component';
import { ReportsFiltersComponent } from '@mm-modules/reports/reports-filters.component';
import { ComponentsModule } from '../components/components.module';
import { MessagesComponent } from './messages/messages.component';
import { ContactsComponent } from './contacts/contacts.component';
import { ContactsContentComponent } from './contacts/contacts-content.component';
import { ContactsFiltersComponent } from '@mm-modules/contacts/contacts-filters.component';

@NgModule({
  declarations: [
    AboutComponent,
    ErrorComponent,
    AnalyticsComponent,
    ReportsComponent,
    ReportsContentComponent,
    MessagesComponent,
    ContactsComponent,
    ReportsFiltersComponent,
    ContactsContentComponent,
    ContactsFiltersComponent,
  ],
  imports: [
    CommonModule,
    TranslateModule,
    PipesModule,
    RouterModule,
    ComponentsModule,
    BsDropdownModule,
  ],
  exports: [
    AboutComponent,
    ErrorComponent,
    AnalyticsComponent,
    ReportsComponent,
    ReportsContentComponent,
    MessagesComponent,
    ContactsComponent,
    ContactsContentComponent,
  ]
})
export class ModulesModule { }
