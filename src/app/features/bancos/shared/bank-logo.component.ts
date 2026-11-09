import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Logo de una entidad financiera, con reserva a un ícono genérico de banco.
 *
 * Centraliza el mapa de logos para que todas las pestañas muestren el mismo
 * ícono reconocible por el cajero. El tamaño se controla por CSS (--size).
 */
@Component({
  selector: 'app-bank-logo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bank-logo.component.html',
  styles: [`
    :host { display: inline-flex; flex-shrink: 0; }
    .bl-logo {
      border-radius: 10px; overflow: hidden; background: #fff; padding: 3px; box-sizing: border-box;
      border: 1px solid var(--border-light, #eee); display: flex; align-items: center; justify-content: center;
    }
    .bl-logo img { width: 100%; height: 100%; object-fit: contain; }
    .bl-fallback {
      border-radius: 10px; background: var(--info-bg, #eff6ff); color: var(--info-text, #3b82f6);
      display: flex; align-items: center; justify-content: center;
    }
  `],
})
export class BankLogoComponent {
  @Input() entidad = '';
  @Input() size = 48;

  /** Coincidencia por subcadena: "BANCO BISA S.A." → logo BISA. */
  private static readonly LOGOS: Record<string, string> = {
    'BISA':      'assets/logos-bancos/banco_bisa.jpg',
    'BNB':       'assets/logos-bancos/banco_bnb.png',
    'UNION':     'assets/logos-bancos/banco_union.png',
    'ECONOMICO': 'assets/logos-bancos/banco_economico.jpg',
    'FIE':       'assets/logos-bancos/banco_fie.png',
    'GANADERO':  'assets/logos-bancos/banco_ganadero.png',
    'PRODEM':    'assets/logos-bancos/banco_prodem.jpg',
    'SOL':       'assets/logos-bancos/banco_sol.png',
    'BANCOSOL':  'assets/logos-bancos/banco_sol.png',
    'BCP':       'assets/logos-bancos/banco_bcp.png',
    'CREDITO':   'assets/logos-bancos/banco_bcp.png',
    'ECOFUTURO': 'assets/logos-bancos/banco_ecofuturo.jpg',
    'MERCANTIL': 'assets/logos-bancos/banco_mercantil.jpg',
  };

  static logoPathFor(entidad: string): string | null {
    const upper = (entidad || '').toUpperCase();
    for (const [key, path] of Object.entries(BankLogoComponent.LOGOS)) {
      if (upper.includes(key)) return path;
    }
    return null;
  }

  get src(): string | null {
    return BankLogoComponent.logoPathFor(this.entidad);
  }
}
