import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ResponsiveService {
  private mobile;

  setMobile(isMobile) {
    this.mobile = isMobile;
  }

  isMobile() {
    return this.mobile;
  }
}
