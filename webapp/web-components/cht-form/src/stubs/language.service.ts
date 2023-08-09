import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  async get(): Promise<any> {
    throw new Error('Method not implemented.');
  }

  useDevanagariScript(): boolean {
    throw new Error('Method not implemented.');
  }
}
