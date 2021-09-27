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
import { ComponentsModule } from '../components/components.module';
import { MessagesComponent } from './messages/messages.component';
import { ContactsComponent } from './contacts/contacts.component';
import { ContactsContentComponent } from '@mm-modules/contacts/contacts-content.component';
import { ContactsFiltersComponent } from '@mm-modules/contacts/contacts-filters.component';
import { ContactsDeceasedComponent } from '@mm-modules/contacts/contacts-deceased.component';
import { ContactsReportComponent } from '@mm-modules/contacts/contacts-report.component';
import { ContactsEditComponent } from '@mm-modules/contacts/contacts-edit.component';
import { MessagesContentComponent } from './messages/messages-content.component';
import { PrivacyPolicyComponent } from './privacy-policy/privacy-policy.component';
import { AnalyticsTargetsComponent } from './analytics/analytics-targets.component';
import { AnalyticsModulesComponent } from './analytics/analytics-modules.component';
import { AnalyticsTargetAggregatesComponent } from './analytics/analytics-target-aggregates.component';
import { AnalyticsTargetAggregatesDetailComponent } from './analytics/analytics-target-aggregates-detail.component';
import { TasksComponent } from '@mm-modules/tasks/tasks.component';
import { TasksContentComponent } from '@mm-modules/tasks/tasks-content.component';
import { TasksGroupComponent } from '@mm-modules/tasks/tasks-group.component';
import { ThemeComponent } from '@mm-modules/theme/theme.component';
import { TestingComponent } from './testing/testing.component';

@NgModule({
  declarations: [
    HomeComponent,
    AboutComponent,
    ConfigurationUserComponent,
    ErrorComponent,
    AnalyticsComponent,
    MessagesComponent,
    ContactsComponent,
    ContactsContentComponent,
    ContactsFiltersComponent,
    ContactsDeceasedComponent,
    ContactsReportComponent,
    ContactsEditComponent,
    MessagesContentComponent,
    PrivacyPolicyComponent,
    AnalyticsTargetsComponent,
    AnalyticsModulesComponent,
    AnalyticsTargetAggregatesComponent,
    AnalyticsTargetAggregatesDetailComponent,
    TasksComponent,
    TasksContentComponent,
    TasksGroupComponent,
    ThemeComponent,
    TestingComponent,
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
    MessagesComponent,
    ContactsComponent,
    PrivacyPolicyComponent,
    TasksComponent,
  ]
})
export class ModulesModule { }
