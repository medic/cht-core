import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { AccordionModule } from 'ngx-bootstrap/accordion';
import { FormsModule } from '@angular/forms';

import  { PipesModule } from '@mm-pipes/pipes.module';

import { HomeComponent } from '@mm-modules/home/home.component';
import { AboutComponent } from './about/about.component';
import { ConfigurationUserComponent } from './configuration-user/configuration-user.component';
import { ErrorComponent } from './error/error.component';
import { AnalyticsComponent } from './analytics/analytics.component';
import { ReportsComponent } from './reports/reports.component';
import { ReportsContentComponent } from './reports/reports-content.component';
import { ReportsAddComponent } from '@mm-modules/reports/reports-add.component';
import { ReportsFiltersComponent } from '@mm-modules/reports/reports-filters.component';
import { ComponentsModule } from '../components/components.module';
import { MessagesComponent } from './messages/messages.component';
import { ContactsComponent } from './contacts/contacts.component';
import { ContactsContentComponent } from '@mm-modules/contacts/contacts-content.component';
import { ContactsFiltersComponent } from '@mm-modules/contacts/contacts-filters.component';
import { ContactsDeceasedComponent } from '@mm-modules/contacts/contacts-deceased.component';
import { ContactsEditComponent } from '@mm-modules/contacts/contacts-edit.component';
import { MessagesContentComponent } from './messages/messages-content.component';
import { PrivacyPolicyComponent } from './privacy-policy/privacy-policy.component';
import { AnalyticsTargetsComponent } from './analytics/analytics-targets.component';
import { AnalyticsModulesComponent } from './analytics/analytics-modules.component';
import { AnalyticsTargetAggregatesComponent } from './analytics/analytics-target-aggregates.component';
import { AnalyticsTargetAggregatesDetailComponent } from './analytics/analytics-target-aggregates-detail.component';
import { TasksComponent } from '@mm-modules/tasks/tasks.component';
import { TasksContentComponent } from '@mm-modules/tasks/tasks-content.component';
import { ThemeComponent } from '@mm-modules/theme/theme.component';

@NgModule({
  declarations: [
    HomeComponent,
    AboutComponent,
    ConfigurationUserComponent,
    ErrorComponent,
    AnalyticsComponent,
    ReportsComponent,
    ReportsAddComponent,
    ReportsContentComponent,
    MessagesComponent,
    ContactsComponent,
    ReportsFiltersComponent,
    ContactsContentComponent,
    ContactsFiltersComponent,
    ContactsDeceasedComponent,
    ContactsEditComponent,
    MessagesContentComponent,
    PrivacyPolicyComponent,
    AnalyticsTargetsComponent,
    AnalyticsModulesComponent,
    AnalyticsTargetAggregatesComponent,
    AnalyticsTargetAggregatesDetailComponent,
    TasksComponent,
    TasksContentComponent,
    ThemeComponent,
  ],
  imports: [
    CommonModule,
    TranslateModule,
    PipesModule,
    RouterModule,
    ComponentsModule,
    BsDropdownModule,
    FormsModule,
    AccordionModule,
  ],
  exports: [
    HomeComponent,
    AboutComponent,
    ConfigurationUserComponent,
    ErrorComponent,
    AnalyticsComponent,
    ReportsComponent,
    MessagesComponent,
    ContactsComponent,
    PrivacyPolicyComponent,
    TasksComponent,
  ]
})
export class ModulesModule { }
