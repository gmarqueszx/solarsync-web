/**
 * Cliente HTTP da API do SolarSync.
 *
 * Duas responsabilidades que valem estar num lugar só: anexar o token em toda requisição e
 * renovar o access token quando ele expira (15 minutos), sem o usuário perceber. Sem a
 * renovação automática, o analista seria deslogado no meio do trabalho quatro vezes por hora.
 */

/**
 * Vazio em produção porque a API é servida no MESMO domínio que esta tela: o proxy reverso
 * entrega os estáticos e manda `/api/*` para o backend. Requisição de mesma origem não tem CORS,
 * não tem preflight e não tem uma lista de origens no servidor para alguém errar.
 *
 * Em desenvolvimento o Vite serve na 5173 e o backend na 8080 — origens diferentes de verdade —,
 * daí o endereço explícito. `VITE_API_URL` continua existindo para apontar para outro servidor
 * quando for preciso, e segue sendo lida NO BUILD, não em tempo de execução.
 */
const BASE_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:8080' : '');

const CHAVE_ACCESS = 'solarsync.accessToken';
const CHAVE_REFRESH = 'solarsync.refreshToken';

/**
 * Tokens no localStorage para a sessão sobreviver ao F5 — sem isso o usuário reloga a cada
 * recarga de página. O risco é XSS; ele é mitigado pelo access token de 15 minutos e pela
 * possibilidade de desativar o usuário no servidor, que corta a renovação na hora.
 */
export const armazenamentoDeToken = {
  access: () => localStorage.getItem(CHAVE_ACCESS),
  refresh: () => localStorage.getItem(CHAVE_REFRESH),
  guardar(accessToken: string, refreshToken: string) {
    localStorage.setItem(CHAVE_ACCESS, accessToken);
    localStorage.setItem(CHAVE_REFRESH, refreshToken);
  },
  limpar() {
    localStorage.removeItem(CHAVE_ACCESS);
    localStorage.removeItem(CHAVE_REFRESH);
  },
};

/** Corpo de erro da API: ProblemDetail (RFC 9457) com a propriedade `codigo`. */
export interface ProblemDetail {
  status: number;
  title?: string;
  detail?: string;
  codigo?: string;
  erros?: Array<{ campo: string; mensagem: string }>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly codigo: string;
  readonly erros: Array<{ campo: string; mensagem: string }>;
  /**
   * Segundos do cabeçalho `Retry-After`, quando a API mandou um. Hoje só o 429 do login manda,
   * e é o que permite à tela contar o tempo em vez de mandar o usuário "tentar mais tarde" e
   * deixá-lo adivinhar quanto é mais tarde.
   */
  readonly esperarSegundos: number | null;

  constructor(problema: ProblemDetail, retryAfter?: string | null) {
    super(problema.detail || problema.title || 'Erro na requisição');
    this.name = 'ApiError';
    this.status = problema.status;
    this.codigo = problema.codigo ?? 'DESCONHECIDO';
    this.erros = problema.erros ?? [];
    const segundos = Number(retryAfter);
    this.esperarSegundos = Number.isFinite(segundos) && segundos > 0 ? segundos : null;
  }

  /** Mensagem pronta para o usuário, com os campos inválidos quando houver. */
  get mensagemAmigavel(): string {
    if (this.erros.length > 0) {
      return this.erros.map((e) => `${e.campo}: ${e.mensagem}`).join('; ');
    }
    return this.message;
  }
}

/** Chamado quando a sessão acaba de vez — a aplicação volta para a tela de login. */
let aoPerderSessao: () => void = () => {};

export function registrarPerdaDeSessao(callback: () => void) {
  aoPerderSessao = callback;
}

/**
 * Renovação em voo compartilhada: se cinco requisições tomarem 401 ao mesmo tempo, só uma
 * chama /auth/refresh e as outras esperam por ela. Sem isso, o refresh token seria rotacionado
 * várias vezes em paralelo e as chamadas concorrentes falhariam.
 */
let renovacaoEmAndamento: Promise<boolean> | null = null;

async function renovarToken(): Promise<boolean> {
  const refreshToken = armazenamentoDeToken.refresh();
  if (!refreshToken) return false;

  if (!renovacaoEmAndamento) {
    renovacaoEmAndamento = (async () => {
      try {
        const resposta = await fetch(`${BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!resposta.ok) return false;
        const dados = await resposta.json();
        armazenamentoDeToken.guardar(dados.accessToken, dados.refreshToken);
        return true;
      } catch {
        return false;
      } finally {
        renovacaoEmAndamento = null;
      }
    })();
  }
  return renovacaoEmAndamento;
}

interface Opcoes {
  metodo?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  corpo?: unknown;
  parametros?: Record<string, string | number | boolean | undefined | null>;
  /** Interno: evita laço infinito de renovação. */
  jaRenovou?: boolean;
  /** Login e refresh não levam token nem disparam renovação. */
  publico?: boolean;
}

function montarUrl(caminho: string, parametros?: Opcoes['parametros']): string {
  // A origem da página como base: é o que faz `BASE_URL` vazio virar caminho relativo em vez de
  // estourar ("Invalid URL"). Com BASE_URL absoluto, ele ganha da base e nada muda.
  const url = new URL(`${BASE_URL}${caminho}`, window.location.origin);
  Object.entries(parametros ?? {}).forEach(([chave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') {
      url.searchParams.append(chave, String(valor));
    }
  });
  return url.toString();
}

export async function requisitar<T>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  const { metodo = 'GET', corpo, parametros, jaRenovou = false, publico = false } = opcoes;

  const cabecalhos: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = armazenamentoDeToken.access();
  if (!publico && token) {
    cabecalhos.Authorization = `Bearer ${token}`;
  }

  // O fetch lança TypeError quando não alcança o servidor — API desligada, rede caída, CORS
  // barrado. Sem este catch, a falha de transporte chega às telas como um erro genérico
  // indistinguível de uma recusa da API, e a de login dizia "não foi possível entrar" para um
  // backend simplesmente desligado. Vira um ApiError com código próprio para toda tela poder
  // dizer a verdade.
  let resposta: Response;
  try {
    resposta = await fetch(montarUrl(caminho, parametros), {
      method: metodo,
      headers: cabecalhos,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
  } catch {
    throw new ApiError({
      status: 0,
      detail: 'Não foi possível falar com o servidor. Verifique se a API está no ar.',
      codigo: 'SEM_CONEXAO',
    });
  }

  if (resposta.status === 401 && !publico && !jaRenovou) {
    if (await renovarToken()) {
      return requisitar<T>(caminho, { ...opcoes, jaRenovou: true });
    }
    armazenamentoDeToken.limpar();
    aoPerderSessao();
    throw new ApiError({ status: 401, detail: 'Sessão expirada', codigo: 'SESSAO_EXPIRADA' });
  }

  if (resposta.status === 204) {
    return undefined as T;
  }

  const texto = await resposta.text();
  const dados = texto ? JSON.parse(texto) : null;

  if (!resposta.ok) {
    throw new ApiError(
      { status: resposta.status, ...(dados ?? {}) },
      resposta.headers.get('Retry-After'),
    );
  }
  return dados as T;
}

export const api = {
  get: <T>(caminho: string, parametros?: Opcoes['parametros']) =>
    requisitar<T>(caminho, { parametros }),
  post: <T>(caminho: string, corpo?: unknown, parametros?: Opcoes['parametros']) =>
    requisitar<T>(caminho, { metodo: 'POST', corpo, parametros }),
  put: <T>(caminho: string, corpo?: unknown) =>
    requisitar<T>(caminho, { metodo: 'PUT', corpo }),
  remover: <T>(caminho: string) => requisitar<T>(caminho, { metodo: 'DELETE' }),
  publico: <T>(caminho: string, corpo: unknown) =>
    requisitar<T>(caminho, { metodo: 'POST', corpo, publico: true }),
};
