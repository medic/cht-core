import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formIconName'
})
export class FormIconNamePipe implements PipeTransform {
  constructor() {}

  transform(record, forms): any {
    if (!record || !record.form || !forms) {
      return;
    }

    const form = forms.find(form => form.code === record.form);
    return form?.icon;
  }
}
