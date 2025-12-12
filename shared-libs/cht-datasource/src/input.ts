import { DataObject } from './libs/core';
import * as Place from './place';
import * as Report from './report';
import { Doc } from './libs/doc';

/** */
export namespace v1 {
  /**
   * Input data for a contact.
   */
  export interface ContactInput extends DataObject {
    readonly type: string
    readonly name: string
    readonly reported_date?: string | number
    readonly _id?: never
    readonly _rev?: never
  }

  /**
   * Input data for a report.
   */
  export interface ReportInput extends DataObject {
    readonly form: string
    readonly reported_date?: string | number
    readonly contact: string
    readonly _id?: never
    readonly _rev?: never
  }

  /**
   * Input data for updating a report.
   */
  export type UpdateReportInput<T extends Report.v1.Report | Report.v1.ReportWithLineage> = T
    | Omit<T, 'contact'> & Doc & { contact: string };

  /**
   * Input data for a person
   */
  export interface PersonInput extends ContactInput {
    readonly parent: string
    readonly date_of_birth?: Date
    readonly phone?: string
    readonly patient_id?: string
    readonly sex?: string
  }

  /**
   * Input data for a place
   */
  export interface PlaceInput extends ContactInput {
    readonly parent?: string
    readonly contact?: string
    readonly place_id?: string
    readonly _id?: never
    readonly _rev?: never
  }

  /**
   * Input data for updating a place.
   */
  export type UpdatePlaceInput<T extends Place.v1.Place | Place.v1.PlaceWithLineage> = T
    | Omit<T, 'contact'> & Doc & { contact?: string };
}
