import { Pipe, PipeTransform, Injectable } from '@angular/core';

import { ResourceIconPipe } from '@mm-pipes/resource-icon.pipe';
import { FormIconNamePipe } from '@mm-pipes/form-icon-name.pipe';

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
