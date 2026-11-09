import { Component, inject, ViewChild, HostListener, OnInit, OnDestroy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterOutlet, RouterLink, Router, NavigationEnd } from '@angular/router';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { AuthService } from '../core/auth.service';
import { CambioService } from '../core/cambio.service';
import { BankingService } from '../core/banking.service';
import { GiroService, ComisionGiroResult } from '../core/giro.service';
import { RemesaService, ComisionResult } from '../core/remesa.service';
import { NotificacionService, Notificacion, NotificacionConteo } from '../core/notificacion.service';
import { EstadoSiat } from '../core/models';
import { Subscription, timer, switchMap, catchError, of, Subject } from 'rxjs';
import { filter, debounceTime, distinctUntilChanged } from 'rxjs/operators';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  roles?: number[];
}

const ROL_CAJERO = 6;
const ROL_OPERADOR = 1;
const ROL_ADMIN = 2;
const ROL_RESP_AGENCIA = 4;
const ROLES_TODOS = [ROL_OPERADOR, ROL_ADMIN, ROL_RESP_AGENCIA, ROL_CAJERO];
const ROLES_ADMIN = [ROL_OPERADOR, ROL_ADMIN, ROL_RESP_AGENCIA];

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, MatSidenavModule, DecimalPipe, FormsModule],
  template: `
    <mat-sidenav-container class="app">

      <mat-sidenav #sidenav
        [mode]="isMobile ? 'over' : 'side'"
        [opened]="sidenavOpened"
        (openedChange)="sidenavOpened = $event"
        class="sidebar"
        [fixedInViewport]="isMobile">

        <div class="side-head">
          <img class="logo" src="gambarte-logo.png" alt="Gambarte">
          @if (isMobile) {
            <button class="toggle" (click)="toggle()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          }
        </div>

        <nav class="side-nav">
          <div class="group">
            <div class="group-h">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              <span>Operaciones</span>
            </div>
            <!-- Dashboard -->
            <a class="nav-item" [class.active]="isActive('/dashboard')"
               routerLink="/dashboard" (click)="onNavClick()">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              <span class="lbl">Inicio</span>
            </a>
            <!-- Mis Cajas -->
            <a class="nav-item" [class.active]="isActive('/caja')"
               routerLink="/caja" (click)="onNavClick()">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 7h20l-2 13H4L2 7z"/><path d="M5 7V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2"/><line x1="9" y1="11" x2="9" y2="16"/><line x1="15" y1="11" x2="15" y2="16"/></svg>
              <span class="lbl">Mis Cajas</span>
            </a>
            <!-- Cambio (collapsible) -->
            <div class="nav-group" [class.open]="cambioAbierto">
              <a class="nav-item" [class.active]="isActive('/cambio') || isActive('/historial')"
                 (click)="cambioAbierto = !cambioAbierto">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                <span class="lbl">Cambio</span>
                <svg class="chev" [class.rot]="cambioAbierto" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </a>
              @if (cambioAbierto) {
                <div class="sub-nav">
                  <a class="sub-item" [class.active]="isActive('/cambio') && cambioOp === 'compra'"
                     [routerLink]="['/cambio']" [queryParams]="{ op: 'compra' }" (click)="onNavClick()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Compra</a>
                  <a class="sub-item" [class.active]="isActive('/cambio') && cambioOp === 'venta'"
                     [routerLink]="['/cambio']" [queryParams]="{ op: 'venta' }" (click)="onNavClick()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    Venta</a>
                  <a class="sub-item" [class.active]="isActive('/historial')"
                     routerLink="/historial" (click)="onNavClick()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5"/><path d="M4 19h16"/><rect x="7" y="12" width="2.5" height="4" rx=".5"/><rect x="11" y="9" width="2.5" height="7" rx=".5"/><rect x="15" y="6" width="2.5" height="10" rx=".5"/></svg>
                    Reportes</a>
                </div>
              }
            </div>
            <a class="nav-item" [class.active]="isActive('/cripto')" routerLink="/cripto" (click)="onNavClick()">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5c-.7-1-1.8-1.5-3.2-1.5-1.7 0-2.8.8-2.8 2s1 1.8 2.9 2.2l.8.2c1.9.4 2.8 1.1 2.8 2.4 0 1.4-1.3 2.4-3.3 2.4-1.5 0-2.8-.6-3.6-1.7M12 5.5v13"/></svg>
              <span class="lbl">Operaciones cripto</span>
            </a>
            <!-- Giro Internacional (envio Chile) -->
            <div class="nav-group" [class.open]="remesaAbierta">
              <a class="nav-item" [class.active]="isActive('/remesa') || isActive('/historial-remesa')"
                 (click)="remesaAbierta = !remesaAbierta">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                <span class="lbl">Giro Internacional</span>
                <svg class="chev" [class.rot]="remesaAbierta" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </a>
              @if (remesaAbierta) {
                <div class="sub-nav">
                  <a class="sub-item" [class.active]="isActive('/remesa')"
                     routerLink="/remesa" (click)="onNavClick()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    Enviar</a>
                  <a class="sub-item" [class.active]="isActive('/historial-remesa')"
                     routerLink="/historial-remesa" (click)="onNavClick()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5"/><path d="M4 19h16"/><rect x="7" y="12" width="2.5" height="4" rx=".5"/><rect x="11" y="9" width="2.5" height="7" rx=".5"/><rect x="15" y="6" width="2.5" height="10" rx=".5"/></svg>
                    Reportes</a>
                </div>
              }
            </div>
            <!-- Pago de Remesas (Chile → Bolivia, DB externa) -->
            <div class="nav-group" [class.open]="pagoRemesaAbierto">
              <a class="nav-item" [class.active]="isActive('/pago-remesa') || isActive('/historial-pago-remesa')"
                 (click)="pagoRemesaAbierto = !pagoRemesaAbierto">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span class="lbl">Pago de Remesas</span>
                <svg class="chev" [class.rot]="pagoRemesaAbierto" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </a>
              @if (pagoRemesaAbierto) {
                <div class="sub-nav">
                  <a class="sub-item" [class.active]="isActive('/pago-remesa') && pagoRemesaTipo === 'efectivo'"
                     routerLink="/pago-remesa" [queryParams]="{tipo: 'efectivo'}" (click)="onNavClick()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="12" x2="6" y2="12"/></svg>
                    Pago en Efectivo</a>
                  <a class="sub-item" [class.active]="isActive('/pago-remesa') && pagoRemesaTipo === 'deposito'"
                     routerLink="/pago-remesa" [queryParams]="{tipo: 'deposito'}" (click)="onNavClick()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                    Pago por Deposito</a>
                  <a class="sub-item" [class.active]="isActive('/historial-pago-remesa')"
                     routerLink="/historial-pago-remesa" (click)="onNavClick()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                    Reporte</a>
                </div>
              }
            </div>
            <!-- Giro Nacional (collapsible) -->
            <div class="nav-group" [class.open]="giroAbierto">
              <a class="nav-item" [class.active]="isActive('/giro') || isActive('/historial-giro')"
                 (click)="giroAbierto = !giroAbierto">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8l10 6 10-6"/></svg>
                <span class="lbl">Giro Nacional</span>
                <svg class="chev" [class.rot]="giroAbierto" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </a>
              @if (giroAbierto) {
                <div class="sub-nav">
                  <a class="sub-item" [class.active]="isActive('/giro') && !giroTabPagar && !giroTabDevolver"
                     [routerLink]="['/giro']" [queryParams]="{ tab: 'enviar' }" (click)="onNavClick()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    Enviar</a>
                  <a class="sub-item" [class.active]="giroTabPagar"
                     [routerLink]="['/giro']" [queryParams]="{ tab: 'pagar' }" (click)="onNavClick()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Pagar</a>
                  <a class="sub-item" [class.active]="giroTabDevolver"
                     [routerLink]="['/giro']" [queryParams]="{ tab: 'devolver' }" (click)="onNavClick()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
                    Devolver</a>
                  <a class="sub-item" [class.active]="isActive('/historial-giro')"
                     routerLink="/historial-giro" (click)="onNavClick()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    Historial</a>
                </div>
              }
            </div>
            <!-- Gestión Efectivo (collapsible) -->
            <div class="nav-group" [class.open]="efectivoAbierto">
              <a class="nav-item" [class.active]="isActive('/movimientos')"
                 (click)="efectivoAbierto = !efectivoAbierto">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><circle cx="5.5" cy="12" r="1"/><circle cx="18.5" cy="12" r="1"/></svg>
                <span class="lbl">Gestión Efectivo</span>
                <svg class="chev" [class.rot]="efectivoAbierto" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </a>
              @if (efectivoAbierto) {
                <div class="sub-nav">
                  <a class="sub-item" [class.active]="isActive('/movimientos') && movGrupo === 'cajero'"
                     routerLink="/movimientos/cajero" (click)="onNavClick()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>
                    Traspaso a Cajero</a>
                  <a class="sub-item" [class.active]="isActive('/movimientos') && movGrupo === 'boveda'"
                     routerLink="/movimientos/boveda" (click)="onNavClick()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/><line x1="9" y1="21" x2="9" y2="12"/><line x1="15" y1="21" x2="15" y2="12"/></svg>
                    Operaciones de Bóveda</a>
                </div>
              }
            </div>
            @if (tieneAccesoBancos) {
              <div class="nav-group" [class.open]="bancosAbierto">
                <a class="nav-item" [class.active]="isActive('/bancos')"
                   (click)="toggleBancos()">
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/><line x1="9" y1="21" x2="9" y2="12"/><line x1="15" y1="21" x2="15" y2="12"/></svg>
                  <span class="lbl">Bancos</span>
                  <svg class="chev" [class.rot]="bancosAbierto" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </a>
                @if (bancosAbierto) {
                  <div class="sub-nav">
                    <a class="sub-item" [class.active]="bancosTabActiva === 'cuentas'"
                       [routerLink]="['/bancos', 'cuentas']" (click)="onNavClick()">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                      Cuentas y banca</a>
                    <a class="sub-item" [class.active]="bancosTabActiva === 'traspasos'"
                       [routerLink]="['/bancos', 'traspasos']" (click)="onNavClick()">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><line x1="3" y1="5" x2="21" y2="5"/><polyline points="7 23 3 19 7 15"/><line x1="21" y1="19" x2="3" y2="19"/></svg>
                      Traspasos
                      @if (bancosBadge('traspasos') > 0) {
                        <span class="sub-dot">{{ bancosBadge('traspasos') }}</span>
                      }</a>
                    <a class="sub-item" [class.active]="bancosTabActiva === 'depositos'"
                       [routerLink]="['/bancos', 'depositos']" (click)="onNavClick()">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      Depósitos / Retiros</a>
                    <a class="sub-item" [class.active]="bancosTabActiva === 'movimientos'"
                       [routerLink]="['/bancos', 'movimientos']" (click)="onNavClick()">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                      Movimientos</a>
                    <a class="sub-item" [class.active]="bancosTabActiva === 'cheques'"
                       [routerLink]="['/bancos', 'cheques']" (click)="onNavClick()">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                      Cheques
                      @if (bancosBadge('cheques') > 0) {
                        <span class="sub-dot">{{ bancosBadge('cheques') }}</span>
                      }</a>
                    <a class="sub-item" [class.active]="bancosTabActiva === 'conciliacion'"
                       [routerLink]="['/bancos', 'conciliacion']" (click)="onNavClick()">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                      Conciliación</a>
                  </div>
                }
              </div>
            }
            @if (tieneAccesoEgresos) {
              <a class="nav-item" [class.active]="isActive('/egresos-ingresos')"
                 routerLink="/egresos-ingresos" (click)="onNavClick()">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 12 15 15"/></svg>
                <span class="lbl">Egresos / Ingresos</span>
              </a>
            }
            <a class="nav-item" [class.active]="isActive('/manuales')"
               routerLink="/manuales/apertura-cajas" (click)="onNavClick()">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8M8 11h8"/></svg>
              <span class="lbl">Manuales</span>
            </a>
            @if (auth.rol?.id_rol === 2) {
              <a class="nav-item" [class.active]="isActive('/evaluacion/manuales')"
                 routerLink="/evaluacion/manuales" (click)="onNavClick()">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                <span class="lbl">Evaluación</span>
              </a>
            }
          </div>
        </nav>

        <div class="side-foot">
          <div class="user-menu-wrap">
            <button class="user-trigger" (click)="userMenuOpen = !userMenuOpen; aparienciaOpen = false; $event.stopPropagation()">
              <div class="av">{{ userInitials }}</div>
              <div class="who">
                <div class="n">{{ auth.user?.nombre }}</div>
                <div class="r">{{ auth.user?.email }}</div>
              </div>
              <svg class="trigger-dots" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </button>
            @if (userMenuOpen) {
              <div class="user-dropdown" (click)="$event.stopPropagation()">
                <a class="ud-item" routerLink="/cuenta" (click)="userMenuOpen = false; onNavClick()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  Cuenta
                </a>
                <div class="ud-sep"></div>
                <button class="ud-item ud-submenu-trigger" (click)="aparienciaOpen = !aparienciaOpen; $event.stopPropagation()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                  Apariencia
                  <svg class="chev-right" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
                @if (aparienciaOpen) {
                  <div class="ud-submenu">
                    <button class="ud-item" [class.ud-active]="themeMode === 'light'" (click)="setTheme('light')">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                      Claro
                      @if (themeMode === 'light') {
                        <svg class="ud-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      }
                    </button>
                    <button class="ud-item" [class.ud-active]="themeMode === 'dark'" (click)="setTheme('dark')">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                      Oscuro
                      @if (themeMode === 'dark') {
                        <svg class="ud-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      }
                    </button>
                    <button class="ud-item" [class.ud-active]="themeMode === 'system'" (click)="setTheme('system')">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                      Sistema
                      @if (themeMode === 'system') {
                        <svg class="ud-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      }
                    </button>
                  </div>
                }
                <div class="ud-sep"></div>
                <button class="ud-item ud-danger" (click)="logout()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Cerrar Sesión
                </button>
              </div>
            }
          </div>
        </div>
      </mat-sidenav>

      <mat-sidenav-content class="main">
        <header class="top">
          <button class="menu-btn" (click)="toggle()">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <div class="unit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            {{ agenciaLabel }}
          </div>
          @if (siatStatus) {
            <div class="siat-wrap">
              <button class="siat-badge"
                [class.online]="siatStatus.conexiones.estado === 'EN_LINEA'"
                [class.warning]="siatStatus.conexiones.estado === 'CONTINGENCIA'"
                [class.offline]="siatStatus.conexiones.estado === 'INACTIVO'"
                (click)="siatPanelOpen = !siatPanelOpen">
                @if (siatStatus.conexiones.estado === 'EN_LINEA') {
                  <svg class="siat-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
                } @else {
                  <svg class="siat-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
                }
                <span class="siat-dot"></span>
                <svg class="siat-chevron" [class.open]="siatPanelOpen" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              @if (siatPanelOpen) {
                <div class="siat-panel" (click)="$event.stopPropagation()">
                  <div class="sp-section">
                    <div class="sp-title">Estado de Conexiones</div>
                    <div class="sp-row">
                      <span>Facturador Electrónico</span>
                      <span class="sp-check" [class.ok]="siatStatus.conexiones.facturador" [class.fail]="!siatStatus.conexiones.facturador">
                        @if (siatStatus.conexiones.facturador) {
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        } @else {
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        }
                      </span>
                    </div>
                    <div class="sp-row">
                      <span>Servicio de Impuestos Nacionales</span>
                      <span class="sp-check" [class.ok]="siatStatus.conexiones.sin" [class.fail]="!siatStatus.conexiones.sin">
                        @if (siatStatus.conexiones.sin) {
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        } @else {
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        }
                      </span>
                    </div>
                    <div class="sp-row">
                      <span>Estado de Facturación</span>
                      <span class="sp-estado" [class.en-linea]="siatStatus.conexiones.estado === 'EN_LINEA'"
                            [class.contingencia]="siatStatus.conexiones.estado === 'CONTINGENCIA'"
                            [class.inactivo]="siatStatus.conexiones.estado === 'INACTIVO'">
                        [{{ siatStatus.conexiones.estado === 'EN_LINEA' ? 'EN LINEA' : siatStatus.conexiones.estado }}]
                      </span>
                    </div>
                  </div>
                  <div class="sp-section">
                    <div class="sp-title">Sincronización de Facturas</div>
                    <div class="sp-sub">Facturas emitidas fuera de línea</div>
                    <div class="sp-row">
                      <span>Cambios pendientes</span>
                      <span class="sp-count" [class.has-pending]="siatStatus.sincronizacion.cambios_pendientes > 0">{{ siatStatus.sincronizacion.cambios_pendientes }}</span>
                    </div>
                  </div>
                  <div class="sp-section">
                    <div class="sp-title">Información Punto de Venta</div>
                    @if (siatStatus.punto_venta) {
                      <div class="sp-info">
                        <div class="sp-info-row"><span class="sp-k">Agencia:</span><span class="sp-v">{{ siatStatus.punto_venta.agencia }}</span></div>
                        <div class="sp-info-row"><span class="sp-k">Sucursal:</span><span class="sp-v">{{ siatStatus.punto_venta.sucursal }}</span></div>
                        <div class="sp-info-row"><span class="sp-k">Punto de Venta:</span><span class="sp-v">{{ siatStatus.punto_venta.punto_venta }}</span></div>
                        <div class="sp-info-row"><span class="sp-k">CUIS:</span><span class="sp-v mono">{{ siatStatus.punto_venta.cuis }}</span></div>
                        <div class="sp-info-row"><span class="sp-k">CUFD:</span><span class="sp-v mono truncate">{{ siatStatus.punto_venta.cufd }}</span></div>
                        <div class="sp-info-row"><span class="sp-k">Código de Control:</span><span class="sp-v mono">{{ siatStatus.punto_venta.codigo_control }}</span></div>
                      </div>
                      <div class="sp-row cufd-status">
                        <span>CUFD vigente</span>
                        <span class="sp-check ok">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        </span>
                      </div>
                    } @else {
                      <div class="sp-empty">Sin punto de venta configurado</div>
                    }
                  </div>
                </div>
              }
            </div>
          }

          <div class="tsp"></div>

          <div class="hdr-actions">
            <!-- Bandera país -->
            <button class="hdr-icon-btn" title="Bolivia">
              <svg width="20" height="14" viewBox="0 0 20 14">
                <rect width="20" height="4.67" fill="#DA291C"/>
                <rect y="4.67" width="20" height="4.67" fill="#F7E04B"/>
                <rect y="9.33" width="20" height="4.67" fill="#007934"/>
              </svg>
            </button>

            <!-- Apariencia -->
            <button class="hdr-icon-btn" (click)="cycleTheme()" [title]="themeMode === 'dark' ? 'Modo claro' : themeMode === 'light' ? 'Modo oscuro' : 'Tema del sistema'">
              @if (darkMode) {
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              } @else {
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              }
            </button>

            <!-- Notificaciones -->
            <div class="notif-wrap">
              <button class="hdr-icon-btn" (click)="notifPanelOpen = !notifPanelOpen"
                      [class.has-unread]="notifConteo.total > 0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                @if (notifConteo.total > 0) {
                  <span class="notif-badge" [class.critica]="notifConteo.critica > 0">{{ notifConteo.total > 99 ? '99+' : notifConteo.total }}</span>
                }
              </button>
              @if (notifPanelOpen) {
                <div class="notif-panel" (click)="$event.stopPropagation()">
                  <div class="np-head">
                    <span class="np-title">Notificaciones</span>
                    @if (notifConteo.total > 0) {
                      <button class="np-mark-all" (click)="marcarTodasLeidas()">Marcar todas leídas</button>
                    }
                  </div>
                  @if (notificaciones.length === 0) {
                    <div class="np-empty">Sin notificaciones pendientes</div>
                  } @else {
                    <div class="np-list">
                      @for (n of notificaciones; track n.id_notificacion) {
                        <div class="np-item" [class.no-leida]="!n.leida" (click)="marcarLeida(n)">
                          <span class="np-urg" [class]="'urg-' + n.urgencia"></span>
                          <div class="np-body">
                            <div class="np-item-title">{{ n.titulo }}</div>
                            <div class="np-msg">{{ n.mensaje }}</div>
                            <div class="np-time">{{ tiempoRelativo(n.fec_creacion) }}</div>
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </header>

        <div class="page">
          <router-outlet />
        </div>

        <!-- Paneles flotantes inferiores -->
        <div class="bottom-panels">
          <!-- Calculadora -->
          <div class="bp-widget bp-calc" [class.bp-min]="calcMinimized">
            <button class="bp-header" (click)="calcMinimized = !calcMinimized">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="10" y2="14"/><line x1="14" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="16" y2="18"/></svg>
              <span class="bp-title">Calculadora</span>
              <svg class="bp-chev" [class.flip]="!calcMinimized" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
            </button>
            @if (!calcMinimized) {
              <div class="calc-tabs">
                <button class="calc-tab" [class.active]="calcTab === 'cambio'" (click)="calcTab = 'cambio'">Cambio</button>
                <button class="calc-tab" [class.active]="calcTab === 'envio'" (click)="calcTab = 'envio'">Envío</button>
              </div>
              @if (calcTab === 'cambio') {
                <div class="bp-body calc-body">
                  <div class="calc-row">
                    <label class="calc-lbl">Moneda</label>
                    <select class="calc-input calc-select" [(ngModel)]="calcMoneda" (ngModelChange)="calcular_preview()">
                      @for (c of headerCotizaciones; track c.id_moneda) {
                        <option [value]="c.moneda">{{ c.moneda }} — {{ c.moneda_desc }}</option>
                      }
                    </select>
                  </div>
                  <div class="calc-row">
                    <label class="calc-lbl">Monto</label>
                    <input class="calc-input" type="number" [(ngModel)]="calcMonto" (ngModelChange)="calcular_preview()" placeholder="0.00" min="0">
                  </div>
                  @if (calcMoneda && calcMonto > 0) {
                    <div class="calc-result">
                      <div class="calc-res-row">
                        <span class="calc-res-label">Compra (recibe BOB)</span>
                        <span class="calc-res-val compra">{{ calcResultCompra | number:'1.2-2' }} Bs</span>
                      </div>
                      <div class="calc-res-row">
                        <span class="calc-res-label">Venta (entrega BOB)</span>
                        <span class="calc-res-val venta">{{ calcResultVenta | number:'1.2-2' }} Bs</span>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="bp-body calc-body">
                  <div class="calc-row">
                    <label class="calc-lbl">Tipo</label>
                    <select class="calc-input calc-select" [(ngModel)]="envioTipo" (ngModelChange)="onEnvioChange()">
                      <option value="giro">Giro Nacional</option>
                      <option value="remesa">Remesa Internacional</option>
                    </select>
                  </div>
                  @if (envioTipo === 'remesa') {
                    <div class="calc-row">
                      <label class="calc-lbl">Destino</label>
                      <select class="calc-input calc-select" [(ngModel)]="envioDestino" (ngModelChange)="onEnvioChange()">
                        @for (d of destinos; track d.id_destino) {
                          <option [value]="d.id_destino">{{ d.descripcion }}</option>
                        }
                      </select>
                    </div>
                  }
                  <div class="calc-row">
                    <label class="calc-lbl">Moneda</label>
                    <select class="calc-input calc-select" [(ngModel)]="envioMonedaId" (ngModelChange)="onEnvioChange(true)">
                      @for (m of envioMonedas; track m.id) {
                        <option [value]="m.id">{{ m.code }} — {{ m.name }}</option>
                      }
                    </select>
                  </div>
                  <div class="calc-row">
                    <label class="calc-lbl">Monto</label>
                    <input class="calc-input" type="number" [(ngModel)]="envioMonto" (ngModelChange)="onEnvioChange()" placeholder="0.00" min="0">
                  </div>
                  @if (envioTipo === 'remesa') {
                    <label class="calc-check-row">
                      <input type="checkbox" [checked]="envioInclComision === 1" (change)="envioInclComision = envioInclComision === 1 ? 0 : 1; onEnvioChange()">
                      <span>Comisión incluida</span>
                    </label>
                  }
                  @if (envioLoading) {
                    <div class="calc-status loading">Calculando...</div>
                  }
                  @if (envioError) {
                    <div class="calc-status error">{{ envioError }}</div>
                  }
                  @if (envioResultGiro && envioTipo === 'giro') {
                    <div class="calc-result">
                      <div class="calc-res-row">
                        <span class="calc-res-label">Comisión</span>
                        <span class="calc-res-val">{{ envioResultGiro.comision | number:'1.2-2' }}</span>
                      </div>
                      <div class="calc-res-row">
                        <span class="calc-res-label">ITF</span>
                        <span class="calc-res-val">{{ envioResultGiro.itf | number:'1.2-2' }}</span>
                      </div>
                      @if (envioResultGiro.total_cambio > 0) {
                        <div class="calc-res-row">
                          <span class="calc-res-label">T/C Oficial</span>
                          <span class="calc-res-val">{{ envioResultGiro.tipo_cambio | number:'1.2-2' }}</span>
                        </div>
                      }
                      <div class="calc-res-row total">
                        <span class="calc-res-label">Total a cobrar</span>
                        <span class="calc-res-val venta">{{ envioResultGiro.total | number:'1.2-2' }}</span>
                      </div>
                      @if (envioResultGiro.total_bob > 0 && envioMonedaId !== 2) {
                        <div class="calc-res-row">
                          <span class="calc-res-label">Total en BOB</span>
                          <span class="calc-res-val">{{ envioResultGiro.total_bob | number:'1.2-2' }} Bs</span>
                        </div>
                      }
                    </div>
                  }
                  @if (envioResultRemesa && envioTipo === 'remesa') {
                    <div class="calc-result">
                      <div class="calc-res-row">
                        <span class="calc-res-label">Comisión</span>
                        @if (envioMonedaId === 1) {
                          <span class="calc-res-val">{{ envioResultRemesa.moneda_x.comision_total | number:'1.2-2' }} USD</span>
                        } @else {
                          <span class="calc-res-val">{{ envioResultRemesa.bob.comision_total | number:'1.2-2' }} Bs</span>
                        }
                      </div>
                      @if (envioMonedaId === 1 && envioResultRemesa.moneda_x.itf != null) {
                        <div class="calc-res-row">
                          <span class="calc-res-label">ITF</span>
                          <span class="calc-res-val">{{ envioResultRemesa.moneda_x.itf | number:'1.2-2' }} USD</span>
                        </div>
                      } @else if (envioMonedaId !== 1 && envioResultRemesa.bob.itf != null) {
                        <div class="calc-res-row">
                          <span class="calc-res-label">ITF</span>
                          <span class="calc-res-val">{{ envioResultRemesa.bob.itf | number:'1.2-2' }} Bs</span>
                        </div>
                      }
                      <div class="calc-res-row total">
                        <span class="calc-res-label">Total a cobrar</span>
                        @if (envioMonedaId === 1) {
                          <span class="calc-res-val venta">{{ envioResultRemesa.moneda_x.total_operacion | number:'1.2-2' }} USD</span>
                        } @else {
                          <span class="calc-res-val venta">{{ envioResultRemesa.bob.total_operacion | number:'1.2-2' }} Bs</span>
                        }
                      </div>
                      @if (envioMonedaId === 1) {
                        <div class="calc-res-row">
                          <span class="calc-res-label">Total en BOB</span>
                          <span class="calc-res-val">{{ envioResultRemesa.bob.total_operacion | number:'1.2-2' }} Bs</span>
                        </div>
                      }
                      @if (envioResultRemesa.total_clp) {
                        <div class="calc-res-row">
                          <span class="calc-res-label">Destinatario recibe</span>
                          <span class="calc-res-val compra">{{ envioResultRemesa.total_clp | number:'1.0-0' }} CLP</span>
                        </div>
                      } @else if (envioResultRemesa.equivalente_usd && envioMonedaId === 2) {
                        <div class="calc-res-row">
                          <span class="calc-res-label">Equivalente USD</span>
                          <span class="calc-res-val compra">{{ envioResultRemesa.equivalente_usd | number:'1.2-2' }} USD</span>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            }
          </div>

          <!-- Cotizaciones -->
          <div class="bp-widget bp-cot" [class.bp-min]="cotMinimized">
            <button class="bp-header" (click)="cotMinimized = !cotMinimized">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              <span class="bp-title">Cotizaciones del día</span>
              <svg class="bp-chev" [class.flip]="!cotMinimized" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
            </button>
            @if (!cotMinimized) {
              <div class="bp-body cot-scroll">
                @for (c of headerCotizaciones; track c.id_moneda) {
                  <div class="cot-row">
                    <img class="cot-flag" [src]="flagUrl(c.moneda)" [alt]="c.moneda" width="28" height="21">
                    <div class="cot-info">
                      <span class="cot-code">{{ c.moneda }}</span>
                      <span class="cot-desc">{{ c.moneda_desc }}</span>
                    </div>
                    <span class="cot-val compra">{{ c.compra | number:'1.2-2' }}</span>
                    <span class="cot-val venta">{{ c.venta | number:'1.2-2' }}</span>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </mat-sidenav-content>

    </mat-sidenav-container>
  `,
  styles: [`
    :host { display: block; height: 100vh; }

    .app { height: 100vh; }

    /* ===== SIDEBAR ===== */
    .sidebar {
      width: 252px;
      background: var(--sidebar-bg, #14213d) !important;
      color: var(--sidebar-text, #e6ebf5);
      display: flex;
      flex-direction: column;
      border-right: none !important;
    }

    .side-head {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 14px 16px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, .08);
    }
    .side-head .logo {
      height: 30px;
      width: auto;
      max-width: 150px;
      object-fit: contain;
      filter: brightness(1.05);
    }
    .toggle {
      margin-left: auto;
      width: 28px;
      height: 28px;
      border-radius: 7px;
      border: 1px solid rgba(255, 255, 255, .14);
      background: rgba(255, 255, 255, .05);
      color: #c6d2e6;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .toggle:hover { background: rgba(255, 255, 255, .12); }

    /* ===== NAV ===== */
    .side-nav {
      flex: 1;
      overflow-y: auto;
      padding: 10px 8px;
    }
    .side-nav::-webkit-scrollbar { width: 6px; }
    .side-nav::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, .12); border-radius: 3px; }

    .group { margin-bottom: 12px; }
    .group-h {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px 4px;
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: .06em;
      color: #b7c2d2;
      font-weight: 700;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 11px;
      padding: 9px 11px;
      border-radius: 9px;
      color: #e0e7f0;
      text-decoration: none;
      font-size: 13.5px;
      font-weight: 500;
      margin-bottom: 2px;
      white-space: nowrap;
      cursor: pointer;
    }
    .nav-item svg, .nav-item .nav-icon { flex: 0 0 20px; display: flex; align-items: center; }
    .nav-item .lbl { overflow: hidden; text-overflow: ellipsis; }
    .nav-item:hover { background: rgba(255, 255, 255, .06); color: #fff; }
    .nav-item.active { background: #F5820A; color: #14213d; font-weight: 700; }

    .nav-group { display: block; }
    .nav-group .chev { margin-left: auto; transition: transform .18s ease; opacity: .65; }
    .nav-group .chev.rot { transform: rotate(90deg); }
    .sub-nav {
      display: flex;
      flex-direction: column;
      margin: 2px 0 6px 20px;
      padding-left: 10px;
      border-left: 1px solid rgba(255, 255, 255, .14);
    }
    .sub-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 7px 10px;
      border-radius: 7px;
      font-size: 12.5px;
      color: #c7d1df;
      text-decoration: none;
      white-space: nowrap;
      cursor: pointer;
    }
    .sub-item svg { flex: 0 0 14px; opacity: .7; }
    .sub-item.active svg { opacity: 1; }
    .sub-item:hover { background: rgba(255, 255, 255, .06); color: #fff; }
    .sub-item.active { color: #ffb15e; font-weight: 700; background: rgba(245, 130, 52, .2); box-shadow: inset 2px 0 #F5820A; }
    .sub-dot {
      background: #d32f2f; color: #fff; border-radius: 9px;
      padding: 0 6px; font-size: 10.5px; font-weight: 700; flex: 0 0 auto; margin-left: auto;
    }

    /* ===== PANELES FLOTANTES (estilo LinkedIn messaging) ===== */
    .bottom-panels {
      position: fixed;
      bottom: 0;
      right: 24px;
      z-index: 50;
      display: flex;
      align-items: flex-end;
      gap: 8px;
    }
    .bp-widget {
      width: 300px;
      border-radius: 10px 10px 0 0;
      box-shadow: 0 -2px 12px rgba(0,0,0,.14);
      background: var(--card-bg, #fff);
      border: 1px solid var(--border, #e5e7eb);
      border-bottom: none;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .bp-widget.bp-min { width: 220px; }
    .bp-header {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 10px 14px;
      border: none;
      background: #373435;
      color: #fff;
      cursor: pointer;
      font-size: 13px;
      font-weight: 700;
    }
    .bp-header:hover { background: #444; }
    .bp-title { flex: 1; text-align: left; }
    .bp-chev { transition: transform .2s; }
    .bp-chev.flip { transform: rotate(180deg); }
    .bp-body { background: var(--card-bg, #fff); }

    /* --- Cotizaciones scroll --- */
    .cot-scroll {
      max-height: 380px;
      overflow-y: auto;
    }
    .cot-scroll::-webkit-scrollbar { width: 5px; }
    .cot-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,.15); border-radius: 3px; }
    .cot-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 14px;
      border-bottom: 1px solid var(--border, #e5e7eb);
    }
    .cot-row:last-child { border-bottom: none; }
    .cot-row:hover { background: var(--hover-bg, #f8f9fa); }
    .cot-flag {
      flex: 0 0 28px;
      width: 28px;
      height: 21px;
      object-fit: cover;
      border-radius: 3px;
      box-shadow: 0 1px 3px rgba(0,0,0,.18);
    }
    .cot-info { flex: 1; min-width: 0; }
    .cot-code {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-primary, #1a1a1a);
      display: block;
    }
    .cot-desc {
      font-size: 10.5px;
      color: var(--text-muted, #9099A6);
      display: block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .cot-val {
      font-size: 13px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      text-align: right;
      min-width: 45px;
    }
    .cot-val.compra { color: #16a34a; }
    .cot-val.venta { color: #dc2626; }

    /* --- Calculadora --- */
    .calc-tabs {
      display: flex;
      border-bottom: 1px solid var(--border, #e5e7eb);
      background: var(--card-bg, #fff);
    }
    .calc-tab {
      flex: 1;
      padding: 8px 0;
      border: none;
      background: none;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted, #9099A6);
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all .15s;
    }
    .calc-tab:hover { color: var(--text-primary, #1a1a1a); }
    .calc-tab.active {
      color: #F58634;
      border-bottom-color: #F58634;
    }
    .calc-body { padding: 12px 14px; }
    .calc-row { margin-bottom: 10px; }
    .calc-status {
      text-align: center;
      padding: 8px;
      font-size: 12px;
      border-radius: 6px;
    }
    .calc-status.loading { color: var(--text-muted, #9099A6); }
    .calc-status.error { color: #dc2626; background: rgba(220,38,38,.06); }
    .calc-res-row.total { font-size: 13px; }
    .calc-check-row {
      display: flex; align-items: center; gap: 6px; padding: 2px 0 4px;
      font-size: 11px; color: var(--text-secondary, #64748B); cursor: pointer; text-transform: uppercase; font-weight: 600; letter-spacing: .3px;
    }
    .calc-check-row input { margin: 0; cursor: pointer; }
    .calc-lbl {
      display: block;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted, #9099A6);
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: .04em;
    }
    .calc-input {
      width: 100%;
      padding: 8px 10px;
      border: 1px solid var(--border, #e5e7eb);
      border-radius: 7px;
      font-size: 13px;
      background: var(--card-bg, #fff);
      color: var(--text-primary, #1a1a1a);
      box-sizing: border-box;
    }
    .calc-input:focus { outline: none; border-color: #F58634; }
    .calc-select { cursor: pointer; }
    .calc-result {
      background: var(--hover-bg, #f8f9fa);
      border-radius: 8px;
      padding: 10px 12px;
    }
    .calc-res-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
    }
    .calc-res-row + .calc-res-row { border-top: 1px solid var(--border, #e5e7eb); }
    .calc-res-label {
      font-size: 11.5px;
      color: var(--text-secondary, #5B6472);
    }
    .calc-res-val {
      font-size: 14px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .calc-res-val.compra { color: #16a34a; }
    .calc-res-val.venta { color: #dc2626; }

    @media (max-width: 860px) {
      .bottom-panels { right: 8px; gap: 4px; }
      .bp-widget { width: 180px; }
      .bp-widget.bp-min { width: 160px; }
    }

    /* ===== FOOTER ===== */
    .side-foot {
      border-top: 1px solid rgba(255, 255, 255, .08);
      padding: 10px 12px 12px;
    }
    .user-menu-wrap { position: relative; }
    .user-trigger {
      display: flex; align-items: center; gap: 10px;
      width: 100%; padding: 8px; border-radius: 8px;
      border: none; background: transparent; color: inherit;
      cursor: pointer; text-align: left; transition: background .15s;
    }
    .user-trigger:hover { background: rgba(255, 255, 255, .08); }
    .av {
      width: 34px; height: 34px; border-radius: 50%;
      background: #F5820A; color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 12px; flex: 0 0 34px;
    }
    .who { flex: 1; min-width: 0; }
    .who .n {
      font-size: 12.5px; font-weight: 600;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .who .r {
      font-size: 11px; color: #8a97b5;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .trigger-dots {
      flex: 0 0 16px; color: #8a97b5; opacity: 0;
      transition: opacity .15s;
    }
    .user-trigger:hover .trigger-dots { opacity: 1; }

    .user-dropdown {
      position: absolute; bottom: calc(100% + 8px); left: 0; right: 0;
      background: var(--card-bg, #1e293b); border: 1px solid var(--border, rgba(255,255,255,.12));
      border-radius: 10px; padding: 6px; z-index: 200;
      box-shadow: 0 -4px 24px rgba(0,0,0,.35);
      min-width: 200px;
    }
    .ud-item {
      display: flex; align-items: center; gap: 10px;
      width: 100%; padding: 8px 10px; border-radius: 6px;
      border: none; background: transparent;
      color: var(--text-primary, #e2e8f0); font-size: 13px;
      cursor: pointer; text-decoration: none; transition: background .12s;
      white-space: nowrap;
    }
    .ud-item:hover { background: var(--hover-bg, rgba(255,255,255,.08)); }
    .ud-item svg { flex: 0 0 16px; color: var(--text-secondary, #94a3b8); }
    .ud-active { color: #F58634 !important; }
    .ud-active svg { color: #F58634 !important; }
    .ud-check { margin-left: auto; flex: 0 0 14px; }
    .ud-danger { color: #ef4444 !important; }
    .ud-danger svg { color: #ef4444 !important; }
    .ud-danger:hover { background: rgba(239,68,68,.1) !important; }
    .ud-sep { height: 1px; background: var(--border, rgba(255,255,255,.1)); margin: 4px 0; }
    .ud-submenu-trigger .chev-right { margin-left: auto; flex: 0 0 12px; }
    .ud-submenu {
      padding: 2px 0 2px 6px;
    }

    /* ===== MAIN CONTENT ===== */
    .main {
      min-width: 0;
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: var(--page-bg, #fafafa);
    }
    .top {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 11px 24px;
      border-bottom: 1px solid var(--border, #e5e7eb);
      position: sticky;
      top: 0;
      background: var(--header-bg, #fff);
      z-index: 6;
    }
    .menu-btn {
      width: 36px;
      height: 36px;
      border: none;
      background: transparent;
      color: var(--text-secondary, #5B6472);
      cursor: pointer;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .menu-btn:hover { background: var(--hover-bg, #f3f4f6); }

    .unit {
      display: flex;
      align-items: center;
      gap: 8px;
      border: 1px solid var(--border, #e5e7eb);
      border-radius: 8px;
      padding: 7px 11px;
      font-size: 13px;
      color: var(--text-secondary, #5B6472);
      background: var(--header-bg, #fff);
    }
    .unit svg { color: var(--text-muted, #9099A6); }

    /* ===== SIAT STATUS ===== */
    .siat-wrap { position: relative; }
    .siat-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      border: 1px solid var(--border, #e5e7eb);
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: .04em;
      cursor: pointer;
      background: var(--header-bg, #fff);
      transition: border-color .2s, background .2s;
    }
    .siat-badge:hover { filter: brightness(.97); }
    .siat-badge.online { border-color: var(--success-border, #bbf7d0); background: var(--success-bg, #f0fdf4); color: var(--success-text, #15803d); }
    .siat-badge.warning { border-color: var(--warning-border, #fed7aa); background: var(--warning-bg, #fffbeb); color: var(--warning-text, #b45309); }
    .siat-badge.offline { border-color: var(--error-border, #fecaca); background: var(--error-bg, #fef2f2); color: var(--error-text, #dc2626); }
    .siat-dot { width: 7px; height: 7px; border-radius: 50%; flex: 0 0 7px; }
    .siat-badge.online .siat-dot { background: #22c55e; box-shadow: 0 0 4px #22c55e; }
    .siat-badge.warning .siat-dot { background: #f59e0b; box-shadow: 0 0 4px #f59e0b; }
    .siat-badge.offline .siat-dot { background: #ef4444; box-shadow: 0 0 4px #ef4444; }
    .siat-icon { flex: 0 0 16px; }
    .siat-chevron { transition: transform .2s; flex: 0 0 12px; }
    .siat-chevron.open { transform: rotate(180deg); }

    .siat-panel {
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      width: 340px;
      background: var(--panel-bg, #fff);
      border: 1px solid var(--border, #e5e7eb);
      border-radius: 12px;
      box-shadow: 0 8px 30px rgba(0,0,0,.12);
      z-index: 100;
      padding: 0;
      overflow: hidden;
    }
    .sp-section { padding: 14px 16px; }
    .sp-section + .sp-section { border-top: 1px solid var(--border-light, #f1f5f9); }
    .sp-title {
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .05em; color: var(--text-primary, #14213d); margin-bottom: 10px;
    }
    .sp-sub {
      font-size: 10px; color: var(--text-muted, #94a3b8); margin-top: -6px; margin-bottom: 8px;
    }
    .sp-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 5px 0; font-size: 12.5px; color: var(--text-secondary, #475569);
    }
    .sp-check { display: flex; align-items: center; }
    .sp-check.ok { color: #22c55e; }
    .sp-check.fail { color: #ef4444; }
    .sp-estado {
      font-size: 11px; font-weight: 700; letter-spacing: .03em;
    }
    .sp-estado.en-linea { color: #22c55e; }
    .sp-estado.contingencia { color: #f59e0b; }
    .sp-estado.inactivo { color: #ef4444; }
    .sp-count {
      font-weight: 700; font-size: 13px; color: #22c55e;
    }
    .sp-count.has-pending { color: #f59e0b; }
    .sp-info { margin-bottom: 8px; }
    .sp-info-row {
      display: flex; gap: 8px; padding: 3px 0; font-size: 12px;
    }
    .sp-k { color: var(--text-muted, #94a3b8); font-weight: 600; white-space: nowrap; min-width: 110px; }
    .sp-v { color: var(--text-primary, #1e293b); font-weight: 500; }
    .sp-v.mono { font-family: monospace; font-size: 11px; }
    .sp-v.truncate { max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sp-empty { font-size: 12px; color: var(--text-muted, #94a3b8); font-style: italic; }
    .cufd-status { margin-top: 4px; padding-top: 6px; border-top: 1px dashed var(--border, #e5e7eb); }

    /* ===== HEADER ACTIONS ===== */
    .hdr-actions {
      display: flex; align-items: center; gap: 6px;
    }
    .hdr-icon-btn {
      position: relative;
      width: 36px; height: 36px; border-radius: 8px;
      border: none;
      background: transparent;
      color: var(--text-secondary, #5B6472);
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background .15s;
    }
    .hdr-icon-btn:hover { background: var(--hover-bg, #f3f4f6); }
    .hdr-icon-btn.has-unread { color: #F58634; }

    /* ===== NOTIFICACIONES ===== */
    .notif-wrap { position: relative; }
    .notif-badge {
      position: absolute; top: -5px; right: -5px;
      min-width: 18px; height: 18px; border-radius: 9px;
      background: #F58634; color: #fff;
      font-size: 10px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      padding: 0 4px; line-height: 1;
    }
    .notif-badge.critica { background: #dc2626; animation: pulse-badge 2s infinite; }
    @keyframes pulse-badge { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }

    .notif-panel {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 360px;
      max-height: 420px;
      background: var(--panel-bg, #fff);
      border: 1px solid var(--border, #e5e7eb);
      border-radius: 12px;
      box-shadow: 0 8px 30px rgba(0,0,0,.12);
      z-index: 100;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .np-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 16px; border-bottom: 1px solid var(--border-light, #f1f5f9);
    }
    .np-title { font-size: 14px; font-weight: 700; color: var(--text-primary, #14213d); }
    .np-mark-all {
      font-size: 11.5px; color: #F58634; background: none; border: none;
      cursor: pointer; font-weight: 600;
    }
    .np-mark-all:hover { text-decoration: underline; }
    .np-empty {
      padding: 32px 16px; text-align: center;
      font-size: 13px; color: var(--text-muted, #94a3b8);
    }
    .np-list { overflow-y: auto; flex: 1; }
    .np-item {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 12px 16px; cursor: pointer;
      border-bottom: 1px solid var(--border-light, #f1f5f9);
      transition: background .15s;
    }
    .np-item:last-child { border-bottom: none; }
    .np-item:hover { background: var(--hover-bg, #f8fafc); }
    .np-item.no-leida { background: var(--notif-unread-bg, #fffbeb); }
    .np-item.no-leida:hover { background: var(--notif-unread-hover, #fef3c7); }
    .np-urg {
      width: 8px; height: 8px; border-radius: 50%; flex: 0 0 8px; margin-top: 5px;
    }
    .np-urg.urg-critica { background: #dc2626; }
    .np-urg.urg-alta { background: #f97316; }
    .np-urg.urg-media { background: #f59e0b; }
    .np-urg.urg-baja { background: #3b82f6; }
    .np-body { flex: 1; min-width: 0; }
    .np-item-title { font-size: 12.5px; font-weight: 600; color: var(--text-primary, #1e293b); }
    .np-msg { font-size: 11.5px; color: var(--text-secondary, #64748b); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .np-time { font-size: 10.5px; color: var(--text-muted, #94a3b8); margin-top: 4px; }

    .tsp { flex: 1; }

    .page {
      padding: 20px 28px 46px;
      width: 100%;
      flex: 1;
      overflow-y: auto;
      background: var(--page-bg, #fafafa);
    }

    /* ===== MOBILE ===== */
    @media (max-width: 860px) {
      .page { padding: 14px; }
      .notif-panel { width: 300px; right: -40px; }
    }
  `],
})
export class ShellComponent implements OnInit, OnDestroy {
  auth = inject(AuthService);
  private router = inject(Router);
  private cambioService = inject(CambioService);
  private bankingService = inject(BankingService);
  private notifService = inject(NotificacionService);
  @ViewChild('sidenav') sidenav!: MatSidenav;

  isMobile = window.innerWidth < 860;
  sidenavOpened = !this.isMobile;
  siatStatus: EstadoSiat | null = null;
  siatPanelOpen = false;
  darkMode = false;
  themeMode: 'light' | 'dark' | 'system' = 'light';
  userMenuOpen = false;
  aparienciaOpen = false;
  private siatSub?: Subscription;
  private routerSub?: Subscription;
  private bancosAvisosSub?: Subscription;
  private notifSub?: Subscription;

  navItems: NavItem[] = [];

  cambioAbierto = false;
  remesaAbierta = false;
  pagoRemesaAbierto = false;
  giroAbierto = false;
  efectivoAbierto = false;

  get cambioOp(): string {
    const params = this.router.parseUrl(this.router.url).queryParams;
    return params['op'] || '';
  }
  get pagoRemesaTipo(): string {
    const params = this.router.parseUrl(this.router.url).queryParams;
    return params['tipo'] || '';
  }
  get giroTabPagar(): boolean {
    return this.router.url.startsWith('/giro') && this.router.url.includes('tab=pagar');
  }
  get giroTabDevolver(): boolean {
    return this.router.url.startsWith('/giro') && this.router.url.includes('tab=devolver');
  }
  get movGrupo(): string {
    const path = this.router.url.split(/[?#]/, 1)[0];
    if (path === '/movimientos/cajero') return 'cajero';
    if (path === '/movimientos/boveda') return 'boveda';
    const params = this.router.parseUrl(this.router.url).queryParams;
    if (params['grupo']) return params['grupo'];
    return params['op'] === 'traspaso_cajero' ? 'cajero' : 'boveda';
  }

  get tieneAccesoBancos(): boolean {
    const rol = this.auth.rol?.id_rol ?? 0;
    return ROLES_ADMIN.includes(rol);
  }

  get tieneAccesoEgresos(): boolean {
    const rol = this.auth.rol?.id_rol ?? 0;
    return ROLES_ADMIN.includes(rol);
  }

  tieneAcceso(item: NavItem): boolean {
    if (!item.roles) return true;
    const rol = this.auth.rol?.id_rol ?? 0;
    return item.roles.includes(rol);
  }

  bancosAbierto = false;
  bancosTabs = ['cuentas', 'traspasos', 'depositos', 'movimientos', 'cheques', 'conciliacion'];

  bancosTabActiva = '';

  private autoExpandGroups(url: string): void {
    if (url.startsWith('/cambio') || url.startsWith('/historial')) this.cambioAbierto = true;
    if (url.startsWith('/remesa') || url.startsWith('/historial-remesa')) this.remesaAbierta = true;
    if (url.startsWith('/pago-remesa') || url.startsWith('/historial-pago-remesa')) this.pagoRemesaAbierto = true;
    if (url.startsWith('/giro') || url.startsWith('/historial-giro')) this.giroAbierto = true;
    if (url.startsWith('/movimientos')) this.efectivoAbierto = true;
  }

  private sincronizarBancos(url: string): void {
    if (url.includes('/bancos')) {
      this.bancosAbierto = true;
      const parsed = this.router.parseUrl(url);
      const segmento = parsed.root.children['primary']?.segments[1]?.path;
      this.bancosTabActiva = segmento || parsed.queryParams['tab'] || 'cuentas';
    } else {
      this.bancosTabActiva = '';
    }
  }

  toggleBancos(): void {
    this.bancosAbierto = !this.bancosAbierto;
  }

  bancosPendientes = 0;
  bancosEnvios = 0;

  headerCotizaciones: { id_moneda: number; moneda: string; moneda_desc: string; compra: number; venta: number }[] = [];
  cotMinimized = false;
  calcMinimized = true;
  calcTab: 'cambio' | 'envio' = 'cambio';
  calcMoneda = '';
  calcMonto = 0;
  calcResultCompra = 0;
  calcResultVenta = 0;

  envioTipo: 'giro' | 'remesa' = 'giro';
  envioMonedaId = 2;
  envioMonto = 0;
  envioDestino = 0;
  envioInclComision = 1;
  envioLoading = false;
  envioError = '';
  envioResultGiro: ComisionGiroResult | null = null;
  envioResultRemesa: ComisionResult | null = null;
  destinos: { id_destino: number; descripcion: string }[] = [];
  envioMonedas = [
    { id: 2, code: 'BOB', name: 'Boliviano' },
    { id: 1, code: 'USD', name: 'Dólar Americano' },
  ];

  private envioCalc$ = new Subject<void>();
  private envioSub?: Subscription;

  private giroService = inject(GiroService);
  private remesaService = inject(RemesaService);

  calcular_preview(): void {
    const c = this.headerCotizaciones.find(x => x.moneda === this.calcMoneda);
    if (!c || this.calcMonto <= 0) { this.calcResultCompra = 0; this.calcResultVenta = 0; return; }
    this.calcResultCompra = this.calcMonto * c.compra;
    this.calcResultVenta = this.calcMonto * c.venta;
  }

  onEnvioChange(monedaCambio = false): void {
    this.envioMonedaId = +this.envioMonedaId;
    this.envioDestino = +this.envioDestino;
    if (monedaCambio) {
      this.envioInclComision = this.envioMonedaId === 2 ? 1 : 0;
    }
    this.envioResultGiro = null;
    this.envioResultRemesa = null;
    this.envioError = '';
    if (this.envioMonto > 0) {
      this.envioCalc$.next();
    }
  }

  private initEnvioCalc(): void {
    this.envioSub = this.envioCalc$.pipe(
      debounceTime(400),
    ).subscribe(() => this.calcularEnvio());
  }

  private calcularEnvio(): void {
    if (this.envioMonto <= 0) return;
    this.envioLoading = true;
    this.envioError = '';

    if (this.envioTipo === 'giro') {
      this.giroService.calcularComision({
        id_moneda: this.envioMonedaId,
        monto: this.envioMonto,
      }).subscribe({
        next: r => {
          this.envioResultGiro = r;
          this.envioLoading = false;
        },
        error: (e: Error) => {
          this.envioError = e.message || 'Error al calcular';
          this.envioLoading = false;
        },
      });
    } else {
      if (!this.envioDestino) { this.envioLoading = false; this.envioError = 'Seleccione destino'; return; }
      this.remesaService.calcularComision({
        tipo_comision: 0,
        id_moneda: this.envioMonedaId,
        id_operacion: 16,
        monto: this.envioMonto,
        id_destino: this.envioDestino,
        incluir_comision: this.envioInclComision,
      }).subscribe({
        next: r => {
          this.envioResultRemesa = r;
          this.envioLoading = false;
        },
        error: (e: Error) => {
          this.envioError = e.message || 'Error al calcular';
          this.envioLoading = false;
        },
      });
    }
  }

  private cargarDestinos(): void {
    this.remesaService.destinos().subscribe({
      next: d => {
        this.destinos = d;
        if (d.length > 0) this.envioDestino = d[0].id_destino;
      },
      error: () => {},
    });
  }

  private readonly paisMoneda: Record<string, string> = {
    USD: 'us', EUR: 'eu', BRL: 'br', ARS: 'ar', PEN: 'pe',
    CLP: 'cl', PYG: 'py', GBP: 'gb', JPY: 'jp', CAD: 'ca',
    MXN: 'mx', COP: 'co', UYU: 'uy', BOB: 'bo', CHF: 'ch',
    AUD: 'au', CNY: 'cn', KRW: 'kr', SEK: 'se', NOK: 'no',
    DKK: 'dk', NZD: 'nz', ZAR: 'za', INR: 'in', TWD: 'tw',
  };

  flagUrl(moneda: string): string {
    const code = this.paisMoneda[moneda] || '';
    return code ? `https://flagcdn.com/w40/${code}.png` : '';
  }

  bancosBadge(tab: string): number {
    if (tab === 'traspasos') return this.bancosPendientes;
    if (tab === 'cheques') return this.bancosEnvios;
    return 0;
  }

  private cargarAvisosBancos(): void {
    this.bankingService.traspasosPendientes().subscribe({
      next: r => this.bancosPendientes = r.total,
      error: () => {},
    });
    this.bankingService.enviosPendientes().subscribe({
      next: r => this.bancosEnvios = r.total,
      error: () => {},
    });
  }

  // --- Notificaciones ---
  notifConteo: NotificacionConteo = { total: 0, critica: 0, alta: 0, media: 0, baja: 0 };
  notificaciones: Notificacion[] = [];
  notifPanelOpen = false;

  private cargarNotificaciones(): void {
    this.notifService.contarNoLeidas().subscribe({
      next: c => this.notifConteo = c,
      error: () => {},
    });
    this.notifService.listar({ leida: 0, limit: 15 }).subscribe({
      next: n => this.notificaciones = n,
      error: () => {},
    });
  }

  marcarLeida(n: Notificacion): void {
    if (n.leida) return;
    this.notifService.marcarLeida(n.id_notificacion).subscribe({
      next: () => {
        n.leida = 1;
        this.notifConteo.total = Math.max(0, this.notifConteo.total - 1);
      },
      error: () => {},
    });
  }

  marcarTodasLeidas(): void {
    this.notifService.marcarTodasLeidas().subscribe({
      next: () => {
        this.notificaciones.forEach(n => n.leida = 1);
        this.notifConteo = { total: 0, critica: 0, alta: 0, media: 0, baja: 0 };
      },
      error: () => {},
    });
  }

  tiempoRelativo(fecha: string): string {
    const diff = Date.now() - new Date(fecha).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs}h`;
    const dias = Math.floor(hrs / 24);
    return `hace ${dias}d`;
  }

  // --- Dark mode ---
  cycleTheme(): void {
    const next = this.themeMode === 'light' ? 'dark' : this.themeMode === 'dark' ? 'system' : 'light';
    this.setTheme(next);
  }

  setTheme(mode: 'light' | 'dark' | 'system'): void {
    this.themeMode = mode;
    try { localStorage.setItem('pos_theme_mode', mode); } catch {}
    this.applyTheme();
  }

  private applyTheme(): void {
    let effectiveDark = false;
    if (this.themeMode === 'dark') effectiveDark = true;
    else if (this.themeMode === 'system') effectiveDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.darkMode = effectiveDark;
    document.documentElement.setAttribute('data-theme', effectiveDark ? 'dark' : 'light');
  }

  private loadTheme(): void {
    try {
      const saved = localStorage.getItem('pos_theme_mode') as 'light' | 'dark' | 'system' | null;
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        this.themeMode = saved;
      } else {
        const legacy = localStorage.getItem('pos_dark_mode');
        this.themeMode = legacy === '1' ? 'dark' : 'light';
      }
    } catch {
      this.themeMode = 'light';
    }
    this.applyTheme();
  }

  ngOnInit(): void {
    this.loadTheme();

    this.autoExpandGroups(this.router.url);
    if (this.router.url.includes('/bancos')) this.bancosAbierto = true;

    this.cargarAvisosBancos();
    this.bancosAvisosSub = timer(0, 60_000).subscribe(() => {
      if (this.bancosAbierto) this.cargarAvisosBancos();
    });

    this.sincronizarBancos(this.router.url);
    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => {
        this.sincronizarBancos(e.urlAfterRedirects);
        this.autoExpandGroups(e.urlAfterRedirects);
      });

    this.siatSub = timer(0, 120_000).pipe(
      switchMap(() => this.cambioService.estadoSiat().pipe(
        catchError(() => of({
          conexiones: { facturador: false, sin: false, estado: 'INACTIVO' as const },
          punto_venta: null,
          sincronizacion: { cambios_pendientes: 0 },
          puede_facturar: false,
        } as EstadoSiat))
      ))
    ).subscribe(s => this.siatStatus = s);

    this.cargarNotificaciones();
    this.notifSub = timer(60_000, 60_000).subscribe(() => this.cargarNotificaciones());

    this.cargarCotizaciones();
    this.cargarDestinos();
    this.initEnvioCalc();
  }

  private cargarCotizaciones(): void {
    this.cambioService.cotizaciones().subscribe({
      next: cots => {
        this.headerCotizaciones = cots
          .filter(c => c.compra != null && c.venta != null)
          .map(c => ({ id_moneda: c.id_moneda, moneda: c.moneda, moneda_desc: c.moneda_desc, compra: c.compra!, venta: c.venta! }));
      },
      error: () => {},
    });
  }

  ngOnDestroy(): void {
    this.siatSub?.unsubscribe();
    this.routerSub?.unsubscribe();
    this.bancosAvisosSub?.unsubscribe();
    this.notifSub?.unsubscribe();
    this.envioSub?.unsubscribe();
  }

  @HostListener('window:resize')
  onResize(): void {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth < 860;
    if (wasMobile && !this.isMobile) this.sidenavOpened = true;
    if (!wasMobile && this.isMobile) this.sidenavOpened = false;
  }

  toggle(): void {
    this.sidenavOpened = !this.sidenavOpened;
  }

  onNavClick(): void {
    if (this.isMobile) this.sidenavOpened = false;
  }

  isActive(path: string): boolean {
    const currentPath = this.router.url.split('?')[0].replace(/\/$/, '');
    const targetPath = path.replace(/\/$/, '');
    return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
  }

  get userInitials(): string {
    const name = this.auth.user?.nombre ?? '';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts.length ? parts[0][0].toUpperCase() : '?';
  }

  get agenciaLabel(): string {
    const ag = this.auth.agencia;
    if (!ag) return '';
    return `Sucursal ${ag.descripcion}`;
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: Event): void {
    const target = e.target as HTMLElement;
    if (this.siatPanelOpen && !target.closest('.siat-wrap')) this.siatPanelOpen = false;
    if (this.notifPanelOpen && !target.closest('.notif-wrap')) this.notifPanelOpen = false;
    if (this.userMenuOpen && !target.closest('.user-menu-wrap')) { this.userMenuOpen = false; this.aparienciaOpen = false; }
  }

  logout(): void {
    this.auth.logout();
  }
}
