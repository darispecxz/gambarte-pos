import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, map, shareReplay, tap, finalize } from 'rxjs';
import { environment } from '../../environments/environment';
import { Envelope } from './models';
import { AgenciaInfo, AuthSession, LoginRequest, UserInfo, RolInfo } from './auth.models';

const TOKEN_KEY = 'pos_token';
const SESSION_KEY = 'pos_session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private base = environment.apiBase;

  private sessionSubject = new BehaviorSubject<AuthSession | null>(this.loadSession());
  private refreshInFlight: Observable<AuthSession> | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  session$ = this.sessionSubject.asObservable();

  constructor() {
    if (this.session?.refresh_token) this.scheduleRefresh();
  }

  get session(): AuthSession | null { return this.sessionSubject.value; }
  get token(): string | null { return this.session?.token ?? null; }
  get isLoggedIn(): boolean { return !!this.token || !!this.session?.refresh_token; }
  get user(): UserInfo | null { return this.session?.user ?? null; }
  get agencia(): AgenciaInfo | null { return this.session?.agencia ?? null; }
  get rol(): RolInfo | null { return this.session?.rol ?? null; }

  getAgencies(usuario: string): Observable<AgenciaInfo[]> {
    return this.http
      .get<Envelope<AgenciaInfo[]>>(`${this.base}/auth/agencies`, { params: { usuario } })
      .pipe(map(r => r.success ? r.data : []));
  }

  login(req: LoginRequest): Observable<AuthSession> {
    return this.http
      .post<Envelope<AuthSession>>(`${this.base}/auth/login`, req)
      .pipe(
        map(r => {
          if (!r.success) throw new Error(r.message ?? 'Error de autenticación');
          return r.data;
        }),
        tap(session => this.saveSession(session)),
      );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SESSION_KEY);
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.sessionSubject.next(null);
    this.router.navigate(['/login']);
  }

  refreshSession(): Observable<AuthSession> {
    if (this.refreshInFlight) return this.refreshInFlight;
    const refreshToken = this.session?.refresh_token;
    if (!refreshToken) throw new Error('No hay token de renovación');

    this.refreshInFlight = this.http
      .post<Envelope<AuthSession>>(`${this.base}/auth/refresh`, { refresh_token: refreshToken })
      .pipe(
        map(r => {
          if (!r.success || !r.data) throw new Error(r.message ?? 'No se pudo renovar la sesión');
          return r.data;
        }),
        tap(session => this.saveSession(session)),
        finalize(() => this.refreshInFlight = null),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    return this.refreshInFlight;
  }

  private saveSession(session: AuthSession): void {
    localStorage.setItem(TOKEN_KEY, session.token);
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    this.sessionSubject.next(session);
    this.scheduleRefresh();
  }

  private scheduleRefresh(): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    const token = this.session?.token;
    if (!token || !this.session?.refresh_token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const delay = Math.max(1000, payload.exp * 1000 - Date.now() - 120_000);
      this.refreshTimer = setTimeout(() => {
        this.refreshSession().subscribe({ error: () => {} });
      }, delay);
    } catch {
      this.logout();
    }
  }

  private loadSession(): AuthSession | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session: AuthSession = JSON.parse(raw);
      if (!session.token) return null;
      return session;
    } catch {
      return null;
    }
  }
}
