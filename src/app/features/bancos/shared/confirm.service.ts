import { Injectable, signal } from '@angular/core';
import Swal from 'sweetalert2';

export interface ConfirmConfig {
  titulo: string;
  detalle?: string;
  /** Si es true, se pide un texto (p. ej. un motivo). */
  campo?: boolean;
  etiqueta?: string;
  placeholder?: string;
  /** Exige que el texto no quede vacío para confirmar. */
  requerido?: boolean;
  confirmLabel?: string;
  danger?: boolean;
}

interface ConfirmState extends ConfirmConfig {
  valor: string;
  resolve: (v: string | null) => void;
}

/**
 * Diálogo de confirmación / solicitud de motivo, compartido por las pestañas.
 *
 * Reemplaza al `dialogo` con callback que vivía en el componente monolítico.
 * `ask()` devuelve una promesa: el texto ingresado (o '' en un confirm simple)
 * si se acepta, o `null` si se cancela.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  /**
   * Estado del overlay propio. Se conserva por compatibilidad del componente
   * `ConfirmDialogComponent`, pero `ask()` usa SweetAlert y nunca lo activa.
   */
  readonly state = signal<ConfirmState | null>(null);

  /** Confirma (y opcionalmente pide un texto) con SweetAlert. */
  async ask(cfg: ConfirmConfig): Promise<string | null> {
    const res = await Swal.fire({
      title: cfg.titulo,
      text: cfg.detalle,
      input: cfg.campo ? 'text' : undefined,
      inputPlaceholder: cfg.placeholder || cfg.etiqueta || '',
      inputValue: '',
      showCancelButton: true,
      confirmButtonText: cfg.confirmLabel || 'Confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: cfg.danger ? '#d33' : '#F58634',
      inputValidator: (cfg.campo && cfg.requerido)
        ? (v: string) => (!v || !v.trim() ? 'Este campo es obligatorio' : null)
        : undefined,
    });
    if (!res.isConfirmed) return null;
    return cfg.campo ? String(res.value ?? '').trim() : '';
  }

  confirmar(): void {
    const s = this.state();
    if (!s) return;
    if (s.campo && s.requerido && !s.valor.trim()) return;
    this.state.set(null);
    s.resolve(s.campo ? s.valor.trim() : '');
  }

  cancelar(): void {
    const s = this.state();
    if (!s) return;
    this.state.set(null);
    s.resolve(null);
  }

  setValor(v: string): void {
    const s = this.state();
    if (s) this.state.set({ ...s, valor: v });
  }
}
