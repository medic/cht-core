import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'mm-duplicate-info',
  templateUrl: './duplicate-info.component.html',
})
export class DuplicateInfoComponent {
  @Input() acknowledged: boolean = false;
  @Output() acknowledgedChange = new EventEmitter<boolean>();
  @Output() navigateToDuplicate = new EventEmitter<string>();
  @Input() duplicates: { _id: string; name: string; reported_date: string | Date; [key: string]: string | Date }[] = [];

  toggleAcknowledged() {
    this.acknowledged = !this.acknowledged;
    this.acknowledgedChange.emit(this.acknowledged);
  }

  _navigateToDuplicate(_id: string){
    this.navigateToDuplicate.emit(_id);
  }

  // Handles collapse / expand of duplicate doc details
  expandedSections = new Map<string, boolean>();

  toggleSection(path: string): void {
    this.expandedSections.set(path, !this.expandedSections.get(path));
  }

  isExpanded(path: string): boolean {
    return this.expandedSections.get(path) || false;
  }

  isObject(value: any): boolean {
    return value && typeof value === 'object' && !Array.isArray(value);
  }

  getPath(parentPath: string, key: string): string {
    return parentPath ? `${parentPath}.${key}` : key;
  }
}
