export class GeolocationEditState {
  readonly hasLocation: boolean;
  readonly isEdit: boolean;
  readonly context: string | undefined;
  readonly captureValue: string | undefined;
  readonly fieldName: string | undefined;

  constructor(captureInput?: HTMLInputElement | null) {
    this.hasLocation = captureInput?.dataset?.geoHasLocation === 'true';
    this.isEdit = captureInput?.dataset?.geoIsEdit === 'true';
    this.context = captureInput?.dataset?.geoContext || undefined;
    this.captureValue = captureInput?.value || undefined;
    this.fieldName = captureInput?.getAttribute('name')?.split('/').pop() || undefined;
  }

  get isKept(): boolean {
    return this.captureValue === 'kept';
  }

  get isCaptured(): boolean {
    return this.captureValue === 'captured';
  }

  get isHome(): boolean {
    return this.context === 'home';
  }
}
