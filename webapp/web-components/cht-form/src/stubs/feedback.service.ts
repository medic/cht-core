import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FeedbackService {
  init () {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  submit (info, isManual?): Promise<any> {
    console.log(`FeedbackService.submit(${JSON.stringify(info)}, ${isManual})`);
    return Promise.resolve();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _setOptions(_options) {
    throw new Error('Method not implemented.');
  }

}
