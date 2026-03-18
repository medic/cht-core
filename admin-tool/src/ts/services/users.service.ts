import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private http = inject(HttpClient);

  async getUsers(): Promise<any[]> {
    return firstValueFrom(
      this.http.get<any[]>('/api/v2/users', { withCredentials: true })
    );
  }
}