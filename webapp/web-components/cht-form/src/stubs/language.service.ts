import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  async get(): Promise<any> {
    console.log('LanguageService.get()');
    return 'en';
  }

  useDevanagariScript(): boolean {
    throw new Error('Method not implemented.');
  }
}
