import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ConfigurationUserComponent } from './configuration-user.component';

const routes:Routes = [
  {
    path: '',
    component: ConfigurationUserComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ConfigurationUserRoutingModule { }
