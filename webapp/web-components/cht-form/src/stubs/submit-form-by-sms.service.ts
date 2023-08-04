import { Injectable } from '@angular/core';
import { AppModule } from '../app.module';

@Injectable({
  providedIn: AppModule
})
export class SubmitFormBySmsService {

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  submit(doc): Promise<any> | undefined {
    throw new Error('Method not implemented.');
  }
}
