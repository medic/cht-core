import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ResponsiveService {
  private mobile;
  private viewportSubject = new Subject();
  viewportChanged$ = this.viewportSubject.asObservable();


  setMobile(isMobile) {
    if (this.mobile !== isMobile) {
      this.mobile = isMobile;
      this.viewportSubject.next(isMobile);
    }
  }

  isMobile() {
    return this.mobile;
  }
}
