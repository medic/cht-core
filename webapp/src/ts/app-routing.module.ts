import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { routes as aboutRoutes } from './modules/about/about.routes';
import { routes as errorRoutes } from './modules/error/error.routes';

const routes: Routes = [
  ...aboutRoutes,
  ...errorRoutes,
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
