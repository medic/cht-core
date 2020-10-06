import { Component, Input, OnDestroy, OnInit } from '@angular/core';

import { DbService } from '../../services/db.service';

@Component({
  selector: 'report-image',
  template: '<div class="loader"></div>'
})
export class ReportImageComponent implements OnInit, OnDestroy {
  @Input() report;
  @Input() path;

  loading;
  objectUrl;

  constructor(
    private dbService:DbService,
  ) {
    this.loading = true;
  }

  ngOnInit() {
    return this.dbService
      .get()
      .getAttachment(this.report, this.path)
      .then(blob => {
        this.objectUrl = (window.URL || window.webkitURL).createObjectURL(blob);
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
