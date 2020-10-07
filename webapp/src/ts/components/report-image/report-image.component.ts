import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { SecurityContext } from '@angular/core';

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
        //this.objectUrl = this.domSanitizer.sanitize(SecurityContext.RESOURCE_URL, unsafeBlob);
        this.objectUrl = this.domSanitizer.bypassSecurityTrustUrl(unsafeBlob);
      });
  }

  ngOnDestroy() {
    if (this.objectUrl) {
      (window.URL || window.webkitURL).revokeObjectURL(this.objectUrl);
    }
  }
}


/*
angular.module('inboxDirectives').directive('reportImage',
  function(
    $window,
    DB
  ) {
    'use strict';
    'ngInject';

    return {
      template: '<div class="loader"></div>',
      link: function(scope, element, attr) {
        let objectUrl;

        DB().getAttachment(attr.report, attr.path)
          .then(function(blob) {
            const $newImg = $('<img class="report-image"/>');
            objectUrl = ($window.URL || $window.webkitURL).createObjectURL(blob);
            $newImg.attr('src', objectUrl);
            $(element).replaceWith($newImg);
          });

        scope.$on('$destroy', function() {
          if (objectUrl) {
            ($window.URL || $window.webkitURL).revokeObjectURL(objectUrl);
          }
        });

      },
    };
  });
*/
