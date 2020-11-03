import { Injectable, Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { ResourceIconsService } from '@mm-services/resource-icons.service';

@Pipe({
  name: 'resourceIcon'
})
@Injectable({
  providedIn: 'root'
})
export class ResourceIconPipe implements PipeTransform {
  constructor(
    private resourceIcons: ResourceIconsService,
    private sanitizer: DomSanitizer,
  ) { }

  transform(name:string, placeholder = '') {
    return this.sanitizer.bypassSecurityTrustHtml(this.resourceIcons.getImg(name, 'resources', placeholder));
  }
}

@Pipe({
  name: 'headerLogo'
})
@Injectable({
  providedIn: 'root'
})
export class HeaderLogoPipe implements PipeTransform {
  constructor(
    private resourceIcons: ResourceIconsService,
    private sanitizer: DomSanitizer
  ) { }

  transform(name: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.resourceIcons.getImg(name, 'branding'));
  }
}

@Pipe({
  name: 'partnerImage'
})
@Injectable({
  providedIn: 'root'
})
export class PartnerImagePipe implements PipeTransform {
  constructor(
    private resourceIcons: ResourceIconsService,
    private sanitizer: DomSanitizer,
  ) { }

  transform(name:string) {
    return this.sanitizer.bypassSecurityTrustHtml(this.resourceIcons.getImg(name, 'partners'));
  }
}

