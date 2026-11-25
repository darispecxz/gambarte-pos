import { Component, Input, OnInit, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { WhatsAppDocumentService, WhatsAppDocumentType, WhatsAppPreview } from '../../core/whatsapp-document.service';

@Component({
  selector: 'app-whatsapp-document',
  standalone: true,
  imports: [MatIconModule],
  template: `
    @if (enabled) {
      <button type="button" class="wa-button" [disabled]="busy" (click)="prepare($event)">
        <mat-icon>chat</mat-icon>{{busy ? 'Procesando…' : label}}
      </button>
      @if (preview) {
        <div class="wa-backdrop" (click)="cancel($event)">
          <section class="wa-dialog" role="dialog" aria-modal="true" aria-label="Confirmar WhatsApp" (click)="$event.stopPropagation()">
            <h3>Compartir documento por WhatsApp</h3>
            @if (preview.test_mode) { <p class="wa-warning">Modo de pruebas: destino fijo. Use solamente documentos ficticios.</p> }
            <p>Destino: <strong>+{{preview.phone}}</strong></p>
            <label><input type="checkbox" [checked]="consent" (change)="consent = !consent" [disabled]="busy"> Confirmo que el cliente autorizó el envío y que el número es correcto.</label>
            <div class="wa-actions">
              <button type="button" [disabled]="busy" (click)="cancel($event)">Cancelar</button>
              <button type="button" class="wa-button" [disabled]="!consent || busy" (click)="send($event)">Enviar PDF</button>
            </div>
          </section>
        </div>
      }
    }
  `,
  styles: [`
    :host{display:inline-block}.wa-button{display:inline-flex;align-items:center;gap:6px;background:#168746;color:white;border:0;border-radius:6px;padding:9px 12px;font:inherit;cursor:pointer}.wa-button:disabled{opacity:.55;cursor:default}.wa-button mat-icon{font-size:18px;width:18px;height:18px}.wa-backdrop{position:fixed;inset:0;background:#0008;display:grid;place-items:center;z-index:10000}.wa-dialog{background:white;color:#20252b;border-radius:12px;padding:24px;width:min(420px,90vw);box-sizing:border-box;text-align:left}.wa-dialog label{display:flex;gap:8px;align-items:flex-start}.wa-actions{display:flex;justify-content:flex-end;gap:12px;margin-top:20px}.wa-actions button{padding:8px 12px;cursor:pointer}.wa-warning{color:#9a3412}
  `]
})
export class WhatsAppDocumentComponent implements OnInit {
  @Input({required:true}) type!: WhatsAppDocumentType;
  @Input({required:true}) operationId!: number;
  @Input() label = 'WhatsApp';
  private readonly service = inject(WhatsAppDocumentService);
  private readonly snack = inject(MatSnackBar);
  enabled = false;
  busy = false;
  consent = false;
  preview: WhatsAppPreview | null = null;
  private target: {type: WhatsAppDocumentType; id: number} | null = null;

  ngOnInit() {
    this.service.availability().subscribe({next: value => this.enabled = value, error: () => this.enabled = false});
  }

  prepare(event: Event) {
    event.stopPropagation();
    if (this.busy || !this.operationId) return;
    this.busy = true;
    this.consent = false;
    this.target = {type: this.type, id: this.operationId};
    this.service.preview(this.target.type, this.target.id).pipe(finalize(() => this.busy = false)).subscribe({
      next: value => this.preview = value,
      error: err => this.error(err)
    });
  }

  cancel(event: Event) {
    event.stopPropagation();
    if (!this.busy) { this.preview = null; this.target = null; this.consent = false; }
  }

  send(event: Event) {
    event.stopPropagation();
    if (!this.preview || !this.target || !this.consent || this.busy) return;
    this.busy = true;
    this.service.send(this.target.type, this.target.id, this.preview.phone).pipe(finalize(() => this.busy = false)).subscribe({
      next: result => {
        this.preview = null; this.target = null;
        const message = result.status === 'ACCEPTED'
          ? (result.duplicate ? 'El documento ya fue aceptado previamente.' : 'Solicitud aceptada por WhatsApp. Entrega no confirmada.')
          : 'Envío pendiente o incierto. Consulte a TI antes de reenviar.';
        this.snack.open(message, 'Cerrar', {duration: 6000});
      },
      error: err => this.error(err)
    });
  }

  private error(err: any) {
    this.snack.open(err?.error?.message || 'No se pudo completar la solicitud de WhatsApp.', 'Cerrar', {duration: 5000});
  }
}
