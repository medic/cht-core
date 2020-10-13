import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

import { DbService } from '../../services/db.service';


@Component({
  selector: 'report-image',
  templateUrl: './report-image.component.html'
})
export class ReportImageComponent implements OnInit, OnDestroy {
  @Input() report;
  @Input() path;

  loading;
  objectUrl;

  constructor(
    private dbService:DbService,
    private domSanitizer:DomSanitizer,
  ) {
  }

  ngOnInit() {
    this.loading = true;
    return this.dbService
      .get()
      .getAttachment(this.report, this.path)
      .then(blob => {
        this.loading = false;
        const unsafeBlob = (window.URL || window.webkitURL).createObjectURL(blob);
        this.objectUrl = this.domSanitizer.bypassSecurityTrustUrl(unsafeBlob);
      });
  }

  ngOnDestroy() {
    if (this.objectUrl) {
      (window.URL || window.webkitURL).revokeObjectURL(this.objectUrl);
    }
  }
}
