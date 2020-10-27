import { Injectable, Pipe, PipeTransform } from '@angular/core';

import { ResourceIconPipe } from './resource-icon.pipe';
import { FormIconNamePipe } from './form-icon-name.pipe';

@Pipe({
  name: 'formIcon'
})
@Injectable({
  providedIn: 'root'
})
export class FormIconPipe implements PipeTransform {
  constructor(
    private resourceIconPipe:ResourceIconPipe,
    private formIconNamePipe:FormIconNamePipe,
  ) {}

  transform(record, forms): any {
    return this.resourceIconPipe.transform(this.formIconNamePipe.transform(record, forms));
  }
}
