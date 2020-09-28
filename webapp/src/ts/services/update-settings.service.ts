import { Injectable } from "@angular/core";
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class UpdateSettingsService {
  constructor(
    private http: HttpClient
  ){}

  update(updates, options=<any>{}) {
    const config = {
      params: { replace: options.replace },
      headers: { 'Content-Type': 'application/json' }
    };
    return this.http
      .put('/api/v1/settings', updates, config)
      .toPromise();
  }
}