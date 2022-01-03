import { Injectable, Pipe, PipeTransform } from '@angular/core';

const bootstrapTranslator = require('../../js/bootstrapper/translator');

@Pipe({
  name: 'bootstrapTranslate'
})
@Injectable({
  providedIn: 'root'
})
export class BootstrapTranslatePipe implements PipeTransform {

  constructor() { }

  transform(key:string, args?:Record<string, any>) {
    return bootstrapTranslator.translate(key, args);
  }
}
