import { Injectable } from '@angular/core';
import { AppModule } from '../app.module';

@Injectable({
  providedIn: AppModule
})
export class ModalService {
  show(template, config?): Promise<any> {
    throw new Error('Method not implemented.');
  }
}
