import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

/**
 * Avisos del módulo Bancos con SweetAlert, como diálogos centrados.
 *
 * Mantiene a propósito la firma de `MatSnackBar.open(mensaje, accion, {duration})`
 * para que los componentes migren sin reescribir cada llamada. El icono se
 * deduce del texto del mensaje (error/éxito).
 */
@Injectable({ providedIn: 'root' })
export class SnackSwal {
  open(message: string, _accion?: string, _config?: { duration?: number }): void {
    const esError = /no se pudo|no se pudieron|error|falta|faltan|inv[aá]lid|supera|obligat|indique|seleccione|debe /i.test(message);
    Swal.fire({
      toast: false,
      position: 'center',
      icon: esError ? 'error' : 'success',
      title: message,
      showConfirmButton: true,
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#f07822',
      customClass: {
        popup: 'banking-notice-popup',
        title: 'banking-notice-title',
        confirmButton: 'banking-notice-confirm',
      },
    });
  }
}
