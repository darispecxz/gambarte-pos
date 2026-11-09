import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { AgenciaInfo } from '../../core/auth.models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-page">

      <!-- Panel izquierdo: branding -->
      <div class="brand-panel">
        <div class="brand-content">
          <img src="gambarte-logo.png" alt="Gambarte" class="brand-logo" />
          <h1 class="brand-title">Punto de Venta</h1>
          <p class="brand-desc">Sistema de gestión de cajas, cambios, giros y remesas para operaciones de ventanilla.</p>
        </div>

        <div class="brand-decor">
          <div class="circle c1"></div>
          <div class="circle c2"></div>
          <div class="circle c3"></div>
          <div class="wave"></div>
        </div>

        <p class="brand-copy">&copy; {{ currentYear }} Gambarte Bolivia S.R.L.</p>
      </div>

      <!-- Panel derecho: formulario -->
      <div class="form-panel">
        <div class="form-wrap">
          <div class="form-head">
            <div class="brand-lockup">
              <img src="gambarte-logo.png" alt="Gambarte" class="form-logo-mobile" />
              <span class="pos-tag">POS</span>
            </div>
            <span class="product-label">Punto de Venta</span>
            <h2>Iniciar Sesión</h2>
            <p>Ingrese sus credenciales para acceder al sistema.</p>
          </div>

          <form class="form" (ngSubmit)="submit()">

            <div class="field">
              <label for="usuario">Usuario</label>
              <div class="input-wrap">
                <svg class="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <input id="usuario" type="text" autocomplete="username"
                       placeholder="Ingrese su usuario"
                       [(ngModel)]="usuario" name="usuario"
                       (blur)="onUsuarioBlur()" />
              </div>
            </div>

            <div class="field">
              <label for="agencia">Agencia / Sucursal</label>
              <div class="input-wrap">
                <svg class="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                @if (loadingAgencies) {
                  <span class="loading-text">Cargando agencias...</span>
                } @else {
                  <select id="agencia" [(ngModel)]="idAgencia" name="agencia">
                    <option [ngValue]="-1" disabled>Seleccione una agencia</option>
                    @for (ag of agencies; track ag.id_agencia) {
                      <option [ngValue]="ag.id_agencia">{{ ag.descripcion }}</option>
                    }
                  </select>
                }
              </div>
            </div>

            <div class="field">
              <label for="password">Contraseña</label>
              <div class="input-wrap">
                <svg class="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <input id="password" [type]="showPassword ? 'text' : 'password'"
                       autocomplete="current-password"
                       placeholder="Ingrese su contraseña"
                       [(ngModel)]="password" name="password" />
                <button type="button" class="eye-btn" (click)="showPassword = !showPassword" tabindex="-1">
                  @if (!showPassword) {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  } @else {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  }
                </button>
              </div>
            </div>

            @if (error) {
              <div class="error-msg">
                <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {{ error }}
              </div>
            }

            <button type="submit" class="btn-login" [disabled]="submitting">
              @if (submitting) {
                <span class="spin-sm"></span>Ingresando...
              } @else {
                Ingresar
              }
            </button>
          </form>

          <p class="form-copy-mobile">&copy; {{ currentYear }} Gambarte Bolivia S.R.L.</p>
        </div>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; }

    .login-page {
      display: flex;
      min-height: 100vh;
    }

    /* ===== BRAND PANEL (left) ===== */
    .brand-panel {
      flex: 0 0 46%;
      background: linear-gradient(160deg, #14213d 0%, #1b2d52 40%, #14213d 100%);
      color: #fff;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 48px 40px;
      position: relative;
      overflow: hidden;
    }

    .brand-content {
      position: relative;
      z-index: 2;
      max-width: 380px;
      text-align: center;
    }

    .brand-logo {
      height: 56px;
      width: auto;
      margin-bottom: 36px;
      filter: brightness(1.1);
    }

    .brand-title {
      font-size: 32px;
      font-weight: 800;
      line-height: 1.2;
      margin: 0 0 16px;
      letter-spacing: -0.01em;
    }

    .brand-desc {
      font-size: 14.5px;
      line-height: 1.65;
      color: rgba(255, 255, 255, .7);
      margin: 0;
    }

    .brand-copy {
      position: absolute;
      bottom: 24px;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 11.5px;
      color: rgba(255, 255, 255, .35);
      z-index: 2;
      margin: 0;
    }

    /* Decorative elements */
    .brand-decor {
      position: absolute;
      inset: 0;
      z-index: 1;
      pointer-events: none;
    }

    .circle {
      position: absolute;
      border-radius: 50%;
      border: 1px solid rgba(245, 130, 10, .15);
    }

    .c1 { width: 320px; height: 320px; top: -80px; right: -60px; border-color: rgba(245, 130, 10, .12); }
    .c2 { width: 200px; height: 200px; bottom: 60px; left: -40px; border-color: rgba(255, 255, 255, .06); }
    .c3 { width: 120px; height: 120px; top: 40%; right: 20%; background: rgba(245, 130, 10, .06); border: none; }

    .wave {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 200px;
      background:
        radial-gradient(ellipse 80% 60% at 30% 100%, rgba(245, 130, 10, .10) 0%, transparent 70%),
        radial-gradient(ellipse 60% 50% at 70% 100%, rgba(245, 130, 10, .06) 0%, transparent 60%);
    }

    /* ===== FORM PANEL (right) ===== */
    .form-panel {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 32px;
      background: var(--hover-bg, #f8f9fb);
    }

    .form-wrap {
      width: 100%;
      max-width: 400px;
    }

    .form-logo-mobile {
      display: none;
      height: 40px;
      margin-bottom: 16px;
    }

    .form-head {
      margin-bottom: 32px;
    }
    .form-head h2 {
      font-size: 26px;
      font-weight: 800;
      color: var(--text-primary, #1C2430);
      margin: 0 0 8px;
      letter-spacing: -0.01em;
    }
    .form-head p {
      font-size: 14px;
      color: var(--text-secondary, #5b6472);
      margin: 0;
    }

    /* ===== FORM ===== */
    .form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }
    .field label {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary, #1C2430);
    }

    .input-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      border: 1.5px solid var(--border, #E2E5EB);
      border-radius: 11px;
      padding: 0 14px;
      height: 48px;
      background: var(--card-bg, #fff);
      transition: border-color .2s, box-shadow .2s;
    }
    .input-wrap:focus-within {
      border-color: #F5820A;
      box-shadow: 0 0 0 3.5px rgba(245, 130, 10, .10);
    }

    .field-icon {
      width: 20px;
      height: 20px;
      flex: 0 0 20px;
      color: var(--text-muted, #9099A6);
    }

    .input-wrap input,
    .input-wrap select {
      flex: 1;
      border: none;
      background: transparent;
      font-size: 14px;
      color: var(--text-primary, #1C2430);
      outline: none;
      height: 100%;
      font-family: inherit;
    }
    .input-wrap select {
      cursor: pointer;
      appearance: auto;
    }
    .input-wrap input::placeholder {
      color: var(--text-muted, #B0B7C3);
    }

    .loading-text {
      font-size: 13.5px;
      color: var(--text-muted, #9099A6);
      padding: 4px 0;
    }

    .eye-btn {
      border: none;
      background: none;
      cursor: pointer;
      padding: 4px;
      color: var(--text-muted, #9099A6);
      display: flex;
      align-items: center;
    }
    .eye-btn svg {
      width: 20px;
      height: 20px;
    }
    .eye-btn:hover { color: var(--text-secondary, #5b6472); }

    .error-msg {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #FEF2F2;
      border: 1px solid #FECACA;
      border-radius: 9px;
      padding: 11px 14px;
      font-size: 13.5px;
      color: #DC2626;
      font-weight: 500;
    }
    .error-icon {
      width: 18px;
      height: 18px;
      flex: 0 0 18px;
    }

    .btn-login {
      width: 100%;
      height: 50px;
      border: none;
      border-radius: 11px;
      background: #F5820A;
      color: #fff;
      font-size: 15.5px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: background .2s, transform .1s;
      font-family: inherit;
      margin-top: 6px;
    }
    .btn-login:hover:not(:disabled) { background: #B85C05; }
    .btn-login:active:not(:disabled) { transform: scale(.985); }
    .btn-login:disabled { opacity: .6; cursor: not-allowed; }

    .spin-sm {
      width: 18px;
      height: 18px;
      border: 2.5px solid rgba(255, 255, 255, .3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin .6s linear infinite;
      display: inline-block;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .form-copy-mobile {
      display: none;
      text-align: center;
      font-size: 11.5px;
      color: var(--text-muted, #9099A6);
      margin: 28px 0 0;
    }

    /* ===== RESPONSIVE ===== */
    @media (max-width: 860px) {
      .login-page {
        flex-direction: column;
      }

      .brand-panel {
        display: none;
      }

      .form-panel {
        min-height: 100vh;
        background: linear-gradient(180deg, #14213d 0%, #14213d 160px, #f8f9fb 160px);
        padding: 0;
        align-items: flex-start;
      }

      .form-wrap {
        max-width: 100%;
        padding: 24px 20px 32px;
        margin-top: 100px;
        background: var(--card-bg, #fff);
        border-radius: 20px 20px 0 0;
        min-height: calc(100vh - 100px);
      }

      .form-logo-mobile {
        display: block;
      }

      .form-copy-mobile {
        display: block;
      }
    }

    /* Updated visual treatment: brand panel and focused sign-in surface. */
    .login-page {
      min-height: 100vh;
      min-height: 100svh;
      height: 100vh;
      height: 100svh;
      overflow: auto;
      background: #f3f5f8;
    }
    .brand-panel {
      flex-basis: 39%;
      background: linear-gradient(145deg, #202833 0%, #29313b 52%, #202833 100%);
      padding: 56px 48px;
    }
    .brand-panel::after {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: 5px;
      background: linear-gradient(180deg, #ff9b28, #e76b00 52%, #ff9b28);
      content: '';
      opacity: .9;
    }
    .brand-content { max-width: 430px; }
    .brand-logo { height: 58px; margin-bottom: 36px; }
    .brand-title { font-size: 38px; letter-spacing: -.04em; }
    .brand-desc { max-width: 360px; margin: 0 auto; color: #d1d8e2; }
    .brand-copy { color: #a6b1bf; }
    .circle.c1 { width: 430px; height: 430px; top: -170px; right: -160px; border-color: rgba(245,130,10,.2); }
    .circle.c2 { width: 250px; height: 250px; bottom: -110px; left: -100px; border-color: rgba(255,255,255,.1); }
    .circle.c3 { width: 150px; height: 150px; top: 18%; right: 13%; background: rgba(245,130,10,.08); }
    .wave { height: 260px; opacity: .75; }
    .form-panel {
      background: radial-gradient(ellipse at 90% 10%, #fff 0%, transparent 45%), #f1f3f6;
      padding: 42px clamp(28px, 6vw, 92px);
    }
    .form-wrap {
      position: relative;
      max-width: 470px;
      padding: 42px 42px 38px;
      border: 1px solid #e3e8ef;
      border-radius: 16px;
      background: #fff;
      box-shadow: 0 24px 65px rgba(28,39,54,.11), 0 3px 10px rgba(28,39,54,.04);
      overflow: hidden;
    }
    .form-wrap::before { position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,#f5820a,#ffad4d);content:''; }
    .form-head { margin-bottom: 28px; }
    .form-head h2 { margin-bottom:9px;font-size:29px;letter-spacing:-.04em; }
    .form-head h2::before { display:block;margin-bottom:10px;color:#c16a1b;content:'GAMBARTE  /  ACCESO AL SISTEMA';font-size:9px;font-weight:800;letter-spacing:.12em; }
    .form-head p { color: #708096; font-size: 13px; line-height: 1.55; }
    .form { gap: 18px; }
    .field { gap: 7px; }
    .field label { color: #34445a; font-size: 12px; font-weight: 700; }
    .input-wrap {
      height: 50px;
      gap: 11px;
      padding: 0 13px;
      border: 1px solid #d9e0e9;
      border-radius: 9px;
      background: #fff;
    }
    .input-wrap:hover { border-color:#b8c4d2; }
    .input-wrap:focus-within {
      border-color: #ef8a2f;
      box-shadow: 0 0 0 3px rgba(245,130,10,.13);
    }
    .field-icon { color: #8393a8; }
    .input-wrap input, .input-wrap select { color: #203148; font-size: 13px; }
    .input-wrap input::placeholder { color: #9aa6b5; }
    .input-wrap input:-webkit-autofill,
    .input-wrap input:-webkit-autofill:hover,
    .input-wrap input:-webkit-autofill:focus {
      -webkit-text-fill-color:#203148;
      -webkit-box-shadow:0 0 0 1000px #fff inset;
      transition:background-color 99999s ease-out 0s;
    }
    .eye-btn { color: #8393a8; }
    .btn-login {
      height: 49px;
      margin-top: 2px;
      border-radius: 9px;
      background: #f5820a;
      box-shadow: 0 5px 12px rgba(245,130,10,.2);
      font-size: 14px;
    }
    .btn-login:hover:not(:disabled) { background: #df7000; box-shadow: 0 7px 16px rgba(220,105,0,.24); }

    @media (max-width: 860px) {
      .login-page { flex-direction: column; height: auto; min-height: 100svh; }
      .brand-panel {
        display: flex;
        flex: 0 0 auto;
        min-height: 190px;
        box-sizing: border-box;
        padding: 24px;
      }
      .brand-logo { height: 40px; margin-bottom: 10px; }
      .brand-title { margin-bottom: 5px; font-size: 23px; }
      .brand-desc { font-size: 12px; }
      .brand-copy { display: none; }
      .form-panel {
        min-height: 0;
        flex: 1;
        align-items: flex-start;
        padding: 26px 22px 34px;
        background: #f3f5f8;
      }
      .form-wrap {
        width: 100%;
        max-width: 500px;
        min-height: 0;
        box-sizing: border-box;
        margin: 0 auto;
        padding: 30px;
        border: 1px solid #e3e8ef;
        border-radius: 16px;
        box-shadow: 0 12px 35px rgba(28,39,54,.08);
      }
      .form-logo-mobile, .form-copy-mobile { display: none; }
    }
    @media (max-width: 520px) {
      .brand-panel { min-height: 165px; padding: 18px; }
      .brand-logo { height: 34px; }
      .brand-title { font-size: 20px; }
      .brand-desc { max-width: 310px; font-size: 11px; }
      .form-panel { padding: 18px 14px 24px; }
      .form-wrap { padding: 24px 20px; border-radius: 13px; }
      .form-head { margin-bottom: 22px; }
      .form-head h2 { font-size: 23px; }
    }

    /* Centered login card inspired by the supplied reference. */
    .login-page {
      position: relative;
      display: grid;
      place-items: center;
      min-height: 100vh;
      min-height: 100svh;
      height: auto;
      overflow: hidden;
      padding: 28px;
      box-sizing: border-box;
      background: #f2f3f6;
    }
    .brand-panel {
      position: absolute;
      inset: 0;
      display: block;
      padding: 0;
      background: #f2f3f6;
      pointer-events: none;
    }
    .brand-panel::after { display:none; }
    .brand-content { display:none; }
    .brand-decor { position:absolute;inset:0;overflow:hidden; }
    .brand-decor .circle,.brand-decor .wave { display:none; }
    .brand-decor::before,.brand-decor::after {
      position:absolute;
      width:min(34vw,390px);
      aspect-ratio:1;
      content:'';
      opacity:.8;
      pointer-events:none;
      background:repeating-linear-gradient(135deg,transparent 0 13px,rgba(245,130,10,.22) 13px 18px,transparent 18px 31px);
    }
    .brand-decor::before { top:-20%;right:-8%;clip-path:polygon(30% 0,100% 0,100% 75%,0 100%); }
    .brand-decor::after { bottom:-24%;left:-9%;clip-path:polygon(0 20%,85% 0,100% 100%,0 100%); }
    .brand-copy {
      z-index:1;
      bottom:18px;
      color:#8993a1;
      font-size:10px;
    }
    .form-panel {
      position:relative;
      z-index:2;
      width:min(100%,440px);
      min-height:0;
      padding:0;
      background:transparent;
    }
    .form-wrap {
      width:100%;
      max-width:none;
      box-sizing:border-box;
      padding:30px 34px 32px;
      border:1px solid rgba(220,225,233,.95);
      border-radius:14px;
      background:rgba(255,255,255,.96);
      box-shadow:0 18px 48px rgba(28,39,54,.12),0 2px 6px rgba(28,39,54,.04);
      backdrop-filter:blur(8px);
    }
    .form-wrap::before { height:3px; }
    .form-logo-mobile {
      display:block;
      width:auto;
      height:52px;
      max-width:190px;
      object-fit:contain;
      margin:0 auto 22px;
    }
    .brand-lockup { display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:14px; }
    .brand-lockup .form-logo-mobile { height:46px;margin:0; }
    .pos-tag { position:relative;display:inline-block;padding:0 0 5px;border:0;border-radius:0;background:transparent;color:#34445a;font-size:16px;font-weight:900;letter-spacing:.1em;line-height:1; }
    .pos-tag::after { position:absolute;right:0;bottom:0;left:0;height:2px;border-radius:2px;background:#f5820a;content:''; }
    .form-head { margin-bottom:22px;text-align:center; }
    .product-label { display:flex;align-items:center;justify-content:center;gap:8px;margin:0 auto 14px;color:#42546b;font-size:14px;font-weight:650;letter-spacing:0;line-height:1.2; }
    .product-label::before { width:7px;height:7px;border-radius:50%;background:#f5820a;content:''; }
    .form-head h2 { margin:0 0 7px;font-size:25px; }
    .form-head h2::before { display:none; }
    .form-head p { font-size:12px; }
    .form { gap:15px; }
    .input-wrap { height:47px;border-radius:7px; }
    .btn-login { height:46px;border-radius:7px; }
    .form-copy-mobile { display:none; }

    @media(max-width:600px) {
      .login-page { padding:18px;overflow:auto; }
      .brand-decor::before,.brand-decor::after { width:54vw;opacity:.55; }
      .brand-copy { bottom:7px;font-size:9px; }
      .form-wrap { padding:26px 22px 25px;border-radius:12px; }
      .form-logo-mobile { height:45px;margin-bottom:18px; }
      .form-head h2 { font-size:22px; }
    }
  `],
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  usuario = '';
  password = '';
  idAgencia = -1;
  agencies: AgenciaInfo[] = [];
  loadingAgencies = false;
  submitting = false;
  error = '';
  showPassword = false;
  currentYear = new Date().getFullYear();

  constructor() {
    const savedError = sessionStorage.getItem('pos_login_error');
    if (savedError) {
      this.error = savedError;
      sessionStorage.removeItem('pos_login_error');
    }
  }

  onUsuarioBlur(): void {
    const login = this.usuario.trim();
    if (!login) { this.agencies = []; return; }

    this.loadingAgencies = true;
    this.error = '';
    this.auth.getAgencies(login).subscribe({
      next: list => {
        this.agencies = list;
        this.idAgencia = list.length === 1 ? list[0].id_agencia : -1;
        this.loadingAgencies = false;
      },
      error: () => {
        this.agencies = [];
        this.loadingAgencies = false;
        this.error = 'No se pudo conectar al servidor. Verifique que el servicio esté activo.';
      },
    });
  }

  submit(): void {
    this.error = '';
    if (!this.usuario.trim() || !this.password || this.idAgencia < 0) {
      this.error = 'Complete todos los campos.';
      return;
    }

    this.submitting = true;
    this.auth.login({
      usuario: this.usuario.trim(),
      password: this.password,
      id_agencia: this.idAgencia,
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigate(['/dashboard']);
      },
      error: err => {
        this.submitting = false;
        this.error = err.error?.message ?? 'Error de conexión con el servidor.';
      },
    });
  }
}
