import { Component, Input, signal } from '@angular/core';

/** Texto largo con "Ver más / Ver menos" (para biografias en las tarjetas de Descubrir). */
@Component({
  selector: 'app-expandable-text',
  standalone: true,
  template: `
    <p class="txt">{{ displayText() }}
      @if (isLong) {
        <button class="more" type="button" (click)="toggle($event)">
          {{ expanded() ? 'Ver menos' : 'Ver más' }}
        </button>
      }
    </p>
  `,
  styles: [`
    :host { display: block; }
    .txt { margin: 0; white-space: pre-line; }
    .more {
      background: none;
      border: none;
      padding: 0;
      margin-left: 4px;
      color: inherit;
      text-decoration: underline;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
      /* El contenedor de la tarjeta desactiva pointer-events para dejar pasar el arrastre;
         este boton lo reactiva para poder tocarlo. */
      pointer-events: auto;
    }
  `],
})
export class ExpandableTextComponent {
  @Input() text = '';
  @Input() limit = 220; // caracteres visibles antes de recortar

  expanded = signal(false);

  get isLong(): boolean {
    return this.text.length > this.limit;
  }

  displayText(): string {
    if (!this.isLong || this.expanded()) return this.text;
    // Recorta en el ultimo espacio para no partir palabras.
    const cut = this.text.slice(0, this.limit);
    const lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > this.limit * 0.6 ? cut.slice(0, lastSpace) : cut) + '…';
  }

  // stopPropagation: evita que el toque tambien dispare acciones del contenedor (tarjeta/click).
  toggle(event: Event): void {
    event.stopPropagation();
    this.expanded.update((v) => !v);
  }
}
