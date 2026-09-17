import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Cliente, DadosCliente } from '../../types';
import { Modal } from './Modal';
import { VENDEDORES_PADRAO, MUNICIPIOS_BAHIA } from '../../data/constantes';
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
};

const ouNulo = (v: string): string | null => {
  const trim = v.trim();
  return trim === '' ? null : trim;
};

export const ClienteModal: React.FC<ClienteModalProps> = ({
  isOpen,
  onClose,
  clienteEmEdicao,
  onSucesso,
}) => {
  const { criarCliente, atualizarCliente } = useApp();
  const [formulario, setFormulario] = useState<DadosCliente>(FORMULARIO_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [modoOutroVendedor, setModoOutroVendedor] = useState(false);
  const [outroVendedorTexto, setOutroVendedorTexto] = useState('');

  // Inicializa o formulário quando o modal abre ou clienteEmEdicao muda
  useEffect(() => {
    if (!isOpen) return;

    if (clienteEmEdicao) {
      const { id: _id, statusTriagem: _st, ...dados } = clienteEmEdicao;
      setFormulario(dados);

      // Checa se vendedor atual pertence à lista pré-definida
      if (dados.vendedor && !VENDEDORES_PADRAO.includes(dados.vendedor as typeof VENDEDORES_PADRAO[number])) {
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
  }, [isOpen, clienteEmEdicao]);

  const cidadeDigitada = (formulario.cidade ?? '').trim();
  const cidadeEhValidaBA =
    cidadeDigitada === '' ||
    MUNICIPIOS_BAHIA.some((m) => m.toLowerCase() === cidadeDigitada.toLowerCase());

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
      if (clienteEmEdicao) {
        await atualizarCliente(clienteEmEdicao.id, formulario);
      } else {
        await criarCliente(formulario);
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
      maxWidth="lg"
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
        {/* Nome */}
        <div>
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
              {MUNICIPIOS_BAHIA.map((m) => (
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
              {VENDEDORES_PADRAO.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
              {formulario.vendedor &&
                !VENDEDORES_PADRAO.includes(formulario.vendedor as typeof VENDEDORES_PADRAO[number]) &&
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

        {/* Data de Pagamento */}
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
        </div>

        <div className="text-[11px] text-[#424342] dark:text-slate-300 bg-emerald-50/80 dark:bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-800/50 space-y-1">
          <p>
            💡 <strong>Marco zero de tempo:</strong> a data de pagamento é utilizada no
            dashboard para calcular o tempo de atendimento do cliente até a primeira ação no fluxo.
          </p>
        </div>
      </form>
    </Modal>
  );
};
