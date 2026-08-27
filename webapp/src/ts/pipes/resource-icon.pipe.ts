import { Injectable, Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { CustomResourceService } from '@mm-services/custom-resource.service';
import { DOC_IDS } from '@medic/constants';

@Pipe({
  name: 'resourceIcon'
})
@Injectable({
  providedIn: 'root'
})
export class ResourceIconPipe implements PipeTransform {
  constructor(
    private readonly resourceIcons: CustomResourceService,
    private sanitizer: DomSanitizer,
  ) { }

  transform(name:string, placeholder = '') {
    return this.sanitizer.bypassSecurityTrustHtml(this.resourceIcons.getImg(name, DOC_IDS.RESOURCES, placeholder));
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
    private readonly resourceIcons: CustomResourceService,
    private sanitizer: DomSanitizer
  ) { }

  transform(name: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.resourceIcons.getImg(name, DOC_IDS.BRANDING));
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
    private readonly resourceIcons: CustomResourceService,
    private sanitizer: DomSanitizer,
  ) { }

  transform(name:string) {
    return this.sanitizer.bypassSecurityTrustHtml(this.resourceIcons.getImg(name, DOC_IDS.PARTNERS));
  }
}

