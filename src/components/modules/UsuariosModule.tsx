import React, { useEffect, useMemo, useState } from 'react';
import { KeyRound, Pencil, Plus, Search, ShieldAlert, UserCheck, UserX } from 'lucide-react';
import { ApiError } from '../../api/client';
import { usuariosApi } from '../../api/recursos';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Papel, Usuario } from '../../types';
import { Badge } from '../common/Badge';
import { Card } from '../common/Card';
import { Modal } from '../common/Modal';
import { Botao } from '../ui/Button';
import { Campo, Entrada } from '../ui/Campo';
import { ITENS_POR_PAGINA, Paginacao } from '../ui/Paginacao';
import { Cabecalho, Corpo, Linha, LinhaVazia, Ordenavel, Tabela, Td, Th } from '../ui/Tabela';
import { useOrdenacao } from '../../hooks/useOrdenacao';

/**
 * Cadastro de quem entra no sistema — restrito a ADMINISTRADOR e GESTOR.
 *
 * Existe porque, sem login federado nem auto-cadastro (decisão do usuário em 16/09/2026), esta
 * é a **única** porta de entrada de gente: até aqui, cadastrar uma analista era um POST no
 * Swagger. A sidebar já esconde o item para o ANALISTA, e a API recusa com 403 de qualquer
 * jeito — a tela não é a proteção, é a conveniência.
 *
 * Não há botão de excluir, e é de propósito: `DELETE /api/usuarios/{id}` falha com 409 assim
 * que a pessoa aparece no `historico_status`, e apagar quem já trabalhou destruiria a auditoria
 * que sustenta o dashboard. Cortar acesso é **desativar** — o token morre em minutos e a
 * renovação passa a ser negada.
 */

const PAPEIS: Papel[] = ['ANALISTA', 'GESTOR', 'ADMINISTRADOR'];

const DESCRICAO_PAPEL: Record<Papel, string> = {
  ANALISTA: 'Trabalha todas as etapas do fluxo. Não apaga registros nem gerencia usuários.',
  GESTOR: 'Tudo o que o analista faz, mais o cadastro de usuários.',
  ADMINISTRADOR: 'Acesso total, incluindo exclusão de registros e correção de status.',
};

const VARIANTE_PAPEL: Record<Papel, 'danger' | 'info' | 'neutral'> = {
  ADMINISTRADOR: 'danger',
  GESTOR: 'info',
  ANALISTA: 'neutral',
};

/** Do mais alto para o mais baixo, para a coluna ordenar por alcance e não por alfabeto. */
const PESO_PAPEL: Record<Papel, number> = {
  ADMINISTRADOR: 0,
  GESTOR: 1,
  ANALISTA: 2,
};

const papelPrincipal = (u: Usuario): Papel =>
  PAPEIS.slice().sort((a, b) => PESO_PAPEL[a] - PESO_PAPEL[b]).find(p => u.papeis.includes(p))
  ?? 'ANALISTA';

const VALORES_ORDENAVEIS = {
  nome: (u: Usuario) => u.nome,
  email: (u: Usuario) => u.email,
  papel: (u: Usuario) => PESO_PAPEL[papelPrincipal(u)],
  situacao: (u: Usuario) => (u.ativo ? 1 : 0),
};

type ColunaUsuario = keyof typeof VALORES_ORDENAVEIS;

const SENHA_MINIMA = 8;

export const UsuariosModule: React.FC = () => {
  const { mostrarToast, recarregar } = useApp();
  const { usuario: eu, temPapel } = useAuth();
  const souAdministrador = temPapel('ADMINISTRADOR');

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [pagina, setPagina] = useState(1);

  const { ordenacao, ordenar, cabecalho } = useOrdenacao<Usuario, ColunaUsuario>(
    VALORES_ORDENAVEIS,
    { campo: 'nome', direcao: 'asc' },
  );

  const [emEdicao, setEmEdicao] = useState<Usuario | null>(null);
  const [modalCadastro, setModalCadastro] = useState(false);
  const [trocandoSenhaDe, setTrocandoSenhaDe] = useState<Usuario | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [formNome, setFormNome] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPapel, setFormPapel] = useState<Papel>('ANALISTA');
  const [formSenha, setFormSenha] = useState('');
  const [novaSenha, setNovaSenha] = useState('');

  /**
   * A lista vive aqui, e não no `AppContext`: o contexto carrega o que todas as telas usam, e
   * o ANALISTA tomaria 403 nesta rota logo no login, derrubando o carregamento inteiro.
   */
  const carregar = async () => {
    setErro(null);
    try {
      setUsuarios(await usuariosApi.listar());
    } catch (e) {
      setErro(
        e instanceof ApiError ? e.mensagemAmigavel : 'Não foi possível carregar os usuários',
      );
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return ordenar(
      usuarios.filter(
        u =>
          !termo
          || u.nome.toLowerCase().includes(termo)
          || u.email.toLowerCase().includes(termo),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarios, busca, ordenacao]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / ITENS_POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const paginados = filtrados.slice(
    (paginaAtual - 1) * ITENS_POR_PAGINA,
    paginaAtual * ITENS_POR_PAGINA,
  );

  const ativos = usuarios.filter(u => u.ativo).length;
  const semSenha = usuarios.filter(u => !u.temSenha).length;

  /** Gestor não mexe em administrador: a API recusa, e a tela não oferece o que não abre. */
  const podeMexerEm = (u: Usuario) => souAdministrador || !u.papeis.includes('ADMINISTRADOR');

  const papeisDisponiveis = souAdministrador
    ? PAPEIS
    : PAPEIS.filter(p => p !== 'ADMINISTRADOR');

  const abrirCadastro = () => {
    setFormNome('');
    setFormEmail('');
    setFormPapel('ANALISTA');
    setFormSenha('');
    setModalCadastro(true);
  };

  const abrirEdicao = (u: Usuario) => {
    setFormNome(u.nome);
    setFormEmail(u.email);
    setFormPapel(papelPrincipal(u));
    setEmEdicao(u);
  };

  /**
   * As mutações falam direto com a API e recarregam só esta lista — mas chamam `recarregar()`
   * do contexto depois, porque os seletores de responsável das outras telas saem do mesmo
   * cadastro e ficariam desatualizados até o próximo F5.
   */
  const executar = async (acao: () => Promise<unknown>, sucesso: string) => {
    setSalvando(true);
    try {
      await acao();
      await carregar();
      recarregar();
      mostrarToast(sucesso);
      return true;
    } catch (e) {
      mostrarToast(
        e instanceof ApiError ? e.mensagemAmigavel : 'Não foi possível concluir a ação',
        'alerta',
      );
      return false;
    } finally {
      setSalvando(false);
    }
  };

  const salvarCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await executar(
      () =>
        usuariosApi.criar({
          nome: formNome.trim(),
          email: formEmail.trim(),
          papeis: [formPapel],
          senha: formSenha,
        }),
      'Usuário cadastrado — passe a senha provisória a ele',
    );
    if (ok) setModalCadastro(false);
  };

  const salvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emEdicao) return;
    const ok = await executar(
      () =>
        usuariosApi.atualizar(emEdicao.id, {
          nome: formNome.trim(),
          email: formEmail.trim(),
          papeis: [formPapel],
        }),
      'Cadastro atualizado',
    );
    if (ok) setEmEdicao(null);
  };

  const salvarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trocandoSenhaDe) return;
    const ok = await executar(
      () => usuariosApi.definirSenha(trocandoSenhaDe.id, novaSenha),
      'Senha redefinida',
    );
    if (ok) {
      setTrocandoSenhaDe(null);
      setNovaSenha('');
    }
  };

  const alternarAtivacao = (u: Usuario) =>
    executar(
      () => (u.ativo ? usuariosApi.desativar(u.id) : usuariosApi.ativar(u.id)),
      u.ativo ? 'Acesso desativado' : 'Acesso reativado',
    );

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-24 text-texto-suave text-sm">
        Carregando usuários…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <Card className="p-4">
          <div className="text-2xs uppercase tracking-wider text-texto-apagado">Com acesso</div>
          <div className="text-2xl font-medium text-texto mt-1">{ativos}</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase tracking-wider text-texto-apagado">Desativados</div>
          <div className="text-2xl font-medium text-texto mt-1">
            {usuarios.length - ativos}
          </div>
        </Card>
        <Card className="p-4">
          {/* Conta que existe mas não entra: só sobra de antes de a senha virar obrigatória. */}
          <div className="text-2xs uppercase tracking-wider text-texto-apagado">Sem senha</div>
          <div className="text-2xl font-medium text-texto mt-1">{semSenha}</div>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-texto-apagado absolute left-3 top-1/2 -translate-y-1/2" />
          <Entrada
            type="text"
            placeholder="Buscar por nome ou e-mail…"
            value={busca}
            onChange={e => {
              setBusca(e.target.value);
              setPagina(1);
            }}
            className="pl-9"
          />
        </div>
        <Botao variante="primario" onClick={abrirCadastro}>
          <Plus className="w-4 h-4" />
          Novo usuário
        </Botao>
      </div>

      {erro && (
        <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-700">
          {erro}
        </div>
      )}

      <Card
        title="Usuários do sistema"
        subtitle="Quem não estiver aqui não entra: não há auto-cadastro"
      >
        <Tabela>
          <Cabecalho>
            <Th className="pl-6">
              <Ordenavel {...cabecalho('nome')}>Nome</Ordenavel>
            </Th>
            <Th>
              <Ordenavel {...cabecalho('email')}>E-mail</Ordenavel>
            </Th>
            <Th>
              <Ordenavel {...cabecalho('papel')}>Papel</Ordenavel>
            </Th>
            <Th>
              <Ordenavel {...cabecalho('situacao')}>Situação</Ordenavel>
            </Th>
            <Th alinhamento="direita" className="pr-6">
              Ações
            </Th>
          </Cabecalho>
          <Corpo>
            {paginados.length === 0 ? (
              <LinhaVazia colunas={5}>Nenhum usuário encontrado.</LinhaVazia>
            ) : (
              paginados.map(u => {
                const papel = papelPrincipal(u);
                const editavel = podeMexerEm(u);
                return (
                  <Linha key={u.id}>
                    <Td className="pl-6">
                      <div className="font-medium text-texto">
                        {u.nome}
                        {u.id === eu?.id && (
                          <span className="ml-1.5 text-2xs text-texto-apagado">(você)</span>
                        )}
                      </div>
                      {!u.temSenha && (
                        <div className="text-2xs text-amber-600 flex items-center gap-1 mt-0.5">
                          <ShieldAlert className="w-3 h-3" />
                          Sem senha definida — não consegue entrar
                        </div>
                      )}
                    </Td>
                    <Td className="text-texto-suave">{u.email}</Td>
                    <Td>
                      <Badge variant={VARIANTE_PAPEL[papel]} dot={false}>
                        {papel}
                      </Badge>
                    </Td>
                    <Td>
                      {u.ativo ? (
                        <Badge variant="success">Ativo</Badge>
                      ) : (
                        <Badge variant="neutral">Desativado</Badge>
                      )}
                    </Td>
                    <Td alinhamento="direita" className="pr-6">
                      <div className="flex items-center justify-end gap-2">
                        <Botao
                          tamanho="icone"
                          variante="fantasma"
                          disabled={!editavel}
                          onClick={() => abrirEdicao(u)}
                          title={
                            editavel
                              ? 'Editar nome, e-mail e papel'
                              : 'Só um administrador altera outro administrador'
                          }
                        >
                          <Pencil className="w-4 h-4" />
                        </Botao>
                        <Botao
                          tamanho="icone"
                          variante="fantasma"
                          disabled={!editavel}
                          onClick={() => {
                            setNovaSenha('');
                            setTrocandoSenhaDe(u);
                          }}
                          title="Definir uma nova senha"
                        >
                          <KeyRound className="w-4 h-4" />
                        </Botao>
                        <Botao
                          tamanho="sm"
                          variante={u.ativo ? 'contorno' : 'primario'}
                          // Desativar a si mesmo tirava o acesso de quem está administrando;
                          // a API também recusa.
                          disabled={!editavel || u.id === eu?.id}
                          onClick={() => alternarAtivacao(u)}
                          title={
                            u.id === eu?.id
                              ? 'Ninguém desativa a própria conta'
                              : u.ativo
                                ? 'Corta o acesso preservando o histórico'
                                : 'Devolve o acesso'
                          }
                        >
                          {u.ativo ? (
                            <>
                              <UserX className="w-3.5 h-3.5" />
                              Desativar
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              Reativar
                            </>
                          )}
                        </Botao>
                      </div>
                    </Td>
                  </Linha>
                );
              })
            )}
          </Corpo>
        </Tabela>

        <Paginacao
          pagina={paginaAtual}
          totalPaginas={totalPaginas}
          exibidos={paginados.length}
          total={filtrados.length}
          onMudar={setPagina}
        />
      </Card>

      {/* Modal: novo usuário */}
      <Modal
        isOpen={modalCadastro}
        onClose={() => setModalCadastro(false)}
        title="Cadastrar usuário"
        subtitle="A pessoa entra com este e-mail e a senha provisória abaixo"
        footer={
          <>
            <Botao variante="fantasma" onClick={() => setModalCadastro(false)}>
              Cancelar
            </Botao>
            <Botao variante="primario" type="submit" form="form-novo-usuario" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Cadastrar'}
            </Botao>
          </>
        }
      >
        <form id="form-novo-usuario" onSubmit={salvarCadastro} className="space-y-4">
          <Campo rotulo="Nome completo" htmlFor="novo-nome" obrigatorio>
            <Entrada
              id="novo-nome"
              value={formNome}
              onChange={e => setFormNome(e.target.value)}
              required
              maxLength={150}
            />
          </Campo>
          <Campo
            rotulo="E-mail"
            htmlFor="novo-email"
            obrigatorio
            ajuda="É o login. Maiúsculas e minúsculas não diferenciam a conta."
          >
            <Entrada
              id="novo-email"
              type="email"
              value={formEmail}
              onChange={e => setFormEmail(e.target.value)}
              required
              maxLength={150}
            />
          </Campo>
          <Campo rotulo="Papel" obrigatorio ajuda={DESCRICAO_PAPEL[formPapel]}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {papeisDisponiveis.map(p => (
                <label
                  key={p}
                  className={`cursor-pointer rounded-xl border px-3 py-2 text-xs transition-colors ${
                    formPapel === p
                      ? 'border-solar-primary bg-solar-primary/5 text-texto'
                      : 'border-borda text-texto-suave hover:border-borda-forte'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{p}</span>
                    <input
                      type="radio"
                      name="papel"
                      checked={formPapel === p}
                      onChange={() => setFormPapel(p)}
                      className="accent-solar-primary"
                    />
                  </div>
                </label>
              ))}
            </div>
          </Campo>
          <Campo
            rotulo="Senha provisória"
            htmlFor="nova-senha"
            obrigatorio
            ajuda={`Mínimo de ${SENHA_MINIMA} caracteres. Passe-a pessoalmente e peça a troca no primeiro acesso.`}
          >
            <Entrada
              id="nova-senha"
              type="text"
              value={formSenha}
              onChange={e => setFormSenha(e.target.value)}
              required
              minLength={SENHA_MINIMA}
              maxLength={100}
            />
          </Campo>
          {!souAdministrador && (
            <p className="text-2xs text-texto-suave">
              Só um administrador concede o papel ADMINISTRADOR.
            </p>
          )}
        </form>
      </Modal>

      {/* Modal: editar usuário */}
      <Modal
        isOpen={!!emEdicao}
        onClose={() => setEmEdicao(null)}
        title="Editar usuário"
        subtitle={emEdicao?.email}
        footer={
          <>
            <Botao variante="fantasma" onClick={() => setEmEdicao(null)}>
              Cancelar
            </Botao>
            <Botao
              variante="primario"
              type="submit"
              form="form-editar-usuario"
              disabled={salvando}
            >
              {salvando ? 'Salvando…' : 'Salvar'}
            </Botao>
          </>
        }
      >
        <form id="form-editar-usuario" onSubmit={salvarEdicao} className="space-y-4">
          <Campo rotulo="Nome completo" htmlFor="editar-nome" obrigatorio>
            <Entrada
              id="editar-nome"
              value={formNome}
              onChange={e => setFormNome(e.target.value)}
              required
              maxLength={150}
            />
          </Campo>
          <Campo rotulo="E-mail" htmlFor="editar-email" obrigatorio>
            <Entrada
              id="editar-email"
              type="email"
              value={formEmail}
              onChange={e => setFormEmail(e.target.value)}
              required
              maxLength={150}
            />
          </Campo>
          <Campo rotulo="Papel" obrigatorio ajuda={DESCRICAO_PAPEL[formPapel]}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {papeisDisponiveis.map(p => (
                <label
                  key={p}
                  className={`cursor-pointer rounded-xl border px-3 py-2 text-xs transition-colors ${
                    formPapel === p
                      ? 'border-solar-primary bg-solar-primary/5 text-texto'
                      : 'border-borda text-texto-suave hover:border-borda-forte'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{p}</span>
                    <input
                      type="radio"
                      name="papel-edicao"
                      checked={formPapel === p}
                      onChange={() => setFormPapel(p)}
                      className="accent-solar-primary"
                    />
                  </div>
                </label>
              ))}
            </div>
          </Campo>
          <p className="text-2xs text-texto-suave">
            A senha não muda por aqui — use a chave na linha do usuário.
          </p>
        </form>
      </Modal>

      {/* Modal: redefinir senha */}
      <Modal
        isOpen={!!trocandoSenhaDe}
        onClose={() => setTrocandoSenhaDe(null)}
        title="Redefinir senha"
        subtitle={trocandoSenhaDe?.nome}
        footer={
          <>
            <Botao variante="fantasma" onClick={() => setTrocandoSenhaDe(null)}>
              Cancelar
            </Botao>
            <Botao variante="primario" type="submit" form="form-senha" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Definir senha'}
            </Botao>
          </>
        }
      >
        <form id="form-senha" onSubmit={salvarSenha} className="space-y-4">
          <Campo
            rotulo="Nova senha"
            htmlFor="senha-nova"
            obrigatorio
            ajuda={`Mínimo de ${SENHA_MINIMA} caracteres. As sessões abertas continuam valendo por até 15 minutos.`}
          >
            <Entrada
              id="senha-nova"
              type="text"
              value={novaSenha}
              onChange={e => setNovaSenha(e.target.value)}
              required
              minLength={SENHA_MINIMA}
              maxLength={100}
            />
          </Campo>
        </form>
      </Modal>
    </div>
  );
};
