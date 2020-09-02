import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from "@ngx-translate/core";

import { MmModal } from './mm-modal/mm-modal';
import { ReloadingComponent } from './reloading/reloading.component';
import { LogoutConfirmComponent } from './logout/logout-confirm.component';


@NgModule({
  declarations: [
    MmModal,
    ReloadingComponent,
    LogoutConfirmComponent,
  ],
  imports: [
    CommonModule,
    TranslateModule,
  ],
  exports: [
    ReloadingComponent,
    LogoutConfirmComponent,
  ]
})
export class ModalsModule { }
