import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { IonSearchbar, IonIcon } from '@ionic/angular/standalone';
import { INTEREST_CATEGORIES } from '../interest-categories';

/** Selector de intereses: categorias predefinidas, filtrables con un buscador. */
@Component({
  selector: 'app-interests-picker',
  standalone: true,
  templateUrl: './interests-picker.component.html',
  styleUrl: './interests-picker.component.scss',
  imports: [IonSearchbar, IonIcon],
})
export class InterestsPickerComponent {
  @Input() selected: string[] = [];
  @Output() selectedChange = new EventEmitter<string[]>();

  readonly categories = INTEREST_CATEGORIES;
  query = signal('');

  get filtered(): string[] {
    const q = this.query().trim().toLowerCase();
    return q ? this.categories.filter((c) => c.toLowerCase().includes(q)) : this.categories;
  }

  isSelected(category: string): boolean {
    return this.selected.includes(category);
  }

  toggle(category: string): void {
    const next = this.isSelected(category)
      ? this.selected.filter((c) => c !== category)
      : [...this.selected, category];
    this.selectedChange.emit(next);
  }

  onSearch(event: CustomEvent): void {
    this.query.set((event.detail as { value?: string })?.value ?? '');
  }
}
