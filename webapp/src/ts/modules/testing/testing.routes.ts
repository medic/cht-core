import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { TestingComponent } from './testing.component';

const routes:Routes = [
  {
    path: '',
    component: TestingComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TestingRoutingModule { }
