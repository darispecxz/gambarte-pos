import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmService } from './confirm.service';

/**
 * Renderiza el diálogo gobernado por `ConfirmService`. Se coloca una sola vez
 * en el contenedor de Bancos, así cualquier pestaña puede pedir confirmación
 * sin montar su propio overlay.
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrls: ['../bancos-ui.scss'],
  templateUrl: './confirm-dialog.component.html',
})
export class ConfirmDialogComponent {
  svc = inject(ConfirmService);
}
