import { Injectable } from '@angular/core';
import { AppModule } from '../app.module';

@Injectable({
  providedIn: AppModule
})
export class LanguageService {
  async get(): Promise<any> {
    throw new Error('Method not implemented.');
  }

  useDevanagariScript(): boolean {
    throw new Error('Method not implemented.');
  }
}
