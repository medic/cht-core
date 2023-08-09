import { Injectable } from '@angular/core';
import { AppModule } from '../app.module';

@Injectable({
  // providedIn: AppModule
  providedIn: 'root'
})
export class DbService {

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public get({ remote=false, meta=false, usersMeta=false }={}): any {
    throw new Error('Method not implemented.');
  }
}
