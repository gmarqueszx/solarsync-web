import { Debito, TipoDebito } from '../types';

/**
 * Por que o envio de um projeto à Coelba vai ser recusado, se for.
 *
 * **A regra de verdade é do backend** (`ProjetoService.exigirClienteSemDebito`), e é lá que ela
 * tem de ficar: a guarda precisa valer também quando a origem não é a tela — a importação da
 * planilha, a leitura do e-mail, uma integração futura. O que existe aqui é a mesma leitura
 * feita **antes do clique**, para a analista não descobrir o motivo só depois de tentar enviar.
 *
 * O que este arquivo garante é que essa antecipação exista **num lugar só**. Antes ela vivia
 * dentro do `ProjetosModule`, e a terceira condição (próximo débito a vencer) teria nascido
 * copiada para a tela de Débitos e para a de Vistoria assim que alguém precisasse dela ali.
 */
export type MotivoBloqueioEnvio = 'SEM_CONSULTA' | 'DEBITO_ATIVO' | 'PROXIMO_DEBITO';

export interface BloqueioEnvio {
  motivo: MotivoBloqueioEnvio;
  /** Preenchida só em `PROXIMO_DEBITO`: é o que a mensagem precisa dizer para ser acionável. */
  vencimento?: string;
}

/**
 * De quantos dias de folga o envio precisa. Espelha a constante de mesmo nome no
 * `DebitoService`: um dia ou menos entre hoje e o vencimento recusa o envio.
 */
const DIAS_DE_FOLGA = 1;

/**
 * Quantos dias faltam para uma data `YYYY-MM-DD`, contados em dias de calendário locais.
 *
 * ⚠️ Comparação de **data**, não de instante, e feita sobre os números da string em vez de
 * `new Date('2026-09-23')` — esse construtor lê a data pura como meia-noite **UTC**, que em
 * `America/Sao_Paulo` é o dia anterior às 21h. Seria um erro de um dia exatamente na faixa em que
 * a resposta muda de "pode enviar" para "não pode", e que só apareceria à noite. É a mesma
 * armadilha que `utils/data.ts` documenta para a formatação.
 */
export function diasAte(dataIso: string): number {
  const [ano, mes, dia] = dataIso.split('-').map(Number);
  const alvo = new Date(ano, mes - 1, dia);
  const agora = new Date();
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  return Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000);
}

/**
 * Monta, a partir da lista de débitos que o `AppContext` já carrega, a função que responde por
 * cliente. Devolve `null` quando o envio está liberado.
 *
 * A ordem das três recusas é a mesma do servidor, e importa: sem consulta ninguém sabe de nada,
 * então perguntar pelo vencimento antes disso seria ler um campo que não foi preenchido.
 */
export function bloqueioDoEnvio(
  debitos: Debito[],
  tipo: TipoDebito = 'HOMOLOGACAO',
): (clienteId: number) => BloqueioEnvio | null {
  const porCliente = new Map(
    debitos.filter((d) => d.tipo === tipo).map((d) => [d.cliente.id, d]),
  );

  return (clienteId: number) => {
    const debito = porCliente.get(clienteId);
    if (!debito) return { motivo: 'SEM_CONSULTA' };
    if (debito.status === 'ATIVO') return { motivo: 'DEBITO_ATIVO' };
    if (debito.proximoVencimento && diasAte(debito.proximoVencimento) <= DIAS_DE_FOLGA) {
      return { motivo: 'PROXIMO_DEBITO', vencimento: debito.proximoVencimento };
    }
    return null;
  };
}
