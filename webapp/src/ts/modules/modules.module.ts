import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';

import { PipesModule } from '@mm-pipes/pipes.module';
import { HomeComponent } from '@mm-modules/home/home.component';
import { AboutComponent } from '@mm-modules/about/about.component';
import { ConfigurationUserComponent } from '@mm-modules/configuration-user/configuration-user.component';
import { ErrorComponent } from '@mm-modules/error/error.component';
import { AnalyticsComponent } from '@mm-modules/analytics/analytics.component';
import { ReportsComponent } from '@mm-modules/reports/reports.component';
import { ReportsContentComponent } from '@mm-modules/reports/reports-content.component';
import { ReportsAddComponent } from '@mm-modules/reports/reports-add.component';
import { ReportsSidebarFilterComponent } from '@mm-modules/reports/reports-sidebar-filter.component';
import { ReportsMoreMenuComponent } from '@mm-modules/reports/reports-more-menu.component';
import { ComponentsModule } from '@mm-components/components.module';
import { MessagesComponent } from '@mm-modules/messages/messages.component';
import { MessagesMoreMenuComponent } from '@mm-modules/messages/messages-more-menu.component';
import { ContactsComponent } from '@mm-modules/contacts/contacts.component';
import { ContactsContentComponent } from '@mm-modules/contacts/contacts-content.component';
import { ContactsDeceasedComponent } from '@mm-modules/contacts/contacts-deceased.component';
import { ContactsReportComponent } from '@mm-modules/contacts/contacts-report.component';
import { ContactsEditComponent } from '@mm-modules/contacts/contacts-edit.component';
import { ContactsMoreMenuComponent } from '@mm-modules/contacts/contacts-more-menu.component';
import { MessagesContentComponent } from '@mm-modules/messages/messages-content.component';
import { PrivacyPolicyComponent } from '@mm-modules/privacy-policy/privacy-policy.component';
import { AnalyticsTargetsComponent } from '@mm-modules/analytics/analytics-targets.component';
import { AnalyticsModulesComponent } from '@mm-modules/analytics/analytics-modules.component';
import { AnalyticsTargetAggregatesComponent } from '@mm-modules/analytics/analytics-target-aggregates.component';
import { AnalyticsTargetAggregatesSidebarFilterComponent }
  from '@mm-modules/analytics/analytics-target-aggregates-sidebar-filter.component';
import {
  AnalyticsTargetAggregatesDetailComponent
} from '@mm-modules/analytics/analytics-target-aggregates-detail.component';
import { TrainingsComponent } from '@mm-modules/trainings/trainings.component';
import { TrainingsContentComponent } from '@mm-modules/trainings/trainings-content.component';
import { TasksComponent } from '@mm-modules/tasks/tasks.component';
import { TasksContentComponent } from '@mm-modules/tasks/tasks-content.component';
import { TasksGroupComponent } from '@mm-modules/tasks/tasks-group.component';
import { TestingComponent } from '@mm-modules/testing/testing.component';
import { DirectivesModule } from '@mm-directives/directives.module';
import { ModalsModule } from '@mm-modals/modals.module';

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        PipesModule,
        RouterModule,
        ComponentsModule,
        FormsModule,
        DirectivesModule,
        MatIconModule,
        MatButtonModule,
        MatBottomSheetModule,
        MatCardModule,
        MatDialogModule,
        MatExpansionModule,
        MatMenuModule,
        ModalsModule,
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
        ReportsSidebarFilterComponent,
        ReportsMoreMenuComponent,
        ContactsContentComponent,
        ContactsDeceasedComponent,
        ContactsReportComponent,
        ContactsEditComponent,
        ContactsMoreMenuComponent,
        MessagesContentComponent,
        MessagesMoreMenuComponent,
        PrivacyPolicyComponent,
        AnalyticsTargetsComponent,
        AnalyticsModulesComponent,
        AnalyticsTargetAggregatesComponent,
        AnalyticsTargetAggregatesDetailComponent,
        AnalyticsTargetAggregatesSidebarFilterComponent,
        TrainingsComponent,
        TrainingsContentComponent,
        TasksComponent,
        TasksContentComponent,
        TasksGroupComponent,
        TestingComponent,
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
        TrainingsComponent,
        TrainingsContentComponent,
        PrivacyPolicyComponent,
        TasksComponent,
    ]
})
export class ModulesModule { }
