import { Injectable } from '@angular/core';
import { AppModule } from '../app.module';

@Injectable({
  providedIn: AppModule
})
export class CHTScriptApiService {
  isInitialized(): any {
    throw new Error('Method not implemented.');
  }

  async getApi(): Promise<any> {
    throw new Error('Method not implemented.');
  }

}
