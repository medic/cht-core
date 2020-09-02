import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { routes as aboutRoutes } from "./modules/about/about.routes";

const routes: Routes = [
  ...aboutRoutes,
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
