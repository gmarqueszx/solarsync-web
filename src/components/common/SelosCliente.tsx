import React from 'react';
import {
  Cliente,
  EtiquetaCliente,
  MotivoPrioridade,
  ROTULO_MOTIVO_PRIORIDADE,
} from '../../types';
import { formatarData } from '../../utils/data';
import { ArrowUp, Building2, Download, ListChecks } from 'lucide-react';

/**
 * Os selos que acompanham o nome do cliente em todas as telas.
 *
 * Ficam num arquivo só porque aparecem em seis módulos, e porque a regra de "quando mostrar" é
 * parte do significado: um selo em toda linha vira ruído e deixa de ser informação. Cada um
 * abaixo só aparece quando diz algo que muda o trabalho de quem olha.
 *
 * As **etiquetas** (`CRM`, `Banco`) vêm prontas do backend, derivadas da origem e da flag de
 * banco — a tela não as monta. É o que garante, por construção, que rodar a importação de novo
 * não duplique nenhuma.
 */

const BASE = 'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] '
  + 'font-medium shrink-0 whitespace-nowrap';

const ESTILO_ETIQUETA: Record<EtiquetaCliente, string> = {
  CRM: 'bg-[#149911]/10 text-[#256D1B] dark:bg-[#1EFC1E]/10 dark:text-[#1EFC1E]',
  // Índigo, e não outro tom de verde: "Banco" não é um grau de "CRM", é outra coisa — e as duas
  // costumam aparecer lado a lado na mesma linha.
  BANCO: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
};

const ICONE_ETIQUETA: Record<EtiquetaCliente, React.ElementType> = {
  CRM: Download,
  BANCO: Building2,
};

const TITULO_ETIQUETA: Record<EtiquetaCliente, string> = {
  CRM:
    'Importado do Nectar. Cidade e vendedor em branco significam que o CRM não tinha o dado no '
    + 'padrão do cadastro.',
  BANCO:
    'Projeto pago por financiamento bancário. O fluxo aqui é igual ao normal; o que muda é a '
    + 'etapa para onde ele volta no Nectar quando for aprovado.',
};

export const EtiquetasCliente: React.FC<{ cliente: Cliente }> = ({ cliente }) => {
  const etiquetas = cliente.etiquetas ?? [];
  if (etiquetas.length === 0) return null;

  return (
    <>
      {etiquetas.map((etiqueta) => {
        const Icone = ICONE_ETIQUETA[etiqueta];
        return (
          <span
            key={etiqueta}
            title={TITULO_ETIQUETA[etiqueta]}
            className={`${BASE} ${ESTILO_ETIQUETA[etiqueta]}`}
          >
            <Icone className="w-2.5 h-2.5" />
            {etiqueta === 'CRM' ? 'CRM' : 'Banco'}
          </span>
        );
      })}
    </>
  );
};

/**
 * O selo de prioridade. Âmbar e com seta para cima: a leitura precisa ser "este subiu na fila",
 * não "este tem um problema" — que é o que a paleta de erro diria.
 *
 * O motivo vai no `title` porque é o que decide se a prioridade ainda vale, e quem revisa a fila
 * precisa dele sem abrir o cadastro.
 */
export const SeloPrioridade: React.FC<{
  prioridade: boolean;
  motivo?: MotivoPrioridade | null;
  observacao?: string | null;
  dataInstalacao?: string | null;
}> = ({ prioridade, motivo, observacao, dataInstalacao }) => {
  if (!prioridade) return null;

  const partes = [
    motivo ? ROTULO_MOTIVO_PRIORIDADE[motivo] : 'Prioridade',
    dataInstalacao ? `Instalado em ${formatarData(dataInstalacao)}` : null,
    observacao || null,
  ].filter(Boolean);

  return (
    <span
      title={partes.join(' — ')}
      className={`${BASE} bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300`}
    >
      <ArrowUp className="w-2.5 h-2.5" />
      Prioridade
    </span>
  );
};

/**
 * Cliente avulso, mandado ao setor só para resolver uma pendência. Precisa de selo porque muda o
 * que se espera da linha: ninguém deve procurar o projeto dele, e o fluxo acaba quando a
 * pendência fecha.
 */
export const SeloSomentePendencia: React.FC<{ somentePendencia: boolean }> = ({
  somentePendencia,
}) => {
  if (!somentePendencia) return null;

  return (
    <span
      title={
        'Cliente avulso: o fluxo dele é entrada → pendência → resolvida → fim. Nenhum projeto é '
        + 'criado quando a pendência for resolvida. Desmarque no cadastro para devolvê-lo ao '
        + 'fluxo completo.'
      }
      className={`${BASE} bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300`}
    >
      <ListChecks className="w-2.5 h-2.5" />
      Só pendência
    </span>
  );
};

/** Os três juntos, na ordem em que importam para quem varre uma lista. */
export const SelosCliente: React.FC<{ cliente: Cliente }> = ({ cliente }) => (
  <>
    <SeloPrioridade
      prioridade={cliente.prioridade}
      motivo={cliente.prioridadeMotivo}
      observacao={cliente.prioridadeObservacao}
      dataInstalacao={cliente.prioridadeDataInstalacao}
    />
    <SeloSomentePendencia somentePendencia={cliente.somentePendencia} />
    <EtiquetasCliente cliente={cliente} />
  </>
);
