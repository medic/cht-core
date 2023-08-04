import { Injectable } from '@angular/core';
import { AppModule } from '../app.module';

@Injectable({
  providedIn: AppModule
})
export class SearchService {

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  search(type, filters, options:any = {}, extensions:any = {}, docIds: any[] | undefined = undefined): any {
    throw new Error('Method not implemented.');
  }
}
