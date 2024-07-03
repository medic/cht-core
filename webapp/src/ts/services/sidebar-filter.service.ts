import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SidebarFilterService {
  private toggleFilterSubject = new Subject<void>();
  toggleFilter = this.toggleFilterSubject.asObservable();

  triggerToggleFilter() {
    this.toggleFilterSubject.next();
  }
}
