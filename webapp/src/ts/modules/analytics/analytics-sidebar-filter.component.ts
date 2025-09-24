import { Component, EventEmitter, OnDestroy, OnInit, Output, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { Store } from '@ngrx/store';

import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { SettingsService } from '@mm-services/settings.service';
import { NgClass, NgIf, NgFor } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatAccordion } from '@angular/material/expansion';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'mm-analytics-sidebar-filter',
    templateUrl: './analytics-sidebar-filter.component.html',
    imports: [NgClass, MatIcon, MatAccordion, NgIf, NgFor, FormsModule, TranslatePipe]
})
export class AnalyticsSidebarFilterComponent implements OnInit, OnDestroy {

    @Input() userFacilities: any[] = [];
    @Input() showFacilityFilter = true;
    @Output() facilitySelectionChanged = new EventEmitter<string>();
    @Output() reportingPeriodSelectionChanged = new EventEmitter<string>();
    private globalActions;
    readonly reportingPeriods = [
        { value: ReportingPeriod.CURRENT, label: 'targets.this_month.subtitle' },
        { value: ReportingPeriod.PREVIOUS, label: 'targets.last_month.subtitle' }
    ];

    DEFAULT_FACILITY_LABEL = 'Facility';
    subscriptions: Subscription = new Subscription();
    isOpen = false;
    selectedReportingPeriod;
    selectedFacility;
    facilityFilterLabel;

    constructor(
        private store: Store,
        private contactTypesService: ContactTypesService,
        private settingsService: SettingsService,
    ) {
        this.globalActions = new GlobalActions(store);
    }

    ngOnInit() {
        this.subscribeToStore();
        this.setFacilityLabel();
    }

    ngOnDestroy() {
        this.subscriptions.unsubscribe();
    }

    private subscribeToStore() {
        const subscription = this.store
            .select(Selectors.getSidebarFilter)
            .subscribe((filterState) => {
                this.isOpen = filterState?.isOpen ?? false;
                if (!this.selectedFacility && filterState?.defaultFilters?.facility) {
                    this.selectedFacility = filterState.defaultFilters.facility;
                }

                if (!this.selectedReportingPeriod && filterState?.defaultFilters?.reportingPeriod) {
                    this.selectedReportingPeriod = filterState.defaultFilters.reportingPeriod;
                }
            });

        this.subscriptions.add(subscription);
    }

    toggleSidebarFilter() {
        this.isOpen = !this.isOpen;
        this.globalActions.setSidebarFilter({ isOpen: this.isOpen });
    }

    private async setFacilityLabel() {
        if (!this.userFacilities?.length) {
            this.facilityFilterLabel = this.DEFAULT_FACILITY_LABEL;
            return;
        }

        try {
            const facility = this.userFacilities[0];
            const settings = await this.settingsService.get();
            const userFacilityType = this.contactTypesService.getTypeId(facility);
            const placeType = settings.contact_types.find(type => type.id === userFacilityType);
            this.facilityFilterLabel = placeType?.name_key || this.DEFAULT_FACILITY_LABEL;
        } catch (err) {
            console.error('Error fetching facility label', err);
            this.facilityFilterLabel = this.DEFAULT_FACILITY_LABEL;
        }
    }

    fetchAggregateTargetsByFacility(facility) {
        this.selectedFacility = facility;
        this.facilitySelectionChanged.emit(this.selectedFacility);
    }

    fetchAggregateTargetsByReportingPeriod() {
        this.reportingPeriodSelectionChanged.emit(this.selectedReportingPeriod);
    }
}

export enum ReportingPeriod {
    CURRENT = 'current',
    PREVIOUS = 'previous'
}
