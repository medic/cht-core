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
import { HomeComponent } from '@mm-modules/home/home.component';
import { AboutComponent } from '@mm-modules/about/about.component';
import { ConfigurationUserComponent } from '@mm-modules/configuration-user/configuration-user.component';
import { ErrorComponent } from '@mm-modules/error/error.component';
import { ComponentsModule } from '@mm-components/components.module';
import { PrivacyPolicyComponent } from '@mm-modules/privacy-policy/privacy-policy.component';

import { TestingComponent } from '@mm-modules/testing/testing.component';
import { DirectivesModule } from '@mm-directives/directives.module';

@NgModule({
  declarations: [
    HomeComponent,
    AboutComponent,
    ConfigurationUserComponent,
    ErrorComponent,
    PrivacyPolicyComponent,
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
    DirectivesModule,
    MatIconModule,
    MatButtonModule,
    MatBottomSheetModule,
    MatCardModule,
    MatDialogModule,
    MatExpansionModule,
    MatMenuModule,
  ],
  exports: [
    HomeComponent,
    AboutComponent,
    ConfigurationUserComponent,
    ErrorComponent,
    PrivacyPolicyComponent,
  ]
})
export class ModulesModule { }
