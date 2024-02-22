import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';

import { PipesModule } from '@mm-pipes/pipes.module';
import { ComponentsModule } from '@mm-components/components.module';

import { TasksComponent } from './tasks.component';
import { TasksRoutingModule } from './tasks.routes';
import { TasksContentComponent } from './tasks-content.component';
import { TasksGroupComponent } from './tasks-group.component';

@NgModule({
  declarations: [
    TasksComponent,
    TasksContentComponent,
    TasksGroupComponent,
  ],
  imports: [
    CommonModule,
    TranslateModule,
    PipesModule,
    RouterModule,
    ComponentsModule,
    TasksRoutingModule,
  ],
  exports: [
    TasksComponent,
  ]
})
export class TasksModule { }
