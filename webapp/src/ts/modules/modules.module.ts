import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { FormsModule } from '@angular/forms';

import  { PipesModule } from '@mm-pipes/pipes.module';

import { AboutComponent } from './about/about.component';
import {ConfigurationUserComponent} from './configuration-user/configuration-user.component';
import { ErrorComponent } from './error/error.component';
import { AnalyticsComponent } from './analytics/analytics.component';
import { ReportsComponent } from './reports/reports.component';
import { ReportsContentComponent } from './reports/reports-content.component';
import { ReportsAddComponent } from '@mm-modules/reports/reports-add.component';
import { ReportsFiltersComponent } from '@mm-modules/reports/reports-filters.component';
import { ComponentsModule } from '../components/components.module';
import { MessagesComponent } from './messages/messages.component';
import { MessagesContentComponent } from './messages/messages-content.component';
import { PrivacyPolicyComponent } from './privacy-policy/privacy-policy.component';
import { AnalyticsTargetsComponent } from './analytics/analytics-targets.component';
import { AnalyticsModulesComponent } from './analytics/analytics-modules.component';

@NgModule({
  declarations: [
    AboutComponent,
    ConfigurationUserComponent,
    ErrorComponent,
    AnalyticsComponent,
    ReportsComponent,
    ReportsAddComponent,
    ReportsContentComponent,
    MessagesComponent,
    ReportsFiltersComponent,
    MessagesContentComponent,
    PrivacyPolicyComponent,
    AnalyticsTargetsComponent,
    AnalyticsModulesComponent,
  ],
  imports: [
    CommonModule,
    TranslateModule,
    PipesModule,
    RouterModule,
    ComponentsModule,
    BsDropdownModule,
    FormsModule,
  ],
  exports: [
    AboutComponent,
    ConfigurationUserComponent,
    ErrorComponent,
    AnalyticsComponent,
    ReportsComponent,
    MessagesComponent,
    PrivacyPolicyComponent,
  ]
})
export class ModulesModule { }
