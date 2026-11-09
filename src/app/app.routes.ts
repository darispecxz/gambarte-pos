import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/auth.guard';

const ROLES_POS = [1, 2, 4, 6]; // 1=OPERADOR, 2=ADMIN, 4=RESP.AGENCIA, 6=CAJERO

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard, roleGuard(...ROLES_POS)],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'caja',
        loadComponent: () => import('./features/caja/caja.component').then(m => m.CajaComponent),
      },
      {
        path: 'manuales/apertura-cajas',
        loadComponent: () => import('./features/manuales/manuales.component').then(m => m.ManualesComponent),
      },
      {
        path: 'manuales/cambio',
        loadComponent: () => import('./features/manuales/manuales-cambio.component').then(m => m.ManualesCambioComponent),
      },
      {
        path: 'manuales/giro-internacional',
        loadComponent: () => import('./features/manuales/manuales-giro-internacional.component').then(m => m.ManualesGiroInternacionalComponent),
      },
      {
        path: 'manuales/gestion-efectivo',
        loadComponent: () => import('./features/manuales/manuales-efectivo.component').then(m => m.ManualesEfectivoComponent),
      },
      {
        path: 'manuales/bancos',
        loadComponent: () => import('./features/manuales/manuales-bancos.component').then(m => m.ManualesBancosComponent),
      },
      {
        path: 'manuales/egresos-ingresos',
        loadComponent: () => import('./features/manuales/manuales-egresos-ingresos.component').then(m => m.ManualesEgresosIngresosComponent),
      },
      {
        path: 'manuales/pago-remesas',
        loadComponent: () => import('./features/manuales/manuales-pago-remesas.component').then(m => m.ManualesPagoRemesasComponent),
      },
      {
        path: 'evaluacion/manuales',
        loadComponent: () => import('./features/manuales/seguimiento-manuales.component').then(m => m.SeguimientoManualesComponent),
        canActivate: [roleGuard(2)],
      },
      {
        path: 'cambio',
        loadComponent: () => import('./features/cambio/cambio.component').then(m => m.CambioComponent),
      },
      {
        path: 'cripto',
        loadComponent: () => import('./features/cripto/cripto.component').then(m => m.CriptoComponent),
      },
      {
        path: 'remesa',
        loadComponent: () => import('./features/remesa/remesa.component').then(m => m.RemesaComponent),
      },
      {
        path: 'historial',
        loadComponent: () => import('./features/historial/historial.component').then(m => m.HistorialComponent),
      },
      {
        path: 'historial-remesa',
        loadComponent: () => import('./features/historial-remesa/historial-remesa.component').then(m => m.HistorialRemesaComponent),
      },
      {
        path: 'giro',
        loadComponent: () => import('./features/giro/giro.component').then(m => m.GiroComponent),
      },
      {
        path: 'historial-giro',
        loadComponent: () => import('./features/historial-giro/historial-giro.component').then(m => m.HistorialGiroComponent),
      },
      {
        path: 'pago-remesa',
        loadComponent: () => import('./features/pago-remesa/pago-remesa.component').then(m => m.PagoRemesaComponent),
      },
      {
        path: 'historial-pago-remesa',
        loadComponent: () => import('./features/historial-pago-remesa/historial-pago-remesa.component').then(m => m.HistorialPagoRemesaComponent),
      },
      {
        path: 'movimientos',
        children: [
          { path: '', pathMatch: 'full', loadComponent: () => import('./features/movimientos/movimientos.component').then(m => m.MovimientosComponent) },
          { path: 'cajero', loadComponent: () => import('./features/movimientos/movimientos.component').then(m => m.MovimientosComponent) },
          { path: 'boveda', loadComponent: () => import('./features/movimientos/movimientos.component').then(m => m.MovimientosComponent) },
        ],
      },
      {
        path: 'bancos',
        loadComponent: () => import('./features/bancos/bancos.component').then(m => m.BancosComponent),
        children: [
          { path: 'cuentas', loadComponent: () => import('./features/bancos/cuentas/cuentas.component').then(m => m.CuentasComponent) },
          { path: 'banca', pathMatch: 'full', redirectTo: 'cuentas' },
          { path: 'traspasos', loadComponent: () => import('./features/bancos/traspasos/traspasos.component').then(m => m.TraspasosComponent) },
          { path: 'depositos', loadComponent: () => import('./features/bancos/depositos/depositos.component').then(m => m.DepositosComponent) },
          { path: 'movimientos', loadComponent: () => import('./features/bancos/movimientos/movimientos.component').then(m => m.MovimientosComponent) },
          { path: 'cheques', loadComponent: () => import('./features/bancos/cheques/cheques.component').then(m => m.ChequesComponent) },
          { path: 'conciliacion', loadComponent: () => import('./features/bancos/conciliacion/conciliacion.component').then(m => m.ConciliacionComponent) },
          { path: 'reportes', pathMatch: 'full', redirectTo: 'movimientos' },
        ],
      },
      {
        path: 'egresos-ingresos',
        loadComponent: () => import('./features/egresos-ingresos/egresos-ingresos.component').then(m => m.EgresosIngresosComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
