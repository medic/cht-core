import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DbService {

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public get({ remote=false, meta=false, usersMeta=false }={}): any {
    return {};
  }
}
