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

import { ComponentsModule } from '@mm-components/components.module';
import { PipesModule } from '@mm-pipes/pipes.module';
import { GarethModule } from '../gareth/gareth.module';

import { ContactsComponent } from './contacts.component';
import { ContactsContentComponent } from './contacts-content.component';
import { ContactsFiltersComponent } from './contacts-filters.component';
import { ContactsDeceasedComponent } from './contacts-deceased.component';
import { ContactsReportComponent } from './contacts-report.component';
import { ContactsEditComponent } from './contacts-edit.component';
import { ContactsMoreMenuComponent } from './contacts-more-menu.component';
import { ContactsEffects } from '@mm-effects/contacts.effects';
import { ContactsRoutingModule } from './contacts.routes';

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
    BsDropdownModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatBottomSheetModule,
    MatCardModule,
    MatDialogModule,
    MatExpansionModule,
    MatMenuModule,
    ContactsRoutingModule,
    GarethModule,
    EffectsModule.forFeature([ ContactsEffects ]),
  ],
  exports: [
    ContactsComponent
  ]
})
export class ContactsModule { }
