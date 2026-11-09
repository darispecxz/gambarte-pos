export interface LoginRequest {
  usuario: string;
  password: string;
  id_agencia: number;
}

export interface AgenciaInfo {
  id_agencia: number;
  cod_agencia: string;
  descripcion: string;
  abreviatura: string;
}

export interface UserInfo {
  cod_usuario: number;
  login: string;
  nombre: string;
  email: string;
}

export interface RolInfo {
  id_rol: number;
  descripcion: string;
}

export interface AuthSession {
  token: string;
  expires_in: number;
  user: UserInfo;
  agencia: AgenciaInfo;
  rol: RolInfo;
}
