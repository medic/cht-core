import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SidebarFilterService {
  private sideBarToggleSubject = new Subject<void>();

  toggleSidebarFilter(): void {
    this.sideBarToggleSubject.next();
  }

  getSidebarToggleEvents() {
    return this.sideBarToggleSubject.asObservable();
  }
}
