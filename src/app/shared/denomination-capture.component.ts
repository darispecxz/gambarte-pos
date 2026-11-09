import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CajeroService } from '../core/cajero.service';
import { Denominacion, DenominacionInput } from '../core/models';

interface DenominationLine {
  id_corte: number;
  id_tipo_corte: number;
  valor: number;
  grupoLabel: string;
  grupoAgrupacionId: number;
  grupoMultiplicador: number;
  grupoCantidad: number;
  unidadAgrupacionId: number;
  unidadCantidad: number;
  subtotal: number;
}

interface DenominationSection {
  id: number;
  label: string;
  grupoLabel: string;
  lines: DenominationLine[];
}

@Component({
  selector: 'app-denomination-capture',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './denomination-capture.component.html',
  styleUrl: './denomination-capture.component.scss',
})
export class DenominationCaptureComponent implements OnChanges {
  private cajeroService = inject(CajeroService);

  @Input() idMoneda = 0;
  @Input() moneda = '';
  @Input() montoEsperado = 0;
  @Input() titulo = 'Detalle de efectivo';
  @Input() resetKey = '';
  @Output() cortesChange = new EventEmitter<DenominacionInput[]>();
  @Output() totalChange = new EventEmitter<number>();

  sections: DenominationSection[] = [];
  loading = false;
  error = '';
  total = 0;

  get coincideConMonto(): boolean {
    return this.total > 0 && Math.abs(this.total - Number(this.montoEsperado || 0)) < 0.01;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['idMoneda'] && this.idMoneda > 0) this.loadDenominations();
    else if (changes['resetKey']) this.resetCounts();
  }

  private resetCounts(): void {
    this.sections.forEach(section => section.lines.forEach(line => {
      line.grupoCantidad = 0;
      line.unidadCantidad = 0;
      line.subtotal = 0;
    }));
    this.total = 0;
    this.emitValues();
  }

  private loadDenominations(): void {
    this.loading = true;
    this.error = '';
    this.sections = [];
    this.total = 0;
    this.emitValues();

    this.cajeroService.denominaciones(this.idMoneda).subscribe({
      next: denoms => {
        this.sections = this.buildSections(denoms.filter(d => Number(d.id_moneda) === Number(this.idMoneda)));
        this.loading = false;
        if (!this.sections.length) this.error = `No hay denominaciones configuradas para ${this.moneda || 'esta moneda'}.`;
      },
      error: () => {
        this.loading = false;
        this.error = 'No se pudieron cargar las denominaciones.';
      },
    });
  }

  private buildSections(denoms: Denominacion[]): DenominationSection[] {
    const byType = new Map<number, Denominacion[]>();
    denoms.forEach(denom => {
      const entries = byType.get(denom.id_tipo_corte) ?? [];
      entries.push(denom);
      byType.set(denom.id_tipo_corte, entries);
    });

    return [...byType.entries()].map(([id, entries]) => {
      const byCut = new Map<number, { value: number; bundle?: Denominacion; unit?: Denominacion }>();
      entries.forEach(denom => {
        const pair = byCut.get(denom.id_corte) ?? { value: Number(denom.valor) };
        if (denom.agrupacion.toUpperCase() === 'UNIDAD') pair.unit = denom;
        else pair.bundle = denom;
        byCut.set(denom.id_corte, pair);
      });

      const lines: DenominationLine[] = [...byCut.entries()].map(([id_corte, pair]) => ({
        id_corte,
        id_tipo_corte: id,
        valor: pair.value,
        grupoLabel: pair.bundle?.agrupacion ?? 'Fajo',
        grupoAgrupacionId: Number(pair.bundle?.id_agrupacion ?? 0),
        grupoMultiplicador: Number(pair.bundle?.multiplicador ?? 1),
        grupoCantidad: 0,
        unidadAgrupacionId: Number(pair.unit?.id_agrupacion ?? 0),
        unidadCantidad: 0,
        subtotal: 0,
      })).sort((a, b) => b.valor - a.valor);

      const firstBundle = entries.find(d => d.agrupacion.toUpperCase() !== 'UNIDAD');
      const groupLabel = firstBundle?.agrupacion ?? 'FAJO';
      const typeLabel = entries[0]?.tipo_corte?.toUpperCase() || (lines.some(line => line.valor >= 10) ? 'BILLETES' : 'MONEDAS');
      return { id, label: typeLabel, grupoLabel: groupLabel, lines };
    });
  }

  updateCount(event: Event, line: DenominationLine, kind: 'bundle' | 'unit'): void {
    const value = Math.max(0, Math.floor(Number((event.target as HTMLInputElement).value) || 0));
    if (kind === 'bundle') line.grupoCantidad = value;
    else line.unidadCantidad = value;
    line.subtotal = line.valor * (line.grupoCantidad * line.grupoMultiplicador + line.unidadCantidad);
    this.total = Math.round(this.sections.reduce((sum, section) => sum + section.lines.reduce((subtotal, item) => subtotal + item.subtotal, 0), 0) * 100) / 100;
    this.emitValues();
  }

  private emitValues(): void {
    const cuts: DenominacionInput[] = [];
    this.sections.forEach(section => section.lines.forEach(line => {
      if (line.grupoCantidad > 0 && line.grupoAgrupacionId > 0) cuts.push({
        id_corte: line.id_corte, id_tipo_corte: line.id_tipo_corte,
        id_agrupacion: line.grupoAgrupacionId, valor: line.valor,
        multiplicador: line.grupoMultiplicador, cantidad: line.grupoCantidad,
      });
      if (line.unidadCantidad > 0 && line.unidadAgrupacionId > 0) cuts.push({
        id_corte: line.id_corte, id_tipo_corte: line.id_tipo_corte,
        id_agrupacion: line.unidadAgrupacionId, valor: line.valor,
        multiplicador: 1, cantidad: line.unidadCantidad,
      });
    }));
    this.cortesChange.emit(cuts);
    this.totalChange.emit(this.total);
  }
}
