import { AfterViewChecked, Component, ElementRef, HostListener } from '@angular/core';

import { ResponsiveService } from '@mm-services/responsive.service';

@Component({
  template: '<div id="mobile-detection"></div>',
  selector: 'mobile-detection',
})
export class MobileDetectionComponent implements AfterViewChecked {
  constructor(
    private elementRef:ElementRef,
    private responsiveService:ResponsiveService,
  ) {
  }

  ngAfterViewChecked() {
    this.detectMobileScreenSize();
  }

  @HostListener('window:resize', [])
  private onResize() {
    this.detectMobileScreenSize();
  }

  private detectMobileScreenSize() {
    const element = this.elementRef.nativeElement.querySelector('#mobile-detection');
    const isVisible = window.getComputedStyle(element).display !== 'none';
    this.responsiveService.setMobile(isVisible);
  }
}
