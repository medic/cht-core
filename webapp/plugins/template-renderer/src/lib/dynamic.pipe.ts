import { Pipe, PipeTransform, Injector } from '@angular/core';

@Pipe({ name: 'dynamicPipe', pure: true })
export class DynamicPipe implements PipeTransform {
  constructor(private injector: Injector) {}

  transform(value: any, pipeClass: any, args: any[] = []): any {
    if (!pipeClass) {
      return value;
    }
    const pipeInstance = this.injector.get<PipeTransform>(pipeClass);
    return pipeInstance.transform(value, ...args);
  }
}
