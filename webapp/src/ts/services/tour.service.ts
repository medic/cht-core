import { isMobile } from '@mm-providers/responsive.provider';
import { AuthService } from './auth.service';
import { FeedbackService } from './feedback.service';
import { AnalyticsModulesService } from './analytics-modules.service';
import { SessionService } from './session.service';

import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { compact } from 'lodash-es';

@Injectable({
  providedIn: 'root'
})
export class TourService {

  current: {
    tour: any;
    name: any;
  };

  constructor(
    private analyticsModulesService: AnalyticsModulesService,
    private authService: AuthService,
    private feedbackService: FeedbackService,
    private sessionService: SessionService,
    private translateService: TranslateService,
    private router: Router,
  ) { }

  private mmScroll(container, elem) {
    container = $(container);
    if (container.length) {
      elem = container.find(elem);
      if (elem.length) {
        container.scrollTop(container.scrollTop() + elem.offset().top - 300);
      }
    }
  }

  private mmShowMessageList() {
    this.mmShow('#message-list', false);
  }

  private mmShowMessageContent() {
    this.mmShow('#message-list', true);
  }

  private mmShowTaskList() {
    this.mmShow('#tasks-list', false);
  }

  private mmShowTaskContent() {
    this.mmShow('#tasks-list', true);
  }

  private mmShowReportList() {
    this.mmShow('#reports-list', false);
  }

  private mmShowReportContent() {
    this.mmShow('#reports-list', true);
  }

  private mmShowContactList() {
    this.mmShow('#contacts-list', false);
  }

  private mmShowContactContent() {
    this.mmShow('#contacts-list', true);
  }

  private mmShow(list, showContent) {
    const showingContent = $('body').is('.show-content');
    if (showContent !== showingContent) {
      let firstLink = null;
      if (showContent) {
        firstLink = $(list).find('li').filter(':first').find('a')[0];
      } else if (isMobile()) {
        firstLink = $('.navigation .filter-bar-back a')[0];
      }
      if (firstLink) {
        firstLink.click();
      }
    }
  }

  private mmOpenDropdown(elem) {
    if (!isMobile()) {
      (<any>document.querySelector(elem + ' multi-dropdown-filter a.mm-button')).click();
    }
  }

  private tours: any[] = [
    {
      name: 'messages',
      route: '/messages',
      orphan: true,
      debug: true,
      steps: [
        {
          element: '#messages-tab',
          placement: 'bottom',
          title: 'tour.messages.unstructured.title',
          content: 'tour.messages.unstructured.description',
          onShow: () => this.mmShowMessageList()
        },
        {
          element: '#message-list',
          placement: 'right',
          mobilePlacement: 'orphan',
          title: 'tour.messages.list.title',
          content: 'tour.messages.list.description',
          onShow: () => this.mmShowMessageList()
        },
        {
          element: '#message-content',
          placement: 'left',
          mobilePlacement: 'orphan',
          title: 'tour.messages.exchange.title',
          content: 'tour.messages.exchange.description',
          onShow: () => this.mmShowMessageContent()
        },
        {
          element: '#message-header',
          placement: 'bottom',
          title: 'tour.messages.contact.title',
          content: 'tour.messages.contact.description',
          onShow: () => this.mmShowMessageContent()
        },
        {
          element: '#message-content .outgoing:last .message-body',
          placement: 'top',
          title: 'tour.messages.outgoing.title',
          content: 'tour.messages.outgoing.description',
          onShow: () => {
            this.mmShowMessageContent();
            this.mmScroll('#message-content', '.outgoing:last');
          }
        },
        {
          element: '#message-content .incoming:last .message-body',
          placement: 'top',
          title: 'tour.messages.incoming.title',
          content: 'tour.messages.incoming.description',
          onShow: () => {
            this.mmShowMessageContent();
            this.mmScroll('#message-content', '.incoming:last');
          }
        },
        {
          element: '#message-footer',
          placement: 'top',
          title: 'tour.messages.send.title',
          content: 'tour.messages.send.description',
          onShow: () => this.mmShowMessageContent()
        }
      ]
    },
    {
      name: 'tasks',
      route: '/tasks',
      orphan: true,
      debug: true,
      steps: [
        {
          element: '#tasks-tab',
          placement: 'bottom',
          title: 'tour.tasks.overview.title',
          content: 'tour.tasks.overview.description',
          onShow: () => this.mmShowTaskList()
        },
        {
          element: '#tasks-list',
          placement: 'right',
          mobilePlacement: 'orphan',
          title: 'tour.tasks.list.title',
          content: 'tour.tasks.list.description',
          onShow: () => this.mmShowTaskList()
        },
        {
          element: '.right-pane',
          placement: 'left',
          mobilePlacement: 'orphan',
          title: 'tour.tasks.details.title',
          content: 'tour.tasks.details.description',
          onShow: () => this.mmShowTaskContent()
        },
        {
          element: '.right-pane .next-page',
          placement: 'top',
          mobilePlacement: 'top',
          title: 'tour.tasks.next.title',
          content: 'tour.tasks.next.description',
          onShow: () => this.mmShowTaskContent()
        },
        {
          element: '.right-pane .form-footer',
          placement: 'top',
          mobilePlacement: 'top',
          title: 'tour.tasks.submit.title',
          content: 'tour.tasks.submit.description',
          onShow: () => this.mmShowTaskContent()
        },
        {
          element: '#tasks-list',
          placement: 'right',
          mobilePlacement: 'orphan',
          title: 'tour.tasks.cleared.title',
          content: 'tour.tasks.cleared.description',
          onShow: () => this.mmShowTaskContent()
        }
      ]
    },
    {
      name: 'reports',
      route: '/reports',
      orphan: true,
      debug: true,
      steps: [
        {
          element: '#reports-tab',
          placement: 'bottom',
          title: 'tour.reports.forms.title',
          content: 'tour.reports.forms.description',
          onShow: () => this.mmShowReportList()
        },
        {
          element: 'mm-form-type-filter',
          placement: 'right',
          mobilePlacement: 'bottom',
          title: 'tour.reports.types-filter.title',
          content: 'tour.reports.types-filter.description',
          onShow: () => this.mmShowReportList(),
          onShown: () => this.mmOpenDropdown('mm-form-type-filter')
        },
        {
          element: 'mm-facility-filter',
          placement: 'right',
          mobilePlacement: 'bottom',
          title: 'tour.reports.facilities-filter.title',
          content: 'tour.reports.facilities-filter.description',
          onShow: () => this.mmShowReportList(),
          onShown: () => this.mmOpenDropdown('mm-facility-filter')
        },
        {
          element: 'mm-date-filter',
          placement: 'left',
          mobilePlacement: 'bottom',
          title: 'tour.reports.date-filter.title',
          content: 'tour.reports.date-filter.description',
          onShow: () => this.mmShowReportList(),
          onShown: () => {
            if (!isMobile()) {
              $('#date-filter').trigger('click');
            }
          },
          onHide: () => {
            $('#date-filter').trigger('hide.daterangepicker');
          }
        },
        {
          element: 'mm-status-filter',
          placement: 'left',
          mobilePlacement: 'bottom',
          title: 'tour.reports.status-filter.title',
          content: 'tour.reports.status-filter.description',
          onShow: () => this.mmShowReportList(),
          onShown: () => this.mmOpenDropdown('mm-status-filter')
        },
        {
          element: '#freetext',
          mobileElement: '#mobile-search',
          placement: 'left',
          mobilePlacement: 'bottom',
          title: 'tour.reports.freetext-filter.title',
          content: 'tour.reports.freetext-filter.description',
          onShow: () => this.mmShowReportList()
        },
        {
          element: '#reports-list',
          placement: 'right',
          mobilePlacement: 'orphan',
          title: 'tour.reports.list.title',
          content: 'tour.reports.list.description',
          onShow: () => this.mmShowReportList()
        },
        {
          element: '#reports-list li:first-child .status',
          placement: 'right',
          mobilePlacement: 'bottom',
          title: 'tour.reports.status.title',
          content: 'tour.reports.status.description',
          onShow: () => this.mmShowReportList()
        },
        {
          element: '#reports-content',
          placement: 'left',
          mobilePlacement: 'orphan',
          title: 'tour.reports.details.title',
          content: 'tour.reports.details.description',
          onShow: () => this.mmShowReportContent()
        },
        {
          element: '#reports-content .item-summary',
          placement: 'left',
          mobilePlacement: 'bottom',
          title: 'tour.reports.information.title',
          content: 'tour.reports.information.description',
          onShow: () => this.mmShowReportContent()
        },
        {
          element: '#reports-content .report-body',
          placement: 'left',
          mobilePlacement: 'top',
          title: 'tour.reports.content.title',
          content: 'tour.reports.content.description',
          onShow: () => this.mmShowReportContent()
        },
        {
          element: '.detail-actions:not(.ng-hide)',
          placement: 'top',
          title: 'tour.reports.actions.title',
          content: 'tour.reports.actions.description',
          onShow: () => this.mmShowReportContent()
        }
      ]
    },
    {
      name: 'contacts',
      route: '/contacts',
      orphan: true,
      debug: true,
      steps: [
        {
          element: '#contacts-tab',
          placement: 'bottom',
          title: 'tour.contacts.overview.title',
          content: 'tour.contacts.overview.description',
          onShow: () => this.mmShowContactList()
        },
        {
          element: '#freetext',
          mobileElement: '#mobile-search',
          placement: 'bottom',
          mobilePlacement: 'bottom',
          title: 'tour.contacts.search.title',
          content: 'tour.contacts.search.description',
          onShow: () => this.mmShowContactList()
        },
        {
          element: '.general-actions:not(.ng-hide)',
          placement: 'top',
          mobilePlacement: 'top',
          title: 'tour.contacts.add.title',
          content: 'tour.contacts.add.description',
          onShow: () => this.mmShowContactList()
        },
        {
          element: '#contacts-list',
          placement: 'right',
          mobilePlacement: 'orphan',
          title: 'tour.contacts.list.title',
          content: 'tour.contacts.list.description',
          onShow: () => this.mmShowContactList()
        },
        {
          element: '.item-content .meta',
          placement: 'left',
          mobilePlacement: 'orphan',
          title: 'tour.contacts.details.title',
          content: 'tour.contacts.details.description',
          onShow: () => this.mmShowContactContent()
        },
        {
          element: '.detail-actions:not(.ng-hide)',
          placement: 'top',
          mobilePlacement: 'top',
          title: 'tour.contacts.actions.title',
          content: 'tour.contacts.actions.description',
          onShow: () => this.mmShowContactContent()
        }
      ]
    },
    {
      name: 'analytics',
      route: '/analytics',
      orphan: true,
      debug: true,
      steps: [
        {
          element: '#analytics-tab',
          placement: 'bottom',
          title: 'tour.analytics.overview.title',
          content: 'tour.analytics.overview.description'
        }
      ]
    }
  ]

  private createTemplate() {
    return  `<div class="popover tour">
              <div class="arrow"></div>
              <h3 class="popover-title"></h3>
              <div class="popover-content"></div>
              <div class="popover-navigation">
                <div class="btn-group">
                  <button class="btn btn-sm btn-default" data-role="prev">
                    &laquo;  ${this.translateService.instant('Previous')}
                  </button>
                  <button class="btn btn-sm btn-default" data-role="next">
                    ${this.translateService.instant('Next')} &raquo;
                  </button>
                </div>
                <button class="btn btn-sm btn-link" data-role="end">
                  ${this.translateService.instant('End tour')}
                </button>
              </div>
            </div>`;
  }

  private getMessagesTour() {
    return this.authService.has('can_view_messages_tab')
      .then(canView => {
        return canView && {
          order: 0,
          id: 'messages',
          icon: 'fa-envelope',
          name: 'Messages'
        };
      });
  }

  private getTasksTour() {
    if (this.sessionService.isOnlineOnly()) {
      return;
    }
    return this.authService.has('can_view_tasks_tab')
      .then(canView => {
        return canView && {
          order: 1,
          id: 'tasks',
          icon: 'fa-flag',
          name: 'Tasks'
        };
      });
  }

  getReportsTour() {
    return this.authService.has('can_view_reports_tab')
      .then(canView => {
        return canView && {
          order: 2,
          id: 'reports',
          icon: 'fa-list-alt',
          name: 'Reports'
        };
      });
  }

  private getContactsTour() {
    return this.authService.has('can_view_contacts_tab')
      .then(canView => {
        return canView && {
          order: 3,
          id: 'contacts',
          icon: 'fa-user',
          name: 'Contacts'
        };
      });
  }

  private getAnalyticsTour() {
    return Promise.all([
      this.authService.has('can_view_analytics'),
      this.analyticsModulesService.get()
    ])
      .then(([canView]) => {
        return canView && {
          order: 4,
          id: 'analytics',
          icon: 'fa-bar-chart-o',
          name: 'Analytics'
        };
      });
  }

  getTours() {
    return Promise.all([
      this.getMessagesTour(),
      this.getTasksTour(),
      this.getReportsTour(),
      this.getContactsTour(),
      this.getAnalyticsTour()
    ])
      .then(results => compact(results));
  }

  private getTour(name) {
    return this.tours.find(t => t.name === name) || this.tours[0];
  }

  private getSettings(name) {

    const settings = this.getTour(name);
    settings.autoscroll = false;

    if (!settings.transmogrified) {

      settings.template = this.createTemplate();

      const mobile = isMobile();
      settings.steps.forEach(step => {
        step.title = this.translateService.instant(step.title);
        step.content = this.translateService.instant(step.content);
        if (mobile) {
          // there's no room to show steps to the left or right on a mobile device
          if (step.mobileElement) {
            step.element = step.mobileElement;
          }
          if (step.mobilePlacement) {
            if (step.mobilePlacement === 'orphan') {
              delete step.element;
            } else {
              step.placement = step.mobilePlacement;
            }
          }
        }
      });

      settings.transmogrified = true;

    }

    return settings;
  }

  private createTour(name) {
    const settings = this.getSettings(name);
    const tour = new window.Tour(settings);
    tour.init();
    tour.restart();
    this.current = {
      tour: tour,
      name: name
    };
  }

  endCurrent() {
    if (this.current?.tour) {
      this.current.tour.end();
      // remove any popovers that have become disassociated
      $('.popover.tour-' + this.current.name).remove();
      this.current = null;
    }
  }

  /**
   * Starts the tour passed in the URL query param "tour"
   * if present. If not, checks whether there is a tour
   * running and ends it.
   */
  startOrEnd(activatedRoute: ActivatedRouteSnapshot) {
    if (activatedRoute.queryParams?.tour) {
      this.start(activatedRoute.queryParams.tour);
    } else {
      this.endCurrent();
    }
  }

  /**
   * Starts the tour passed by name. It closes any tour running
   * if there was one running.
   */
  start(name) {
    this.endCurrent();
    if (!name) {
      return;
    }
    const tour = this.getTour(name);
    const route = tour && tour.route;
    setTimeout(() => {
      if (this.router.isActive(route, false)) {
        this.createTour(name);
      } else {
        // navigate to the correct page
        if (route) {
          this.router.navigate([route], { queryParams: { tour: name } });
        } else {
          const message = `Attempt to navigate to an undefined state [Tour.start("${name}")]`;
          this.feedbackService.submit(message).catch(err => {
            console.error('Error saving feedback', err);
          });
        }
      }
    });
  }
}
