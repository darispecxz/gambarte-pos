import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QRCodeComponent } from 'angularx-qrcode';

export interface ReciboRemesaData {
  codigo: number | string;
  correlativo?: string;
  fecha: string;
  agencia: string;
  codAgencia?: string;
  loginUsuario?: string;
  remitente: string;
  documentoRemitente?: string;
  telefonoRemitente?: string;
  direccionRemitente?: string;
  destinatarioNombre: string;
  telefonoDestinatario?: string;
  direccionDestinatario?: string;
  destino: string;
  monedaRecibida: string;
  monto: number;
  comisionBob: number;
  corresponsalBob: number;
  ivaBob: number;
  totalBob: number;
  monRec: number;
  equivalenteUsd?: number | null;
  totalClp?: number | null;
  concepto?: string;
  esReimpresion?: boolean;
}

@Component({
  selector: 'app-recibo-remesa',
  standalone: true,
  imports: [CommonModule, QRCodeComponent],
  styleUrl: './recibo-remesa.component.scss',
  template: `
    <div class="print-receipt">
      <div class="pr-header">
        <img src="assets/gambarte-logo.png" alt="Gambarte" class="pr-logo">
        <div class="pr-site">www.gambarte.com.bo</div>
        <div class="pr-phone">TELEFONO DE CONTACTO: 68355517</div>
        <div class="pr-title">COMPROBANTE DE ENVIO</div>
      </div>
      <div class="pr-separator"></div>

      <div class="pr-qr-row">
        <qrcode [qrdata]="'' + data.codigo" [width]="100" [errorCorrectionLevel]="'M'" [elementType]="'img'"></qrcode>
        <div class="pr-qr-label">CODIGO<br><strong>{{ data.codigo }}</strong></div>
      </div>

      <div class="pr-subtitle">GIRO INTERNACIONAL BOLIVIA - AGENCIA<br>{{ data.agencia }}</div>
      <div class="pr-separator"></div>

      <table class="pr-table">
        <tr><td>FECHA</td><td>{{ formatFecha(data.fecha) }}</td><td>HORA</td><td>{{ formatHora(data.fecha) }}</td></tr>
        @if (data.codAgencia || data.loginUsuario) {
          <tr><td>CAGR</td><td>{{ data.codAgencia }}</td><td>OPE</td><td>{{ data.loginUsuario }}</td></tr>
        }
      </table>

      <div class="pr-section-title">DATOS DEL REMITENTE</div>
      <div class="pr-separator"></div>
      <div class="pr-center">{{ data.remitente }}</div>
      <table class="pr-table">
        @if (data.documentoRemitente) {
          <tr><td>DOCUMENTO</td><td>{{ data.documentoRemitente }}</td></tr>
        }
        @if (data.telefonoRemitente) {
          <tr><td>TELEFONO</td><td>{{ data.telefonoRemitente }}</td></tr>
        }
        @if (data.direccionRemitente) {
          <tr><td>DIRECCION</td><td>{{ data.direccionRemitente }}</td></tr>
        }
      </table>

      <div class="pr-section-title">DATOS DEL DESTINATARIO</div>
      <div class="pr-separator"></div>
      <table class="pr-table">
        <tr><td>NOMBRE</td><td>{{ data.destinatarioNombre }}</td></tr>
        @if (data.telefonoDestinatario) {
          <tr><td>TELEFONO</td><td>{{ data.telefonoDestinatario }}</td></tr>
        }
        @if (data.direccionDestinatario) {
          <tr><td>DIRECCION</td><td>{{ data.direccionDestinatario }}</td></tr>
        }
      </table>

      <div class="pr-section-title">DATOS DE LA OPERACION</div>
      <div class="pr-separator"></div>
      <table class="pr-table pr-ops">
        <tr><td>DESTINO</td><td class="pr-right">CHILE - {{ data.destino }}</td></tr>
        <tr><td>POR ENTREGAR [{{ data.monedaRecibida }}]</td><td class="pr-right">{{ data.monto | number:'1.2-2' }}</td></tr>
        <tr><td>RECIBIDO [{{ data.monedaRecibida }}]</td><td class="pr-right">{{ data.monto | number:'1.2-2' }}</td></tr>
        <tr><td>COMISION [BOB]</td><td class="pr-right">{{ data.comisionBob | number:'1.2-2' }}</td></tr>
        <tr><td>CORRESPONSAL [BOB]</td><td class="pr-right">{{ data.corresponsalBob | number:'1.2-2' }}</td></tr>
        <tr><td>IVA [BOB]</td><td class="pr-right">{{ data.ivaBob | number:'1.2-2' }}</td></tr>
        @if (data.monRec === 2 && data.equivalenteUsd) {
          <tr><td>EQUIVALENTE [USD]*</td><td class="pr-right">{{ data.equivalenteUsd | number:'1.2-2' }}</td></tr>
        }
        @if (data.monRec === 2 && data.totalClp) {
          <tr><td>EQUIVALENTE [CLP]*</td><td class="pr-right">{{ data.totalClp | number:'1.2-2' }}</td></tr>
        }
      </table>

      @if (data.concepto) {
        <div class="pr-section-title">CONCEPTO</div>
        <div class="pr-separator"></div>
        <div class="pr-concepto">{{ data.concepto }}</div>
      }

      <div class="pr-separator" style="margin-top:30px"></div>

      <div class="pr-sign-row">
        <div class="pr-sign"><div class="pr-sign-line"></div><span>FIRMA CAJERO</span></div>
        <div class="pr-sign"><div class="pr-sign-line"></div><span>FIRMA CLIENTE</span></div>
      </div>

      <div class="pr-nota"><strong>NOTA.-</strong> AL FIRMAR ESTE DOCUMENTO SE ACEPTAN LOS TERMINOS Y CONDICIONES DE GAMBARTE S.R.L.</div>
      <div class="pr-nota">(*) Montos Referenciales</div>

      @if (data.esReimpresion) {
        <div class="pr-reprint pr-nota">--- RE-IMPRESION ---</div>
      }
    </div>
  `,
})
export class ReciboRemesaComponent {
  @Input({ required: true }) data!: ReciboRemesaData;

  formatFecha(fecha: string): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}-${mm}-${d.getFullYear()}`;
  }

  formatHora(fecha: string): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  }
}
