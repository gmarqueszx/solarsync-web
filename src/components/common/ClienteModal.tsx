import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Cliente, DadosCliente } from '../../types';
import { Modal } from './Modal';
import { AlertCircle, UserCheck } from 'lucide-react';

interface ClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Nulo = criação de novo cliente; Preenchido = edição do cliente selecionado */
  clienteEmEdicao?: Cliente | null;
  /** Callback opcional após sucesso */
  onSucesso?: (clienteAtualizadoOuCriado?: Cliente) => void;
}

const FORMULARIO_VAZIO: DadosCliente = {
  nome: '',
  cidade: null,
  vendedor: null,
  dataPagamento: null,
  ucCoelba: null,
  telefone: null,
  somentePendencia: false,
  banco: false,
};

/**
 * Durante a digitação guarda o texto como está; o `trim` fica para o envio (`aparar`). Aparar a
 * cada tecla comia o espaço no instante em que era digitado — não dava para escrever "Vitória da
 * Conquista" nem "(71) 9…", porque o espaço do fim sumia antes da letra seguinte.
 */
const ouNulo = (v: string): string | null => (v.trim() === '' ? null : v);

const aparar = (v: string | null): string | null => {
  const t = v?.trim() ?? '';
  return t === '' ? null : t;
};

const paraEnvio = (f: DadosCliente): DadosCliente => ({
  ...f,
  nome: f.nome.trim(),
  cidade: aparar(f.cidade),
  vendedor: aparar(f.vendedor),
  ucCoelba: aparar(f.ucCoelba),
  telefone: aparar(f.telefone),
});

export const ClienteModal: React.FC<ClienteModalProps> = ({
  isOpen,
  onClose,
  clienteEmEdicao,
  onSucesso,
}) => {
  /**
   * As listas vêm do backend (`GET /api/referencias`), não mais de `src/data/constantes.ts`: é a
   * mesma lista que a importação do Nectar usa para normalizar cidade e vendedor, e duas cópias
   * divergiriam.
   */
  const { criarCliente, atualizarCliente, referencias } = useApp();
  const { municipios, vendedores } = referencias;
  const [formulario, setFormulario] = useState<DadosCliente>(FORMULARIO_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [modoOutroVendedor, setModoOutroVendedor] = useState(false);
  const [outroVendedorTexto, setOutroVendedorTexto] = useState('');

  // Inicializa o formulário quando o modal abre ou clienteEmEdicao muda
  useEffect(() => {
    if (!isOpen) return;

    if (clienteEmEdicao) {
      // `origem` e `nectarOportunidadeId` ficam de fora: são a procedência do registro, não
      // campos editáveis — o PUT não os aceita.
      // Só os campos do cadastro. Tudo o mais que o cliente carrega — triagem, procedência,
      // etiquetas, prioridade — é estado do fluxo e muda por endpoint de ação, não por este
      // formulário: corrigir um telefone não pode, de passagem, apagar uma prioridade nem o fato
      // de a Coelba já ter sido consultada.
      setFormulario({
        nome: clienteEmEdicao.nome,
        cidade: clienteEmEdicao.cidade,
        vendedor: clienteEmEdicao.vendedor,
        dataPagamento: clienteEmEdicao.dataPagamento,
        ucCoelba: clienteEmEdicao.ucCoelba,
        telefone: clienteEmEdicao.telefone,
        somentePendencia: clienteEmEdicao.somentePendencia,
        banco: clienteEmEdicao.banco,
      });
      const dados = clienteEmEdicao;

      // Checa se vendedor atual pertence à lista pré-definida
      if (dados.vendedor && !vendedores.includes(dados.vendedor)) {
        setModoOutroVendedor(true);
        setOutroVendedorTexto(dados.vendedor);
      } else {
        setModoOutroVendedor(false);
        setOutroVendedorTexto('');
      }
    } else {
      setFormulario(FORMULARIO_VAZIO);
      setModoOutroVendedor(false);
      setOutroVendedorTexto('');
    }
    // `vendedores` entra porque a lista chega do servidor: sem ela, o modal aberto antes da
    // carga trataria todo vendedor como "fora da lista".
  }, [isOpen, clienteEmEdicao, vendedores]);

  const cidadeDigitada = (formulario.cidade ?? '').trim();
  const cidadeEhValidaBA =
    cidadeDigitada === '' ||
    municipios.some((m) => m.toLowerCase() === cidadeDigitada.toLowerCase());

  const handleVendedorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const valor = e.target.value;
    if (valor === '__OUTRO__') {
      setModoOutroVendedor(true);
      setFormulario((f) => ({ ...f, vendedor: ouNulo(outroVendedorTexto) }));
    } else {
      setModoOutroVendedor(false);
      setFormulario((f) => ({ ...f, vendedor: ouNulo(valor) }));
    }
  };

  const handleOutroVendedorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setOutroVendedorTexto(valor);
    setFormulario((f) => ({ ...f, vendedor: ouNulo(valor) }));
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formulario.nome.trim()) return;

    setSalvando(true);
    try {
      const dados = paraEnvio(formulario);
      if (clienteEmEdicao) {
        await atualizarCliente(clienteEmEdicao.id, dados);
      } else {
        await criarCliente(dados);
      }
      onClose();
      if (onSucesso) onSucesso();
    } catch {
      // O AppContext já exibe o toast de erro da API
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={clienteEmEdicao ? 'Editar Dados do Cliente' : 'Cadastrar Novo Cliente'}
      subtitle={
        clienteEmEdicao
          ? `Atualização cadastral do cliente #${clienteEmEdicao.id} (${clienteEmEdicao.nome})`
          : 'Ponto de partida do fluxo — os módulos de pendências, débitos, projetos e unificação dependem deste cadastro'
      }
      maxWidth="3xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="form-cliente-modal"
            disabled={salvando}
            className="px-4 py-2 text-xs font-medium text-white bg-[#149911] hover:bg-[#256D1B] rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
          >
            <UserCheck className="w-4 h-4" />
            {salvando
              ? 'Salvando…'
              : clienteEmEdicao
                ? 'Salvar Alterações'
                : 'Cadastrar Cliente'}
          </button>
        </>
      }
    >
      <form id="form-cliente-modal" onSubmit={handleSalvar} className="space-y-4 text-xs">
        {/* Nome e data do pagamento: os dois campos que todo cadastro tem. */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="font-medium text-slate-700 dark:text-slate-200 block mb-1" htmlFor="cliente-nome">
              Nome Completo do Cliente <span className="text-rose-600">*</span>
            </label>
            <input
              id="cliente-nome"
              type="text"
              required
              maxLength={150}
              value={formulario.nome}
              onChange={(e) => setFormulario((f) => ({ ...f, nome: e.target.value }))}
              placeholder="Ex: Maria Souza dos Santos"
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#149911]"
            />
          </div>

          <div>
            <label className="font-medium text-slate-700 dark:text-slate-200 block mb-1" htmlFor="cliente-pagamento">
              Data do Pagamento
            </label>
            <input
              id="cliente-pagamento"
              type="date"
              value={formulario.dataPagamento ?? ''}
              onChange={(e) =>
                setFormulario((f) => ({ ...f, dataPagamento: ouNulo(e.target.value) }))
              }
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#149911]"
            />
            <p className="text-[11px] text-[#424342] dark:text-slate-400 mt-1">
              Marco zero do tempo de atendimento no dashboard.
            </p>
          </div>
        </div>

        {/* UC Coelba & Telefone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="font-medium text-slate-700 dark:text-slate-200 block mb-1" htmlFor="cliente-uc">
              Conta Contrato / UC Coelba
            </label>
            <input
              id="cliente-uc"
              type="text"
              maxLength={30}
              value={formulario.ucCoelba ?? ''}
              onChange={(e) =>
                setFormulario((f) => ({ ...f, ucCoelba: ouNulo(e.target.value) }))
              }
              placeholder="Ex: 7012345678"
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#149911]"
            />
            <p className="text-[11px] text-[#424342] dark:text-slate-400 mt-1">
              Se houver mais de uma conta, registre aqui apenas a geradora.
            </p>
          </div>

          <div>
            <label className="font-medium text-slate-700 dark:text-slate-200 block mb-1" htmlFor="cliente-telefone">
              Telefone / WhatsApp
            </label>
            <input
              id="cliente-telefone"
              type="tel"
              maxLength={20}
              value={formulario.telefone ?? ''}
              onChange={(e) =>
                setFormulario((f) => ({ ...f, telefone: ouNulo(e.target.value) }))
              }
              placeholder="Ex: (71) 98888-7777"
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#149911]"
            />
          </div>
        </div>

        {/* Cidade (Bahia) & Vendedor */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="font-medium text-slate-700 dark:text-slate-200 block mb-1" htmlFor="cliente-cidade">
              Município (Bahia)
            </label>
            <input
              id="cliente-cidade"
              list="municipios-bahia-list"
              type="text"
              maxLength={100}
              value={formulario.cidade ?? ''}
              onChange={(e) => setFormulario((f) => ({ ...f, cidade: ouNulo(e.target.value) }))}
              placeholder="Digite ou selecione o município da BA"
              className={`w-full bg-white dark:bg-slate-800 border rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 ${
                !cidadeEhValidaBA
                  ? 'border-amber-400 focus:ring-amber-500'
                  : 'border-slate-200 dark:border-slate-700 focus:ring-[#149911]'
              }`}
            />
            <datalist id="municipios-bahia-list">
              {municipios.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>

            {/* Só o aviso: confirmar que está certo é ruído em campo que quase sempre está. */}
            {!cidadeEhValidaBA && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Atenção: selecione um dos 417 municípios oficiais da Bahia para evitar erros de digitação.
              </p>
            )}
          </div>

          <div>
            <label className="font-medium text-slate-700 dark:text-slate-200 block mb-1" htmlFor="cliente-vendedor">
              Vendedor Responsável
            </label>
            <select
              id="cliente-vendedor"
              value={modoOutroVendedor ? '__OUTRO__' : formulario.vendedor ?? ''}
              onChange={handleVendedorChange}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#149911]"
            >
              <option value="">Selecione o vendedor...</option>
              {vendedores.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
              {formulario.vendedor &&
                !vendedores.includes(formulario.vendedor) &&
                !modoOutroVendedor && (
                  <option value={formulario.vendedor}>{formulario.vendedor} (atual)</option>
                )}
              <option value="__OUTRO__">Outro vendedor (digitar)...</option>
            </select>

            {modoOutroVendedor && (
              <input
                type="text"
                maxLength={150}
                value={outroVendedorTexto}
                onChange={handleOutroVendedorChange}
                placeholder="Digite o nome do vendedor"
                className="mt-2 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#149911]"
              />
            )}
          </div>
        </div>

        {/*
          Os dois desenham o fluxo do cliente, e por isso ficam no cadastro e não numa ação: são
          decididos na entrada e valem do começo ao fim. Desmarcar "somente pendência" é o
          caminho para devolver ao fluxo completo o avulso que virou projeto de verdade.
        */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <label className="flex items-start gap-2 cursor-pointer" htmlFor="cliente-so-pendencia">
            <input
              id="cliente-so-pendencia"
              type="checkbox"
              checked={formulario.somentePendencia}
              onChange={(e) =>
                setFormulario((f) => ({ ...f, somentePendencia: e.target.checked }))
              }
              className="mt-0.5 accent-[#149911]"
            />
            <span>
              <span className="font-medium text-slate-700 dark:text-slate-200">
                Fluxo somente pendência
              </span>
              <span className="block text-[11px] text-[#424342] dark:text-slate-300">
                Cliente avulso: entrada → pendência → resolvida → fim. Nenhum projeto é criado
                quando a pendência for resolvida, e ele não segue para encaminhamento nem
                vistoria.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-2 cursor-pointer" htmlFor="cliente-banco">
            <input
              id="cliente-banco"
              type="checkbox"
              checked={formulario.banco}
              onChange={(e) => setFormulario((f) => ({ ...f, banco: e.target.checked }))}
              className="mt-0.5 accent-[#149911]"
            />
            <span>
              <span className="font-medium text-slate-700 dark:text-slate-200">
                Projeto Banco (financiamento)
              </span>
              <span className="block text-[11px] text-[#424342] dark:text-slate-300">
                Vem marcado sozinho quando o cliente entra pela etapa de banco do Nectar. O fluxo
                aqui é igual ao normal; muda a etapa para onde ele volta no CRM ao ser aprovado.
              </span>
            </span>
          </label>
        </div>
      </form>
    </Modal>
  );
};
