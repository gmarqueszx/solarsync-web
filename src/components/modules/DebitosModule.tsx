import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Eye,
  MapPin,
  Plus,
  Search,
  Timer,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  Cliente,
  Debito,
  PendenciaLista,
  ProjetoLista,
  ROTULO_STATUS_DEBITO,
  ROTULO_TIPO_DEBITO,
  ROTULO_TIPO_DEBITO_CURTO,
  StatusDebito,
  TIPOS_DEBITO,
  TipoDebito,
} from '../../types';
import { formatarDataHora } from '../../utils/data';
import { Badge } from '../common/Badge';
import { Card } from '../common/Card';
import { Modal } from '../common/Modal';
import { AbasSegmentadas } from '../ui/Abas';
import { BadgeTempo } from '../ui/BadgeTempo';
import { Botao } from '../ui/Button';
import { Campo, Entrada, Selecao } from '../ui/Campo';
import { CardKPI } from '../ui/CardKPI';
import { ITENS_POR_PAGINA, Paginacao } from '../ui/Paginacao';
import { Cabecalho, Corpo, Linha, LinhaVazia, Ordenavel, Tabela, Td, Th } from '../ui/Tabela';
import { useOrdenacao } from '../../hooks/useOrdenacao';

/**
 * Consulta de débitos — a tela que o financeiro usa.
 *
 * O débito da Coelba trava duas coisas diferentes, e a pergunta que esta tela responde é
 * "quem está parado, por qual das duas, e há quanto tempo". Por isso a unidade da listagem é o
 * par **cliente + etapa**, não o cliente: o mesmo cliente pode estar quitado para a pendência e
 * devendo para a homologação.
 *
 * ⚠️ **Um débito trava uma etapa só** — ou a resolução da pendência, ou a homologação do
 * projeto, nunca as duas (reforçado pelo usuário em 16/09/2026). É o que o `tipo` diz, e é por
 * isso que toda leitura de débito nas outras telas filtra por ele: `PendenciasModule` só olha
 * `PENDENCIA`, `ProjetosModule` só olha `HOMOLOGACAO`. Uma leitura sem filtro de tipo faria um
 * débito travar as duas etapas de novo, que é exatamente o modelo que este desenho substituiu.
 *
 * `SEM_CONSULTA` é linha de verdade, e não ausência de linha: "ninguém olhou" é diferente de
 * "não deve", e as duas etapas recusam avançar sem a consulta do seu tipo.
 *
 * ⚠️ **A listagem mostra só a etapa em que o cliente está agora** (pedido do usuário em
 * 17/09/2026). Antes eram duas linhas por cliente desde o cadastro, e o financeiro via o dobro
 * de trabalho do que existia: consulta de homologação cobrada de cliente que ainda está
 * resolvendo pendência, e consulta de pendência cobrada de cliente que nem tem pendência. Quem
 * decide a etapa é o fluxo, não esta tela — ver {@link etapasEmAberto}. O detalhe do cliente (o
 * olho na linha) continua mostrando as duas etapas, que é onde a visão completa faz falta.
 */

type Aba = 'PENDENCIA' | 'HOMOLOGACAO' | 'SEM_CONSULTA' | 'TODOS';

/** Acima disto o financeiro entra em ação; alinhado com a rampa do BadgeTempo. */
const DIAS_CRITICO = 15;

interface LinhaDebito {
  chave: string;
  cliente: Cliente;
  tipo: TipoDebito;
  status: StatusDebito | 'SEM_CONSULTA';
  ultimaConsultaEm: string | null;
  diasParado: number | null;
  consultadoPorNome: string | null;
  debito?: Debito;
}

/**
 * Ordem de urgência: ATIVO, depois sem consulta, depois quitado; dentro de cada grupo, o mais
 * parado no topo. É a ordem de abertura da tela — quem quiser outra clica no cabeçalho.
 */
function porUrgencia(l: LinhaDebito): number {
  const grupo = l.status === 'ATIVO' ? 0 : l.status === 'SEM_CONSULTA' ? 1 : 2;
  // Um único número, para caber no comparador genérico: o grupo manda (daí o passo de 1000) e
  // os dias parados desempatam invertidos, para o mais antigo ficar no topo do seu grupo.
  return grupo * 1000 - Math.min(l.diasParado ?? -1, 999);
}

const VALORES_ORDENAVEIS = {
  cliente: (l: LinhaDebito) => l.cliente.nome,
  etapa: (l: LinhaDebito) => ROTULO_TIPO_DEBITO_CURTO[l.tipo],
  situacao: (l: LinhaDebito) => porUrgencia(l),
  parado: (l: LinhaDebito) => l.diasParado,
  consulta: (l: LinhaDebito) => l.ultimaConsultaEm,
  consultadoPor: (l: LinhaDebito) => l.consultadoPorNome,
};

type ColunaDebito = keyof typeof VALORES_ORDENAVEIS;

/**
 * Em que etapas o débito ainda tem o que travar, por cliente. É o que decide quais linhas a
 * listagem mostra.
 *
 * - `PENDENCIA` enquanto houver pendência em curso (`ABERTA`/`EM_ANDAMENTO`): é o débito que
 *   impede a Coelba de executá-la. Cliente que foi direto (`SEM_PENDENCIA`) nunca precisa dessa
 *   consulta, e cliente ainda em triagem não precisa **ainda** — não se sabe se haverá pendência.
 * - `HOMOLOGACAO` a partir do momento em que existe projeto ainda não aprovado: é a consulta que
 *   o projetista faz ao receber o cliente, e o que bloqueia o envio à Coelba. Aprovado o projeto,
 *   o débito não trava mais nada.
 * - **Débito `ATIVO` aparece sempre**, mesmo fora da etapa. Esconder um cliente que está devendo
 *   de fato é o tipo de buraco silencioso que este sistema existe para eliminar; a filtragem
 *   serve para calar linha sem trabalho, não para calar travamento.
 */
function etapasEmAberto(
  pendencias: PendenciaLista[],
  projetos: ProjetoLista[],
  debitos: Debito[],
): Map<number, Set<TipoDebito>> {
  const mapa = new Map<number, Set<TipoDebito>>();
  const marcar = (clienteId: number, tipo: TipoDebito) => {
    const etapas = mapa.get(clienteId) ?? new Set<TipoDebito>();
    etapas.add(tipo);
    mapa.set(clienteId, etapas);
  };

  pendencias.forEach((p) => {
    if (p.status === 'ABERTA' || p.status === 'EM_ANDAMENTO') marcar(p.cliente.id, 'PENDENCIA');
  });
  projetos.forEach((p) => {
    if (p.status !== 'APROVADO') marcar(p.cliente.id, 'HOMOLOGACAO');
  });
  debitos.forEach((d) => {
    if (d.status === 'ATIVO') marcar(d.cliente.id, d.tipo);
  });

  return mapa;
}

export const DebitosModule: React.FC = () => {
  const { debitos, clientes, pendencias, projetos, registrarConsultaDebito } = useApp();

  const [aba, setAba] = useState<Aba>('PENDENCIA');
  const [busca, setBusca] = useState('');
  const [pagina, setPagina] = useState(1);

  // Abre pelos mais urgentes, que é o motivo de a tela existir; qualquer cabeçalho reordena.
  const { ordenacao, ordenar, cabecalho } = useOrdenacao<LinhaDebito, ColunaDebito>(
    VALORES_ORDENAVEIS,
    { campo: 'situacao', direcao: 'asc' },
  );

  const [clienteDetalhe, setClienteDetalhe] = useState<Cliente | null>(null);

  const [isModalNovoAberto, setIsModalNovoAberto] = useState(false);
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState<number | ''>('');
  const [novoTipo, setNovoTipo] = useState<TipoDebito>('HOMOLOGACAO');
  const [novoStatus, setNovoStatus] = useState<StatusDebito>('QUITADO');
  const [salvando, setSalvando] = useState(false);

  /** Índice por `clienteId|tipo` — a mesma chave de negócio que o banco usa. */
  const porClienteETipo = useMemo(
    () => new Map(debitos.map((d) => [`${d.cliente.id}|${d.tipo}`, d])),
    [debitos],
  );

  const etapasPorCliente = useMemo(
    () => etapasEmAberto(pendencias, projetos, debitos),
    [pendencias, projetos, debitos],
  );

  /**
   * As duas combinações de todo cliente. Não é o que a tabela lista — é a base do detalhe do
   * cliente, que precisa mostrar as duas etapas mesmo quando uma delas já passou.
   */
  const linhasDeTodasAsEtapas = useMemo<LinhaDebito[]>(
    () =>
      clientes.flatMap((cliente) =>
        TIPOS_DEBITO.map((tipo) => {
          const debito = porClienteETipo.get(`${cliente.id}|${tipo}`);
          return {
            chave: `${cliente.id}|${tipo}`,
            cliente,
            tipo,
            status: debito?.status ?? 'SEM_CONSULTA',
            ultimaConsultaEm: debito?.ultimaConsultaEm ?? null,
            diasParado: debito?.diasParado ?? null,
            consultadoPorNome: debito?.consultadoPor?.nome ?? null,
            debito,
          };
        }),
      ),
    [clientes, porClienteETipo],
  );

  /** Uma linha por cliente na etapa em que ele está — o universo da listagem e dos KPIs. */
  const todasLinhas = useMemo<LinhaDebito[]>(
    () =>
      linhasDeTodasAsEtapas.filter((l) => etapasPorCliente.get(l.cliente.id)?.has(l.tipo)),
    [linhasDeTodasAsEtapas, etapasPorCliente],
  );

  const travadosNaPendencia = useMemo(
    () => todasLinhas.filter((l) => l.tipo === 'PENDENCIA' && l.status === 'ATIVO'),
    [todasLinhas],
  );
  const travadosNaHomologacao = useMemo(
    () => todasLinhas.filter((l) => l.tipo === 'HOMOLOGACAO' && l.status === 'ATIVO'),
    [todasLinhas],
  );
  const semConsulta = useMemo(
    () => todasLinhas.filter((l) => l.status === 'SEM_CONSULTA'),
    [todasLinhas],
  );
  const paradosDemais = useMemo(
    () => todasLinhas.filter((l) => (l.diasParado ?? 0) > DIAS_CRITICO),
    [todasLinhas],
  );

  const linhasDaAba = useMemo(() => {
    switch (aba) {
      case 'PENDENCIA':
        return travadosNaPendencia;
      case 'HOMOLOGACAO':
        return travadosNaHomologacao;
      case 'SEM_CONSULTA':
        return semConsulta;
      default:
        return todasLinhas;
    }
  }, [aba, travadosNaPendencia, travadosNaHomologacao, semConsulta, todasLinhas]);

  const linhasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const casa = (l: LinhaDebito) =>
      !termo
      || l.cliente.nome.toLowerCase().includes(termo)
      || (l.cliente.cidade ?? '').toLowerCase().includes(termo)
      || (l.cliente.vendedor ?? '').toLowerCase().includes(termo)
      || (l.cliente.ucCoelba ?? '').toLowerCase().includes(termo);

    return ordenar(linhasDaAba.filter(casa));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linhasDaAba, busca, ordenacao]);

  const totalPaginas = Math.max(1, Math.ceil(linhasFiltradas.length / ITENS_POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const linhasPaginadas = useMemo(
    () =>
      linhasFiltradas.slice(
        (paginaAtual - 1) * ITENS_POR_PAGINA,
        paginaAtual * ITENS_POR_PAGINA,
      ),
    [linhasFiltradas, paginaAtual],
  );

  const mudarAba = (nova: Aba) => {
    setAba(nova);
    setPagina(1);
  };

  const abrirModalNovo = (clienteId?: number, tipo?: TipoDebito) => {
    setClienteSelecionadoId(clienteId ?? semConsulta[0]?.cliente.id ?? clientes[0]?.id ?? '');
    setNovoTipo(tipo ?? (aba === 'PENDENCIA' ? 'PENDENCIA' : 'HOMOLOGACAO'));
    setNovoStatus('QUITADO');
    setIsModalNovoAberto(true);
  };

  const handleSalvarConsulta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (clienteSelecionadoId === '') return;
    setSalvando(true);
    try {
      await registrarConsultaDebito(Number(clienteSelecionadoId), novoTipo, novoStatus);
      setIsModalNovoAberto(false);
    } catch {
      // O AppContext já mostrou o toast de erro.
    } finally {
      setSalvando(false);
    }
  };

  /** Baixa direta na linha: consultou de novo e a situação virou. */
  const alternarStatus = (debito: Debito) =>
    registrarConsultaDebito(
      debito.cliente.id,
      debito.tipo,
      debito.status === 'ATIVO' ? 'QUITADO' : 'ATIVO',
    ).catch(() => {});

  // Sai do universo completo, e não da listagem: o detalhe é justamente onde a etapa já vencida
  // ainda interessa ("o débito de pendência dele chegou a travar? quitou quando?").
  const linhasDoDetalhe = useMemo(
    () =>
      clienteDetalhe
        ? linhasDeTodasAsEtapas.filter((l) => l.cliente.id === clienteDetalhe.id)
        : [],
    [clienteDetalhe, linhasDeTodasAsEtapas],
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <CardKPI
          rotulo="Travados na pendência"
          valor={travadosNaPendencia.length}
          legenda="A Coelba não resolve a pendência enquanto houver débito"
          tom={travadosNaPendencia.length > 0 ? 'critico' : 'neutro'}
          icone={<AlertCircle className="w-4 h-4" />}
          onClick={() => mudarAba('PENDENCIA')}
          ativo={aba === 'PENDENCIA'}
        />
        <CardKPI
          rotulo="Travados na homologação"
          valor={travadosNaHomologacao.length}
          legenda="Projeto pronto, envio à Coelba bloqueado"
          tom={travadosNaHomologacao.length > 0 ? 'critico' : 'neutro'}
          icone={<CreditCard className="w-4 h-4" />}
          onClick={() => mudarAba('HOMOLOGACAO')}
          ativo={aba === 'HOMOLOGACAO'}
        />
        <CardKPI
          rotulo="Falta consultar"
          valor={semConsulta.length}
          legenda="Ninguém olhou a agência virtual na etapa em que o cliente está"
          tom={semConsulta.length > 0 ? 'info' : 'neutro'}
          icone={<Search className="w-4 h-4" />}
          onClick={() => mudarAba('SEM_CONSULTA')}
          ativo={aba === 'SEM_CONSULTA'}
        />
        <CardKPI
          rotulo={`Parados há mais de ${DIAS_CRITICO} dias`}
          valor={paradosDemais.length}
          legenda="O corte a partir do qual o financeiro entra em ação"
          tom={paradosDemais.length > 0 ? 'atencao' : 'neutro'}
          icone={<Timer className="w-4 h-4" />}
        />
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <AbasSegmentadas<Aba>
          valor={aba}
          onMudar={mudarAba}
          abas={[
            { valor: 'PENDENCIA', rotulo: 'Travando pendência', contagem: travadosNaPendencia.length },
            { valor: 'HOMOLOGACAO', rotulo: 'Travando homologação', contagem: travadosNaHomologacao.length },
            { valor: 'SEM_CONSULTA', rotulo: 'Falta consultar', contagem: semConsulta.length },
            { valor: 'TODOS', rotulo: 'Todos', contagem: todasLinhas.length },
          ]}
        />

        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 lg:w-72">
            <Search className="w-4 h-4 text-texto-apagado absolute left-3 top-1/2 -translate-y-1/2" />
            <Entrada
              type="text"
              placeholder="Cliente, cidade, UC ou vendedor…"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setPagina(1);
              }}
              className="pl-9"
            />
          </div>
          <Botao variante="primario" onClick={() => abrirModalNovo()} className="shrink-0">
            <Plus className="w-4 h-4" />
            Nova consulta
          </Botao>
        </div>
      </div>

      <Card
        title="Débitos na Coelba"
        subtitle={
          aba === 'SEM_CONSULTA'
            ? 'Consultas que faltam na etapa em que o cliente está agora'
            : `${linhasFiltradas.length} ${linhasFiltradas.length === 1 ? 'registro' : 'registros'} na etapa atual de cada cliente — o olho na linha mostra as duas etapas`
        }
      >
        <Tabela>
          <Cabecalho>
            <Th className="pl-6">
              <Ordenavel {...cabecalho('cliente')}>Cliente</Ordenavel>
            </Th>
            <Th>
              <Ordenavel {...cabecalho('etapa')}>Etapa travada</Ordenavel>
            </Th>
            <Th>
              <Ordenavel {...cabecalho('situacao')}>Situação</Ordenavel>
            </Th>
            <Th>
              <Ordenavel {...cabecalho('parado')}>Parado</Ordenavel>
            </Th>
            <Th>
              <Ordenavel {...cabecalho('consulta')}>Última consulta</Ordenavel>
            </Th>
            <Th>
              <Ordenavel {...cabecalho('consultadoPor')}>Consultado por</Ordenavel>
            </Th>
            <Th alinhamento="direita" className="pr-6">
              Ações
            </Th>
          </Cabecalho>
          <Corpo>
            {linhasPaginadas.length === 0 ? (
              <LinhaVazia colunas={7}>
                {aba === 'SEM_CONSULTA'
                  ? 'Nenhuma consulta pendente na etapa atual dos clientes.'
                  : 'Nenhum cliente travado por débito nesta etapa.'}
              </LinhaVazia>
            ) : (
              linhasPaginadas.map((l) => (
                <Linha key={l.chave}>
                  <Td className="pl-6">
                    <div className="font-medium text-texto">{l.cliente.nome}</div>
                    <div className="text-2xs text-texto-suave flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-texto-apagado" />
                        {l.cliente.cidade ?? '—'}
                      </span>
                      {l.cliente.ucCoelba && (
                        <span className="text-texto-apagado">UC {l.cliente.ucCoelba}</span>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <Badge variant={l.tipo === 'PENDENCIA' ? 'info' : 'neutral'} dot={false}>
                      {ROTULO_TIPO_DEBITO_CURTO[l.tipo]}
                    </Badge>
                  </Td>
                  <Td>
                    {l.status === 'SEM_CONSULTA' ? (
                      <Badge variant="warning">Falta consultar</Badge>
                    ) : l.status === 'ATIVO' ? (
                      <Badge variant="danger">Débito {ROTULO_STATUS_DEBITO.ATIVO}</Badge>
                    ) : (
                      <Badge variant="success">{ROTULO_STATUS_DEBITO.QUITADO}</Badge>
                    )}
                  </Td>
                  <Td>
                    <BadgeTempo dias={l.diasParado} />
                  </Td>
                  <Td className="text-texto-suave">{formatarDataHora(l.ultimaConsultaEm)}</Td>
                  <Td className="text-texto-suave">{l.consultadoPorNome ?? '—'}</Td>
                  <Td alinhamento="direita" className="pr-6">
                    <div className="flex items-center justify-end gap-2">
                      {l.debito ? (
                        <Botao
                          tamanho="sm"
                          variante={l.debito.status === 'ATIVO' ? 'primario' : 'contorno'}
                          onClick={() => alternarStatus(l.debito!)}
                          title="Registra uma nova consulta com a situação invertida"
                        >
                          {l.debito.status === 'ATIVO' ? 'Dar baixa' : 'Reabrir'}
                        </Botao>
                      ) : (
                        <Botao
                          tamanho="sm"
                          variante="primario"
                          onClick={() => abrirModalNovo(l.cliente.id, l.tipo)}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Registrar
                        </Botao>
                      )}
                      <Botao
                        tamanho="icone"
                        variante="fantasma"
                        onClick={() => setClienteDetalhe(l.cliente)}
                        title="Ver as duas etapas deste cliente"
                      >
                        <Eye className="w-4 h-4" />
                      </Botao>
                    </div>
                  </Td>
                </Linha>
              ))
            )}
          </Corpo>
        </Tabela>

        <Paginacao
          pagina={paginaAtual}
          totalPaginas={totalPaginas}
          exibidos={linhasPaginadas.length}
          total={linhasFiltradas.length}
          onMudar={setPagina}
        />
      </Card>

      {/* Registrar consulta */}
      <Modal
        isOpen={isModalNovoAberto}
        onClose={() => setIsModalNovoAberto(false)}
        title="Registrar consulta de débito"
        subtitle="Resultado da verificação na Agência Virtual Neoenergia Coelba"
        maxWidth="md"
        footer={
          <>
            <Botao variante="fantasma" onClick={() => setIsModalNovoAberto(false)}>
              Cancelar
            </Botao>
            <Botao
              variante="primario"
              type="submit"
              form="form-consulta-debito"
              disabled={salvando || clienteSelecionadoId === ''}
            >
              {salvando ? 'Salvando…' : 'Confirmar consulta'}
            </Botao>
          </>
        }
      >
        <form id="form-consulta-debito" onSubmit={handleSalvarConsulta} className="space-y-4">
          <Campo rotulo="Cliente consultado" obrigatorio htmlFor="consulta-cliente">
            <Selecao
              id="consulta-cliente"
              value={clienteSelecionadoId}
              onChange={(e) =>
                setClienteSelecionadoId(e.target.value === '' ? '' : Number(e.target.value))
              }
              required
            >
              <option value="">Selecione um cliente…</option>
              {clientes.map((c) => {
                // Só marca com ★ o que falta na etapa atual do cliente. Registrar a consulta da
                // outra etapa continua permitido (o projetista pode adiantar), mas cobrá-la aqui
                // seria inventar trabalho que o fluxo ainda não pediu.
                const faltam = TIPOS_DEBITO.filter(
                  (t) => etapasPorCliente.get(c.id)?.has(t) && !porClienteETipo.has(`${c.id}|${t}`),
                );
                return (
                  <option key={c.id} value={c.id}>
                    {c.nome} — {c.cidade ?? 'sem cidade'}
                    {c.ucCoelba ? ` · UC ${c.ucCoelba}` : ''}
                    {faltam.length > 0
                      ? ` ★ falta consultar: ${faltam.map((t) => ROTULO_TIPO_DEBITO_CURTO[t]).join(' e ')}`
                      : ''}
                  </option>
                );
              })}
            </Selecao>
          </Campo>

          <Campo
            rotulo="Que etapa este débito trava"
            obrigatorio
            ajuda="A consulta de uma etapa não vale pela outra: resolver a pendência exige a consulta de pendência, e encaminhar o projeto exige a de homologação."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {TIPOS_DEBITO.map((tipo) => {
                const ativo = novoTipo === tipo;
                return (
                  <label
                    key={tipo}
                    className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                      ativo
                        ? 'border-solar-primary bg-emerald-50'
                        : 'border-borda hover:border-borda-forte'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-texto">
                        {ROTULO_TIPO_DEBITO[tipo]}
                      </span>
                      <input
                        type="radio"
                        name="tipoDebito"
                        checked={ativo}
                        onChange={() => setNovoTipo(tipo)}
                        className="accent-solar-primary"
                      />
                    </div>
                    <p className="mt-1 text-2xs text-texto-suave">
                      {tipo === 'PENDENCIA'
                        ? 'Impede a Coelba de executar a troca de titularidade, a ligação nova e afins.'
                        : 'Impede o envio do projeto. É o que o projetista consulta ao receber o cliente.'}
                    </p>
                  </label>
                );
              })}
            </div>
          </Campo>

          <Campo rotulo="Situação encontrada" obrigatorio>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label
                className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                  novoStatus === 'QUITADO'
                    ? 'border-solar-primary bg-emerald-50'
                    : 'border-borda hover:border-borda-forte'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-solar-primary" />
                    Quitado / em dia
                  </span>
                  <input
                    type="radio"
                    name="statusDebito"
                    checked={novoStatus === 'QUITADO'}
                    onChange={() => setNovoStatus('QUITADO')}
                    className="accent-solar-primary"
                  />
                </div>
                <p className="mt-1 text-2xs text-texto-suave">
                  Sem faturas em aberto. Libera a etapa.
                </p>
              </label>

              <label
                className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                  novoStatus === 'ATIVO'
                    ? 'border-rose-500 bg-rose-50'
                    : 'border-borda hover:border-borda-forte'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    Débito ativo
                  </span>
                  <input
                    type="radio"
                    name="statusDebito"
                    checked={novoStatus === 'ATIVO'}
                    onChange={() => setNovoStatus('ATIVO')}
                    className="accent-rose-600"
                  />
                </div>
                <p className="mt-1 text-2xs text-texto-suave">
                  Faturas em aberto. Começa a contar o tempo parado.
                </p>
              </label>
            </div>
          </Campo>
        </form>
      </Modal>

      {/* Detalhe: as duas etapas do cliente lado a lado */}
      {clienteDetalhe && (
        <Modal
          isOpen
          onClose={() => setClienteDetalhe(null)}
          title={clienteDetalhe.nome}
          subtitle="Situação nas duas etapas em que o débito pode travar o cliente"
          footer={
            <Botao variante="fantasma" onClick={() => setClienteDetalhe(null)}>
              Fechar
            </Botao>
          }
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-superficie-sutil border border-borda text-xs">
              <div className="text-texto-suave">
                Cidade: <span className="text-texto font-medium">{clienteDetalhe.cidade ?? '—'}</span>
              </div>
              <div className="text-texto-suave">
                UC Coelba:{' '}
                <span className="text-texto font-medium">{clienteDetalhe.ucCoelba ?? '—'}</span>
              </div>
            </div>

            {linhasDoDetalhe.map((l) => (
              <div key={l.chave} className="p-3 rounded-xl border border-borda space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-texto">
                    {ROTULO_TIPO_DEBITO[l.tipo]}
                  </span>
                  {l.status === 'SEM_CONSULTA' ? (
                    <Badge variant="warning">Falta consultar</Badge>
                  ) : l.status === 'ATIVO' ? (
                    <Badge variant="danger">Débito ativo</Badge>
                  ) : (
                    <Badge variant="success">Quitado</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-2xs text-texto-suave">
                  <BadgeTempo dias={l.diasParado} />
                  <span>Consulta: {formatarDataHora(l.ultimaConsultaEm)}</span>
                  {l.consultadoPorNome && <span>por {l.consultadoPorNome}</span>}
                </div>
                <div className="flex justify-end">
                  {l.debito ? (
                    <Botao
                      tamanho="sm"
                      variante={l.debito.status === 'ATIVO' ? 'primario' : 'contorno'}
                      onClick={() => alternarStatus(l.debito!)}
                    >
                      {l.debito.status === 'ATIVO' ? 'Confirmar quitação' : 'Reabrir débito'}
                    </Botao>
                  ) : (
                    <Botao
                      tamanho="sm"
                      variante="primario"
                      onClick={() => {
                        setClienteDetalhe(null);
                        abrirModalNovo(l.cliente.id, l.tipo);
                      }}
                    >
                      Registrar consulta
                    </Botao>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
};
