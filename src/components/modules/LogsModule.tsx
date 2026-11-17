import React, { useEffect, useState } from 'react';
import { ArrowRight, ChevronDown, ChevronRight, RotateCcw, Search } from 'lucide-react';
import { ApiError } from '../../api/client';
import { logsApi } from '../../api/recursos';
import { useApp } from '../../context/AppContext';
import {
  AcaoLog,
  AlteracaoLog,
  EntidadeLog,
  FiltroLog,
  LogAtividade,
  Pagina,
  ROTULO_MOTIVO_PRIORIDADE,
  ROTULO_STATUS_ACOMPANHAMENTO,
  ROTULO_STATUS_DEBITO,
  ROTULO_STATUS_DESLIGAMENTO,
  ROTULO_STATUS_PENDENCIA,
  ROTULO_STATUS_PROJETO,
  ROTULO_STATUS_TRIAGEM,
  ROTULO_STATUS_VISTORIA,
  ROTULO_TIPO_DEBITO,
  ROTULO_TIPO_PENDENCIA,
  ROTULO_TIPO_PROJETO,
} from '../../types';
import { formatarData, formatarDataHora } from '../../utils/data';
import { Badge } from '../common/Badge';
import { Card } from '../common/Card';
import { Entrada, Selecao } from '../ui/Campo';
import { Paginacao } from '../ui/Paginacao';
import { Cabecalho, Corpo, Linha, LinhaVazia, Tabela, Td, Th } from '../ui/Tabela';

/**
 * Log de atividades — restrito a ADMINISTRADOR e GESTOR, como Usuários.
 *
 * Tudo que é criado, editado ou excluído entra aqui sozinho: o backend grava a partir dos
 * eventos do Hibernate, então não há tela que "esqueça" de registrar. Mudança de status aparece
 * como edição do campo Status. Linha sem usuário é ação do sistema — as integrações com o Nectar
 * e o Gmail rodam sem ninguém logado.
 *
 * Paginado **no servidor**, ao contrário das outras listagens: o log só cresce, e trazer tudo
 * para filtrar no navegador ficaria mais lento a cada semana.
 */

const TAMANHO_PAGINA = 50;

const ROTULO_ACAO: Record<AcaoLog, string> = {
  CRIACAO: 'Criou',
  EDICAO: 'Editou',
  EXCLUSAO: 'Excluiu',
};

const VARIANTE_ACAO: Record<AcaoLog, 'success' | 'info' | 'danger'> = {
  CRIACAO: 'success',
  EDICAO: 'info',
  EXCLUSAO: 'danger',
};

const ROTULO_ENTIDADE: Record<EntidadeLog, string> = {
  CLIENTE: 'Cliente',
  PENDENCIA: 'Pendência',
  DEBITO: 'Débito',
  PROJETO: 'Projeto',
  VISTORIA: 'Vistoria',
  UNIFICACAO: 'Unificação',
  USUARIO: 'Usuário',
};

/** Nome da propriedade no backend → o que a pessoa lê. O que faltar aparece cru. */
const ROTULO_CAMPO: Record<string, string> = {
  nome: 'Nome',
  cidade: 'Cidade',
  vendedor: 'Vendedor',
  dataPagamento: 'Data do pagamento',
  ucCoelba: 'UC Coelba',
  telefone: 'Telefone',
  nectarOportunidadeId: 'Oportunidade no Nectar',
  statusTriagem: 'Triagem',
  prioridade: 'Prioridade',
  prioridadeMotivo: 'Motivo da prioridade',
  prioridadeObservacao: 'Observação da prioridade',
  prioridadeDefinidaEm: 'Prioridade definida em',
  prioridadeDefinidaPor: 'Prioridade definida por',
  prioridadeDataInstalacao: 'Instalação prevista (prioridade)',
  somentePendencia: 'Só pendência',
  banco: 'Banco',
  cliente: 'Cliente',
  tipo: 'Tipo',
  status: 'Status',
  solicitadoEm: 'Solicitada em',
  resolvidoEm: 'Resolvida em',
  responsavel: 'Responsável',
  observacao: 'Observação',
  numeroSolicitacao: 'Nº da solicitação',
  statusAcompanhamento: 'Acompanhamento',
  ultimaConsultaEm: 'Última consulta',
  detectadoEm: 'Débito detectado em',
  quitadoEm: 'Quitado em',
  proximoVencimento: 'Próximo vencimento',
  consultadoPor: 'Consultado por',
  tipoProjeto: 'Tipo de projeto',
  analistaResponsavel: 'Analista',
  dataRecebimento: 'Recebido em',
  dataArt: 'Data da ART',
  dataEncaminhado: 'Encaminhado em',
  motivoReprova: 'Motivo da reprova',
  dataAprovacao: 'Aprovado em',
  dataInstalacao: 'Instalação',
  potenciaKwp: 'Potência (kWp)',
  projeto: 'Projeto',
  dataSolicitacao: 'Solicitada em',
  dataResultado: 'Resultado em',
  informacoes: 'Informações',
  feita: 'Unificação feita',
  projetista: 'Projetista',
  desligamentoStatus: 'Desligamento',
  desligamentoSolicitadoEm: 'Desligamento solicitado em',
  desligamentoConcluidoEm: 'Desligamento concluído em',
  email: 'E-mail',
  ativo: 'Acesso ativo',
  contaSistema: 'Conta de sistema',
  senha: 'Senha',
};

/**
 * Enums cujo rótulo depende do tipo do registro: `status` de pendência e de projeto são listas
 * diferentes com o mesmo nome de campo.
 */
const ROTULOS_POR_CAMPO: Record<string, Partial<Record<EntidadeLog, Record<string, string>>>> = {
  status: {
    PENDENCIA: ROTULO_STATUS_PENDENCIA,
    PROJETO: ROTULO_STATUS_PROJETO,
    VISTORIA: ROTULO_STATUS_VISTORIA,
    DEBITO: ROTULO_STATUS_DEBITO,
  },
  tipo: {
    PENDENCIA: ROTULO_TIPO_PENDENCIA,
    DEBITO: ROTULO_TIPO_DEBITO,
  },
};

const ROTULOS_FIXOS: Record<string, Record<string, string>> = {
  statusTriagem: ROTULO_STATUS_TRIAGEM,
  tipoProjeto: ROTULO_TIPO_PROJETO,
  statusAcompanhamento: ROTULO_STATUS_ACOMPANHAMENTO,
  prioridadeMotivo: ROTULO_MOTIVO_PRIORIDADE,
  desligamentoStatus: ROTULO_STATUS_DESLIGAMENTO,
};

const DATA_PURA = /^\d{4}-\d{2}-\d{2}$/;
const INSTANTE = /^\d{4}-\d{2}-\d{2}T/;

function rotuloValor(tipo: EntidadeLog, campo: string, valor: string | null): string {
  if (valor === null || valor === '') return '—';
  if (valor === 'true') return 'Sim';
  if (valor === 'false') return 'Não';

  const rotulos = ROTULOS_POR_CAMPO[campo]?.[tipo] ?? ROTULOS_FIXOS[campo];
  if (rotulos?.[valor]) return rotulos[valor];

  if (DATA_PURA.test(valor)) return formatarData(valor);
  if (INSTANTE.test(valor)) return formatarDataHora(valor);
  return valor;
}

const rotuloCampo = (campo: string) => ROTULO_CAMPO[campo] ?? campo;

/** Criação e exclusão trazem todos os campos; abertas por padrão seriam uma parede de texto. */
const LIMITE_RESUMO = 3;

const ListaDeAlteracoes: React.FC<{ log: LogAtividade }> = ({ log }) => {
  const [aberto, setAberto] = useState(false);
  const { acao, alteracoes, entidadeTipo } = log;

  if (alteracoes.length === 0) {
    return <span className="text-texto-apagado">—</span>;
  }

  const recolhivel = acao !== 'EDICAO' && alteracoes.length > LIMITE_RESUMO;
  const visiveis = recolhivel && !aberto ? alteracoes.slice(0, LIMITE_RESUMO) : alteracoes;

  const renderizar = (a: AlteracaoLog) => (
    <li key={a.campo} className="flex flex-wrap items-baseline gap-x-1.5 leading-relaxed">
      <span className="text-texto-suave">{rotuloCampo(a.campo)}:</span>
      {acao === 'EDICAO' ? (
        <>
          <span className="text-texto-apagado line-through decoration-texto-apagado/50">
            {rotuloValor(entidadeTipo, a.campo, a.anterior)}
          </span>
          <ArrowRight className="w-3 h-3 text-texto-apagado self-center" aria-label="para" />
          <span className="text-texto font-medium">
            {rotuloValor(entidadeTipo, a.campo, a.novo)}
          </span>
        </>
      ) : (
        <span className="text-texto">
          {rotuloValor(entidadeTipo, a.campo, acao === 'EXCLUSAO' ? a.anterior : a.novo)}
        </span>
      )}
    </li>
  );

  return (
    <div>
      <ul className="space-y-0.5">{visiveis.map(renderizar)}</ul>
      {recolhivel && (
        <button
          type="button"
          onClick={() => setAberto(v => !v)}
          className="mt-1 inline-flex items-center gap-0.5 text-2xs font-medium text-solar-primary hover:text-solar-primary-hover transition-colors"
        >
          {aberto ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          {aberto ? 'Mostrar menos' : `Ver todos os ${alteracoes.length} campos`}
        </button>
      )}
    </div>
  );
};

const FILTRO_VAZIO: FiltroLog = {};

export const LogsModule: React.FC = () => {
  const { usuarios } = useApp();

  const [filtro, setFiltro] = useState<FiltroLog>(FILTRO_VAZIO);
  const [busca, setBusca] = useState('');
  const [pagina, setPagina] = useState(1);
  const [resultado, setResultado] = useState<Pagina<LogAtividade> | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // A busca por nome espera a digitação parar: sem isso, cada letra seria uma consulta.
  useEffect(() => {
    const espera = setTimeout(() => {
      setFiltro(f => ({ ...f, q: busca.trim() || undefined }));
      setPagina(1);
    }, 350);
    return () => clearTimeout(espera);
  }, [busca]);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    setErro(null);
    logsApi
      .listar(filtro, pagina - 1, TAMANHO_PAGINA)
      .then(r => {
        if (!cancelado) setResultado(r);
      })
      .catch(e => {
        if (!cancelado) {
          setErro(e instanceof ApiError ? e.mensagemAmigavel : 'Não foi possível carregar o log');
        }
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [filtro, pagina]);

  const mudarFiltro = <K extends keyof FiltroLog>(chave: K, valor: FiltroLog[K]) => {
    setFiltro(f => ({ ...f, [chave]: valor }));
    setPagina(1);
  };

  const limpar = () => {
    setBusca('');
    setFiltro(FILTRO_VAZIO);
    setPagina(1);
  };

  const temFiltro = busca !== '' || Object.values(filtro).some(v => v !== undefined && v !== '');
  const logs = resultado?.conteudo ?? [];

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-texto-apagado absolute left-3 top-1/2 -translate-y-1/2" />
            <Entrada
              type="text"
              placeholder="Buscar por cliente ou usuário afetado…"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="pl-9"
              aria-label="Buscar por nome"
            />
          </div>
          <Selecao
            aria-label="Quem fez"
            value={filtro.usuarioId ?? ''}
            onChange={e =>
              mudarFiltro('usuarioId', e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">Todos os usuários</option>
            {usuarios.map(u => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </Selecao>
          <Selecao
            aria-label="Tipo de registro"
            value={filtro.entidadeTipo ?? ''}
            onChange={e =>
              mudarFiltro('entidadeTipo', (e.target.value || undefined) as EntidadeLog | undefined)}
          >
            <option value="">Todos os registros</option>
            {(Object.keys(ROTULO_ENTIDADE) as EntidadeLog[]).map(t => (
              <option key={t} value={t}>
                {ROTULO_ENTIDADE[t]}
              </option>
            ))}
          </Selecao>
          <Selecao
            aria-label="Ação"
            value={filtro.acao ?? ''}
            onChange={e =>
              mudarFiltro('acao', (e.target.value || undefined) as AcaoLog | undefined)}
          >
            <option value="">Todas as ações</option>
            <option value="CRIACAO">Criações</option>
            <option value="EDICAO">Edições</option>
            <option value="EXCLUSAO">Exclusões</option>
          </Selecao>
          <div className="flex gap-2">
            <Entrada
              type="date"
              aria-label="De"
              title="De"
              value={filtro.de ?? ''}
              onChange={e => mudarFiltro('de', e.target.value || undefined)}
            />
            <Entrada
              type="date"
              aria-label="Até"
              title="Até"
              value={filtro.ate ?? ''}
              onChange={e => mudarFiltro('ate', e.target.value || undefined)}
            />
          </div>
        </div>
        {temFiltro && (
          <button
            type="button"
            onClick={limpar}
            className="mt-3 inline-flex items-center gap-1 text-2xs font-medium text-texto-suave hover:text-texto transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Limpar filtros
          </button>
        )}
      </Card>

      {erro && (
        <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-700">
          {erro}
        </div>
      )}

      <Card
        title="Atividades"
        subtitle="Do mais recente para o mais antigo. Horários de Brasília."
      >
        <Tabela>
          <Cabecalho>
            <Th className="pl-6 w-36">Quando</Th>
            <Th className="w-44">Quem</Th>
            <Th className="w-24">Ação</Th>
            <Th className="w-56">Registro</Th>
            <Th className="pr-6">O que mudou</Th>
          </Cabecalho>
          <Corpo>
            {carregando && logs.length === 0 ? (
              <LinhaVazia colunas={5}>Carregando…</LinhaVazia>
            ) : logs.length === 0 ? (
              <LinhaVazia colunas={5}>Nenhuma atividade encontrada.</LinhaVazia>
            ) : (
              logs.map(log => (
                <Linha key={log.id} className={carregando ? 'opacity-60' : undefined}>
                  <Td className="pl-6 align-top whitespace-nowrap tabular-nums text-texto-suave">
                    {formatarDataHora(log.ocorridoEm)}
                  </Td>
                  <Td className="align-top">
                    {log.usuarioId === null ? (
                      <span className="text-texto-apagado italic">Sistema</span>
                    ) : (
                      <span className="font-medium text-texto">
                        {log.usuarioNome ?? `Usuário #${log.usuarioId}`}
                      </span>
                    )}
                  </Td>
                  <Td className="align-top">
                    <Badge variant={VARIANTE_ACAO[log.acao]}>{ROTULO_ACAO[log.acao]}</Badge>
                  </Td>
                  <Td className="align-top">
                    <div className="text-texto-suave text-2xs uppercase tracking-wider">
                      {ROTULO_ENTIDADE[log.entidadeTipo]} #{log.entidadeId}
                    </div>
                    {log.descricao && (
                      <div className="font-medium text-texto mt-0.5">{log.descricao}</div>
                    )}
                  </Td>
                  <Td className="pr-6 align-top">
                    <ListaDeAlteracoes log={log} />
                  </Td>
                </Linha>
              ))
            )}
          </Corpo>
        </Tabela>
        {resultado && resultado.totalElementos > 0 && (
          <Paginacao
            className="mt-6"
            pagina={pagina}
            totalPaginas={Math.max(1, resultado.totalPaginas)}
            exibidos={logs.length}
            total={resultado.totalElementos}
            onMudar={setPagina}
          />
        )}
      </Card>
    </div>
  );
};
