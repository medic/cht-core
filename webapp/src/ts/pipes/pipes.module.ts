import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HeaderLogoPipe, ResourceIconPipe, PartnerImagePipe } from './resource-icon.pipe';


@NgModule({
  declarations: [
    HeaderLogoPipe,
    ResourceIconPipe,
    PartnerImagePipe,
  ],
  imports: [
    CommonModule,
  ],
  exports: [
    HeaderLogoPipe,
    ResourceIconPipe,
    PartnerImagePipe,
  ]
})
export class PipesModule { }
