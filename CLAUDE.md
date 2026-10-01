# SolarSync — frontend (`solarsync-front`)

Interface do SolarSync, o sistema que substitui a planilha de 18 abas com que a ConectSol
controla a homologação de projetos solares na Coelba.

**Este documento cobre o frontend.** O contexto de negócio, o modelo de domínio e as regras do
fluxo vivem no `CLAUDE.md` do repositório do backend (`solarsync`) — a fonte de verdade é lá, e
duplicá-la aqui só criaria duas versões divergentes (foi o que aconteceu com a cópia anterior
deste arquivo).

## Stack

React 18 + TypeScript + Vite + Tailwind. Ícones: `lucide-react`. Sem router: a navegação entre
módulos é estado no `AppContext`, o que basta para uma aplicação de oito telas atrás de login.
Sem biblioteca de data fetching: o volume é de dezenas a centenas de linhas por tela, e um
cliente HTTP próprio evita uma dependência que ninguém pediu.

## Como rodar

```bash
npm install
npm run dev      # http://localhost:5173
```

O backend precisa estar no ar em `http://localhost:8080` (veja o README/CLAUDE.md dele). Para
apontar para outro endereço, crie um `.env` a partir do `.env.example`.

Usuário inicial em desenvolvimento: `joaogabriel@conectsol.com`, senha definida na configuração
local do backend.

## Como conversa com a API

O contrato é o `docs/api/openapi.json` do repositório do backend, também navegável em
`http://localhost:8080/swagger-ui.html` com o backend rodando. Ao mexer em qualquer coisa de
dados, confira o contrato em vez de deduzir pelo nome do campo.

- `src/api/client.ts` — fetch com token, **renovação automática** do access token (que dura 15
  min) e erros da API convertidos em `ApiError` com `codigo` legível por máquina.
- `src/api/recursos.ts` — uma função por endpoint, tipada. Nenhum componente monta URL na mão.
- `src/context/AuthContext.tsx` — login, usuário atual, papel e logout.
- `src/context/AppContext.tsx` — carrega as listas e expõe as mutações.

### Convenções que vêm do contrato

- `id` é `number`; campos em `camelCase`; datas são strings ISO (`YYYY-MM-DD` ou ISO-8601).
- Enums são chaves técnicas (`AGUARDANDO_ENVIO`). O texto que o usuário lê sai dos mapas
  `ROTULO_*` em `src/types/index.ts` — nunca exiba o enum cru.
- **Mudança de status é endpoint de ação** (`resolverPendencia`, `encaminharProjeto`), nunca um
  PUT com campo `status`. É o que garante a automação entre etapas e a auditoria no servidor.
- **Tempo médio `null` no dashboard não é zero**: significa "não houve caso no período". Mostrar
  `0` faria o gestor ler "instantâneo" onde não há dado. Exiba `—`.
- Listagens devolvem o cliente achatado (`clienteId` + `clienteNome`); o `AppContext` recompõe a
  forma aninhada juntando com a lista de clientes que já carrega, para as telas terem cidade,
  vendedor e UC sem uma requisição por linha.
- ⚠️ **Listagem e detalhe são DTOs diferentes no backend** (`ProjetoResumoResponse` vs
  `ProjetoResponse`, e o mesmo em Pendência). Campo novo que a *tabela* mostra precisa entrar nos
  dois: só no detalhe, a coluna renderiza vazia sem erro nenhum — foi o que aconteceu com o
  `numeroSolicitacao`.

### Erros e feedback

O `AppContext` já mostra toast de sucesso e, no erro, a mensagem que a API devolveu — inclusive
as regras de negócio, que chegam como 409 com texto pronto:

| `codigo` | Significa |
|---|---|
| `CLIENTE_COM_DEBITO` | o cliente deve na etapa em questão; pede cobrança |
| `DEBITO_NAO_CONSULTADO` | ninguém consultou a agência virtual para aquela etapa; pede consulta |
| `PROJETO_SEM_INSTALACAO` | vistoria exige a data de instalação registrada antes |
| `TRANSICAO_INVALIDA` | o status atual não permite aquela mudança |
| `ACESSO_NEGADO` | o papel do usuário não permite a ação |
| `UNIFICACAO_NAO_FEITA` | o desligamento só é pedido depois de confirmada a unificação |
| `NUMERO_SOLICITACAO_OBRIGATORIO` | envio à Coelba sem o nº da solicitação (ver abaixo) |
| `LIMITE_DE_TENTATIVAS` | 429 no login: tentativas demais (ver abaixo) |
| `SEM_CONEXAO` | **não vem da API** — é o `client.ts` traduzindo falha de rede (ver abaixo) |

Os dois primeiros são recusas **diferentes** de propósito, e as telas antecipam qual será
(`bloqueioDaResolucao` em Pendências, `bloqueioDoEnvio` em Projetos) em vez de deixar o analista
descobrir clicando. Juntá-los mandaria cobrar um cliente que talvez não deva nada.

#### Login bloqueado por tentativas (19/09/2026)

O backend ganhou limite de tentativas no `/api/auth/login` (BCrypt é caro de propósito, e sem
limite isso vira vetor de negação de serviço). A recusa vem como **429** com `codigo:
LIMITE_DE_TENTATIVAS` e o cabeçalho **`Retry-After`** em segundos.

- `ApiError.esperarSegundos` lê o `Retry-After`. É o único cabeçalho que o cliente HTTP olha, e
  existe para a tela **contar o tempo** em vez de dizer "tente mais tarde" e deixar a pessoa
  adivinhar quanto é mais tarde.
- `AuthContext.bloqueadoAte` guarda o instante em que a espera acaba. A `LoginScreen` faz a
  contagem regressiva, **desabilita o botão** enquanto dura e mostra um aviso **âmbar**, não
  vermelho: não é erro de quem digita, é o servidor pedindo espera.
- ⚠️ **O aviso substitui a mensagem de credencial** enquanto o bloqueio dura. Enquanto ele vale,
  a senha nem chega a ser avaliada — mostrar "credenciais inválidas" faria a pessoa achar que
  errou a digitação e tentar de novo, que é exatamente o que não ajuda. (Insistir também não
  aumenta a espera: a tentativa bloqueada não entra na contagem do servidor.)
- Distinguir este caso **não vaza nada**: ele não fala sobre a conta, fala sobre quantas vezes
  já se tentou. Todos os outros motivos de recusa seguem com a mesma mensagem genérica, de
  propósito.

#### Falha de rede virou erro com código (19/09/2026)

O `fetch` lança `TypeError` quando não alcança o servidor — API desligada, rede caída, CORS
barrado —, e isso chegava às telas como erro genérico. Na de login, um backend simplesmente
desligado aparecia como "não foi possível entrar", indistinguível de senha errada; era um buraco
conhecido registrado na seção 11 do CLAUDE.md do backend.

Agora o `client.ts` converte em `ApiError` com `status: 0` e `codigo: SEM_CONEXAO`, e a mensagem
diz para conferir se a API está no ar. Vale para **todas** as telas, não só a de login.

### O nº da solicitação é obrigatório para enviar à Coelba (17/09/2026)

Decisão do usuário. É a chave que casa o retorno por e-mail da Coelba com o projeto (seção 9 do
CLAUDE.md do backend); sem ela o projeto vai à Coelba sem chave nenhuma de volta, e a automação
da etapa 3 não tem como saber de que projeto o e-mail fala.

Vale no **envio e no reenvio** — no reenvio a Coelba pode emitir outro número, e aceitar vazio
manteria o do ciclo anterior. O modal já pré-preenche o número atual no reenvio, então o custo
para a analista é confirmar, não digitar de novo.

Três barreiras, da mais amigável para a última:

1. o botão "Confirmar Envio" fica **desabilitado** enquanto o campo está vazio — o analista
   descobre antes de clicar, e não por um toast de erro;
2. `handleConfirmarEncaminhamento` recusa em branco, para nenhum caminho alternativo escapar;
3. `encaminharProjeto` e `reencaminharProjeto` recebem `numeroSolicitacao: string` **não
   opcional**, e por isso ele vem **antes** da `dataArt` na assinatura de `encaminharProjeto` —
   assim o próprio TypeScript recusa a chamada sem ele, em vez de descobrirmos com um 400.

⚠️ A API recusa com **400 `VALIDACAO`** (é `@NotBlank` de corpo), não com o 409 da tabela acima.
O 409 `NUMERO_SOLICITACAO_OBRIGATORIO` existe para as origens que não são a tela.

⚠️ **Invariante do débito: um débito trava uma etapa só** — ou a resolução da pendência, ou a
homologação do projeto, nunca as duas (reforçado pelo usuário em 16/09/2026). Na prática, isso
quer dizer que **toda leitura de `debitos` filtra por `tipo` antes de decidir qualquer coisa**:
`bloqueioDaResolucao` só olha `PENDENCIA`, `bloqueioDoEnvio` só olha `HOMOLOGACAO`, e
`ClientesModule` indexa por `clienteId|tipo`. Um `debitos.find(d => d.cliente.id === id)` sem
filtro de tipo reintroduz em silêncio o modelo antigo, em que uma linha só travava as duas
etapas. O badge da sidebar é a exceção que confirma a regra: conta **clientes distintos**
travados, porque ali a pergunta é "quantas pessoas estão paradas", não "por qual etapa".

⚠️ **A tela de Débitos lista só a etapa em que o cliente está agora** (pedido do usuário em
17/09/2026). O `DebitosModule` sintetiza as linhas a partir de `clientes × TIPOS_DEBITO`, então
antes todo cliente nascia com **duas** linhas — e o financeiro via o dobro do trabalho que
existia: consulta de homologação cobrada de quem ainda está resolvendo pendência, e consulta de
pendência cobrada de quem nunca teve pendência. Quem responde "que etapa é essa" é a função
`etapasEmAberto`, que lê o próprio fluxo:

| Tipo | Aparece quando |
|---|---|
| `PENDENCIA` | há pendência `ABERTA` do cliente |
| `HOMOLOGACAO` | há projeto do cliente ainda não `APROVADO` |
| qualquer | o débito daquele tipo está `ATIVO` |

A última linha é a que não pode sair: **débito ativo aparece sempre**, mesmo fora da etapa —
filtrar serve para calar linha sem trabalho, nunca para esconder cliente travado. O detalhe do
cliente (o olho na linha) continua saindo do universo completo, porque é lá que a etapa já
vencida ainda interessa. Cliente em `AGUARDANDO_VERIFICACAO` não gera linha nenhuma: antes da
triagem não se sabe se haverá pendência, e cobrar a consulta ali é inventar trabalho.

Componentes **não** devem mostrar toast próprio depois de uma mutação: duplicaria a mensagem.

## Clientes é a entrada, não mais um módulo do fluxo

`ClientesModule` abre os módulos do fluxo de propósito: todo outro módulo pede um `clienteId`
num seletor, então **sem esta tela a interface só funcionava com os dados de exemplo do
backend** — não havia como cadastrar o primeiro cliente (era o estado até 04/09/2026).

- O mesmo modal serve criar e editar. O `PUT /api/clientes/{id}` **substitui o cadastro
  inteiro** (`ClienteService.atualizar` seta todos os campos), então o formulário parte de
  todos os valores atuais do cliente e envia todos de volta — mandar só o campo alterado
  apagaria o resto.
- Campo vazio vira `null`, não `""`: string vazia gravaria "sem cidade" como um valor.
- Não há botão de excluir. `DELETE /api/clientes/{id}` existe e é só de ADMIN, mas apagar
  cliente deixa histórico órfão (ver "Buracos conhecidos" no CLAUDE.md do backend) — o caminho
  normal é corrigir o cadastro.
- Os três filtros não são enfeite: **sem UC** não se acha o cliente na agência virtual da
  Coelba, **sem data de pagamento** o cliente não entra na métrica "tempo médio sem ninguém
  mexer", e **sem movimento** é o cliente cadastrado e esquecido — a dor que a planilha
  esconde.
- **Triagem direta na tabela**: quando o cliente está em "Falta checar" (`AGUARDANDO_VERIFICACAO`),
  a analista tem dois botões diretos: **sem pendência** (cria o projeto e segue para consulta de débito)
  ou **apontar pendência** (abre modal para escolher o tipo — Troca de Titularidade, Ligação Nova, etc. —,
  criando a pendência e marcando o cliente como `COM_PENDENCIA` automaticamente, sem precisar navegar
  ao módulo de Pendências e reinserir os dados manualmente).

### Os selos ao lado do nome do cliente (`common/SelosCliente`)

Quatro selos, num componente só porque aparecem em seis módulos: **Prioridade** (âmbar, seta para
cima), **Só pendência** (cinza), **CRM** e **Banco**. Cada um só aparece quando diz algo que muda
o trabalho de quem olha — selo em toda linha vira ruído e deixa de ser informação.

⚠️ **`CRM` e `Banco` vêm prontas do backend**, em `cliente.etiquetas`. A tela não as monta, e é
isso que torna impossível violar o "não duplicar etiquetas caso a operação seja executada
novamente": uma lista derivada a cada leitura não tem como acumular repetição.

A prioridade é **âmbar com seta para cima**, não vermelha: a leitura precisa ser "este subiu na
fila", não "este tem um problema", que é o que a paleta de erro diria. O `title` traz motivo,
data de instalação e observação — é o que decide se a prioridade ainda vale, e quem revisa a fila
precisa disso sem abrir o cadastro.

### Prioridade de cliente (22/09/2026)

O botão de seta para cima em cada linha de Clientes abre o modal de prioridade; um segundo botão
(seta para baixo) encerra. Chamar de novo **revisa** o motivo — não é preciso remover antes, e o
formulário reabre no que já estava valendo, porque revisar é o caso mais comum depois de criar e
obrigar a redigitar o motivo convidaria a trocá-lo por engano.

⚠️ **A data de instalação só aparece com o motivo "Instalação adiantada"**, e ali é obrigatória —
o backend recusa com 409 `PRIORIDADE_SEM_INSTALACAO`. Ela **não é um segundo campo de data de
instalação**: o servidor a copia para `projeto.dataInstalacao`, que é o campo que a etapa de
Vistoria já lia e exigia. Consequência visível: o cliente prioritário por instalação chega à fila
da Vistoria com a data preenchida e o botão de solicitar já liberado.

A ordenação é o resto da regra, e está no `useOrdenacao` — ver "Ordenação das listagens".

### Fluxo "somente pendência" (22/09/2026)

Dois checkboxes no `ClienteModal` desenham o fluxo do cliente: **somente pendência** (avulso do
gestor: entrada → pendência → resolvida → fim, sem projeto) e **Banco** (financiamento). Ficam no
cadastro e não num endpoint de ação porque não são etapas — são o desenho do fluxo daquele
cliente, decidido na entrada. E **desmarcar "somente pendência" é o caminho** para devolver ao
fluxo completo o avulso que virou projeto de verdade.

Na listagem, o cliente avulso com a pendência já resolvida mostra **"Fluxo concluído"** na coluna
de situação. O rótulo é necessário: sem ele, "nenhuma pendência aberta e nenhum projeto" seria
indistinguível de "ninguém fez nada", que é o oposto do que aconteceu. É derivado das pendências
que o `AppContext` já carrega — pedir isso à API custaria uma contagem por linha da listagem.

### Selo "CRM": de onde o cadastro veio (17/09/2026)

Desde que o backend importa clientes do Nectar automaticamente (seção 9 do CLAUDE.md do backend),
a tabela mostra um selo **CRM** ao lado do nome quando `cliente.origem === 'CRM_NECTAR'`. Pedido
do usuário, e não enfeite: **a confiança nos dados é diferente**. O cliente do CRM chega com
cidade e vendedor normalizados contra as listas do cadastro, e o que não casou chega **vazio** —
então campo em branco ali significa "o CRM não tinha o dado no padrão" e pede o preenchimento de
alguém, que é justamente o trabalho da triagem. Num cadastro manual, campo vazio é esquecimento.

Só o cliente do CRM ganha selo: manual é o caso normal, e um selo em toda linha viraria ruído. O
`title` do selo traz o `nectarOportunidadeId`, que é como se acha o negócio no Nectar — necessário
porque **um cliente com vários negócios vira vários cadastros**, com o nome repetido e nada mais
distinguindo as linhas.

⚠️ `origem` e `nectarOportunidadeId` estão **fora** de `DadosCliente`: são procedência, não campos
editáveis. Editar um cadastro não pode fazer um cliente do CRM passar por cadastro manual.

### As listas de municípios e vendedores vêm da API

⚠️ **`src/data/constantes.ts` foi apagado em 17/09/2026.** Os 417 municípios da Bahia e os
vendedores agora vêm de `GET /api/referencias`, carregados uma vez pelo `AppContext` e servidos ao
`ClienteModal` por `useApp().referencias`.

O motivo é o de sempre: a importação do Nectar normaliza cidade e vendedor **no servidor**, contra
o mesmo padrão que este formulário oferece. Com a lista aqui também, seriam duas cópias — e o
problema não é teórico: a primeira importação real entrou com "CACULE", "VITÓRIA DA CONQUISTA" e
"Vitória Da Conquista" como cidades diferentes, e com vendedores ("Rodrigo soares") que o
`<select>` desta tela não oferece. O backend é a fonte de verdade.

Consequência: as listas nascem **vazias** e se preenchem na primeira carga. O campo de município
e o seletor de vendedor aparecem sem opção por um instante — aceitável, e melhor que uma cópia
local que envelhece. Um vendedor novo agora exige deploy do **backend**
(`src/main/resources/referencia/vendedores.txt`), não deste repositório.

## RBAC na interface

O papel vem do login (`useAuth().papel`). **Todos os papéis veem todos os módulos do fluxo, o
Dashboard incluído** (decisão do usuário em 09/09/2026), e o `AppContext` pede as métricas
sempre. Excluir registro é restrito a ADMINISTRADOR; o caminho normal para registro errado é
cancelar por status, que preserva o histórico.

**A exceção é o módulo Usuários & Acesso**, visível só para ADMINISTRADOR e GESTOR: a API
responde 403 para ANALISTA em tudo que a tela faz, e mostrá-la a ele seria oferecer uma porta
que não abre. A sidebar o separa numa seção "Administração", fora dos módulos do fluxo. A tela
não é a proteção — é a conveniência; a proteção é o `@GerenciaUsuarios` do backend.

O que ainda varia por papel é só a **tela de entrada**: gestor e admin abrem no dashboard,
analista na fila de pendências, que é o trabalho dele. Isso é preferência de aterrissagem, não
permissão — o analista chega ao dashboard pela sidebar como em qualquer outro módulo.

### Login e cadastro

Só e-mail e senha. **O login com Google saiu em 16/09/2026** junto com o endpoint no backend, e
com ele o `entrarComGoogle` do `AuthContext`. Não há botão de criar conta, e é de propósito: a
única porta de entrada de gente é a tela de Usuários. Um "criar conta" na tela de login
convidaria a um auto-cadastro que a API recusa.

A senha é obrigatória no cadastro (antes era opcional, porque quem não tinha senha entrava pelo
Google). Contas antigas sem senha aparecem na tela com o aviso de que não conseguem entrar.

### Usuários & Acesso (`UsuariosModule`)

- **A lista vive no módulo, não no `AppContext`.** O contexto carrega o que todas as telas usam,
  e o ANALISTA tomaria 403 nesta rota logo no login, derrubando o carregamento inteiro.
- **Não há botão de excluir.** `DELETE /api/usuarios/{id}` falha com 409 assim que a pessoa
  aparece no `historico_status`, e apagar quem já trabalhou destruiria a auditoria do dashboard.
  Cortar acesso é **desativar**.
- O botão de desativar fica travado na própria linha de quem está logado — a API também recusa,
  mas oferecer o clique só produziria um administrador trancado do lado de fora.
- Um GESTOR não vê a opção ADMINISTRADOR nem consegue editar um administrador. É espelho da
  guarda do backend, não substituto dela.
- Depois de cada mutação, o módulo chama `recarregar()` do contexto: os seletores de responsável
  das outras telas saem deste mesmo cadastro e ficariam desatualizados até o próximo F5.

## Pendências: não há botão de "iniciar"

⚠️ O botão de **play** ("Iniciar Atendimento", `ABERTA → EM_ANDAMENTO`) saiu em 19/09/2026,
decisão do usuário, junto com o status e o endpoint por trás dele. Apontar a pendência na
triagem do cliente **é** iniciá-la: dali o cliente já cai nesta tela e a solicitação já correu
na Coelba. O clique não mudava nada — o tempo de resolução sempre saiu de `solicitadoEm`,
gravado na criação —, e o que ele produzia era pendência parada em "Aberta" por esquecimento,
indistinguível de trabalho que ninguém pegou.

Sobraram três status (`ABERTA` → `RESOLVIDA` | `CANCELADA`), então **"Aberta" é o único estado
ativo** e toda condição de fila da tela é `status === 'ABERTA'`, não mais uma dupla. O andamento
("protocolo aberto na Coelba") vive na observação, que é editável sempre — ver abaixo.

## Pendências: a observação é editável sempre

O modal de detalhe traz a observação num `textarea` com botão de salvar, **em qualquer status**,
inclusive pendência resolvida ou cancelada (pedido do usuário em 16/09/2026). A observação é o
parecer do que aconteceu na Coelba, e é depois de fechar que costuma aparecer o detalhe que
faltava — travá-la ali fazia o registro parar de contar a história justamente quando ela fica
completa.

⚠️ O `PUT /api/pendencias/{id}` **substitui o registro**, então o salvamento manda `tipo` e
`responsavelId` com os valores atuais junto da observação; mandar só o texto apagaria os dois.
Status não está no PUT de propósito, então editar aqui nunca mexe no fluxo.

A listagem não traz a observação (é o DTO de resumo), por isso o modal busca o detalhe sob
demanda e o campo fica desabilitado até ele chegar.

## Design system

Paleta verde da ConectSol, com a **densidade e o baixo contorno** de um painel de dados
(referência visual do appconty, trazida pelo usuário em 09/09/2026): a hierarquia vem da borda de
1px e do tamanho do número, não de sombra e cor de fundo.

**Duas famílias de cor, em `tailwind.config.js`:**

- `solar.*` — a **marca**. Escala 50–950 derivada de `#149911`; primária `#149911`, hover
  `#256D1B`, sidebar `#244F26`, destaque `#1EFC1E` **apenas** para indicador ativo e badge
  "novo", nunca fundo de botão ou texto. Fixa nos dois temas.
- `fundo` / `superficie` / `borda` / `texto` — a **interface**. Apontam para variáveis CSS
  definidas em `src/index.css`, que trocam de valor no `.dark`.

⚠️ **Escreva `bg-superficie`, não `bg-white`; `text-texto-suave`, não `text-[#424342]`.** O modo
escuro era um bloco de ~165 linhas de `html.dark .bg-\[\#F4F6F8\] { … !important }` casando com o
texto literal da classe: funcionava por coincidência de string, e renomear uma classe apagava o
tema sem erro nenhum. O bloco ainda existe no fim do `index.css` como camada de compatibilidade
para os módulos não migrados, agora alimentado pelas variáveis — a meta é ele chegar a zero.

**Primitivos em `src/components/ui/`** — use-os em vez de recopiar classes. Cada um substitui uma
string que estava duplicada em seis módulos (a paginação estava idêntica nos seis, e o botão
primário já tinha divergido entre telas):

`Botao`, `Entrada`/`Selecao`/`AreaDeTexto`/`Campo`, `Tabela` (+`Cabecalho`/`Th`/`Corpo`/`Linha`/
`Td`/`LinhaVazia`/`Ordenavel`), `Paginacao` (com `ITENS_POR_PAGINA`), `CardKPI`,
`AbasSegmentadas`, `BadgeTempo`. Mais `cn()` em `src/utils/cn.ts` (clsx + tailwind-merge).

**Forma:** cards com borda de 1px e **sem sombra** (raio 14px); KPI = rótulo 11px apagado + número
28px; tabelas densas com cabeçalho apagado, sem zebra; abas segmentadas para recortes da mesma
lista; Inter 400/500.

**Modo escuro** (`ThemeContext.tsx`): persistido em `localStorage` (`solarsync_tema`), detecta a
preferência do sistema, alternância no Header e no Login.

### Movimento (19/09/2026)

Fora da tela de login, o sistema não tinha movimento: quatro usos de `animate-*` no projeto
inteiro, e cerca de um em cada cinco `hover:` sem `transition`. Trocar de módulo era um corte
seco. O vocabulário agora está em três lugares, e só três:

- **`tailwind.config.js`** — as curvas (`ease-suave` para o que entra, `ease-saida` para o que
  sai), os três tempos (`duration-120` toque, `duration-180` estado, `duration-320` tela) e os
  keyframes: `esmaecer`/`sair-esmaecer`, `entrar-tela`, `entrar-dialogo`/`sair-dialogo`,
  `entrar-aviso`/`sair-aviso`, `desenhar`, `crescer-x`, `girar-entrada`.
- **`src/index.css`** — o que precisa de CSS de verdade: a cascata `.escalonar` (atraso por
  `nth-child`, 40ms por item), o realce `.elevar-no-hover`, o anel de foco único em
  `:focus-visible`, e a **transição padrão** de `a, button, summary, tr, input, select,
  textarea, [role=button], [role=tab]`.
- os componentes, que só declaram exceções.

⚠️ Três armadilhas que esta implementação encontrou, e que a próxima repetiria:

1. **A transição padrão está em `:where(...)`, de especificidade zero.** É o que deixa qualquer
   componente continuar declarando `transition-colors duration-300` e vencer sem `!important`.
   Num seletor comum ela disputaria com as utilitárias do Tailwind e o resultado dependeria da
   ordem no CSS gerado.
2. **`@keyframes entrar-cartao` vive no `index.css`, não no config.** O Tailwind só emite os
   keyframes de uma animação quando a utilitária `animate-*` correspondente aparece no markup —
   e essa é usada por uma classe CSS (`.escalonar`). Declarada só no config, a regra apontava
   para um `@keyframes` inexistente e a cascata não acontecia, **sem erro em lugar nenhum**.
   Conferido no CSS compilado (`npm run build`, `grep @keyframes dist/assets/*.css`).
3. **O guarda de `prefers-reduced-motion` é global**, e usa `animation-duration: 0.01ms` em vez
   de `animation: none`. Com `fill-mode: both`, `none` devolveria o elemento ao estado inicial —
   opacidade zero —, escondendo metade da interface de quem pediu menos movimento. O bloco antigo
   cobria só `.tela-login`, então tudo acrescentado fora dela ignorava a preferência.

Diálogo e aviso ficam montados durante a saída (`Modal` tem estado `fechando`; `Toast` tem o
seu): antes havia entrada animada e nenhuma saída, e salvar um formulário fazia a janela piscar
para fora.

### Os gráficos do dashboard (`ui/Graficos.tsx`)

⚠️ Os dois eram desenhados à mão dentro do `DashboardModule`, e os dois **mentiam**:

- o de ritmo tinha um `path` SVG de coordenadas fixas no código — a curva era sempre a mesma por
  mais que os números mudassem. Os quatro pontos calculavam um valor a partir dos KPIs, e o valor
  não era usado em lugar nenhum: só a bolinha era desenhada, sempre na mesma altura. Era
  decoração com cara de dado, num painel gerencial;
- o de tipos pintava a **maior** barra de branco — invisível no tema claro (fundo branco) e
  invisível no escuro também, porque o `index.css` reescreve `.bg-white` para a cor da
  superfície. E dava 12% de altura mínima a toda barra, então "zero" desenhava um toco igual
  ao de "um".

O que substituiu, e por quê:

- **`GraficoLinhas`** — duas séries reais, tiradas de `projeto.dataAprovacao` e
  `projeto.dataEncaminhado` pelos baldes de `src/utils/series.ts`. Semanal até ~3 meses de
  recorte, mensal acima disso (com "Todos", 52 colunas semanais viram uma serra ilegível). Tem
  legenda, eixo Y, cruz de leitura com tooltip, navegação por setas do teclado e um `<details>`
  "Ver números" com a tabela — nenhum valor fica trancado atrás do ponteiro do mouse.
- **`GraficoBarrasHorizontais`** — deitado porque os rótulos são longos ("Ampliação de Projeto
  Existente") e em coluna eram cortados. **Uma cor só**: categoria nominal não tem ordem, e
  pintar cada barra de um tom codificaria duas vezes o que o tamanho já diz.
- **`Medidor`** — substituiu a barra verde-contra-âmbar da "Carga por Analista". Aquele par tem
  separação de 3,1 em deuteranopia: a barra inteira virava um bloco só para quem não distingue
  verde de vermelho, e a barra é o que se olha antes de ler os números. Agora é uma cor sobre
  trilho neutro.

⚠️ **`useLargura` (ResizeObserver) não é preciosismo.** O SVG antigo usava
`preserveAspectRatio="none"`, que dá escalas diferentes a X e Y e **transforma todo círculo em
elipse** — era o que deformava os pontos. Não há correção por CSS depois; o jeito é o `viewBox`
ter a largura real do elemento.

**As cores das séries** (`COR_SERIE`) são `#149911` (verde da marca) e `#0B7FBF`. Passam nos seis
testes de paleta categórica nos **dois** temas — banda de luminosidade, piso de croma, separação
para daltonismo (ΔE 23,6, contra o mínimo de 8) e contraste ≥ 3:1 contra as duas superfícies.
Mesmos valores nos dois temas de propósito: o que muda é o fundo, não a identidade da série.

## Ordenação das listagens

`src/hooks/useOrdenacao.ts` + o `Ordenavel` de `ui/Tabela` dão ordenação crescente/decrescente
por coluna em todas as listagens. Cada módulo declara um mapa `VALORES_ORDENAVEIS` (coluna →
como extrair o valor da linha) e uma ordem de abertura, que é a **fila de trabalho** daquela
tela, não a primeira coluna da tabela: Débitos abre pelos mais urgentes, Pendências pela mais
antiga por resolver, Clientes por "falta checar".

Três decisões que a implementação carrega:

- **O cliente prioritário vem antes de tudo.** O `useOrdenacao` aceita uma âncora
  (`prioritario`) que ordena antes da coluna escolhida e **não** é multiplicada pelo sinal da
  direção — inverter a coluna não pode mandar o prioritário para o fim da lista, que é justamente
  onde ele não pode estar. É prefixo, não substituição: dentro de cada grupo a ordenação pedida
  continua valendo.
  <p>
  ⚠️ O backend faz o mesmo na consulta (`common/web/PrioridadePrimeiro`), e as duas pontas
  precisam concordar: se divergissem, paginar no servidor embaralharia a ordem entre uma página e
  outra. Toda listagem que mostra cliente passa a âncora.
- **É no cliente.** O `AppContext` já traz as listas inteiras (dezenas a centenas de linhas), e
  ordenar aqui é instantâneo em vez de uma ida ao servidor por clique. Se o volume crescer a
  ponto de paginar no servidor, é este hook que passa a mandar `sort` na requisição.
- **Status ordena pela ordem do fluxo, não pelo alfabeto** — daí os mapas `PESO_STATUS` nos
  módulos. `APROVADO` antes de `RECEBIDO` numa coluna de status não diria nada a ninguém.
- **Linha vazia vai para o fim nas duas direções.** Inverter a ordem não deveria encher o topo
  da tela de "—"; quem procura o que está faltando usa o filtro.

⚠️ Texto compara com `localeCompare('pt-BR')`, nunca com `<`: sem isso "Ângela" cai depois de
"Zilda". Data ISO ordena certo **como texto** — não converta para `Date`, é a mesma armadilha
descrita abaixo.

O rótulo clicável é `whitespace-nowrap`: com o texto quebrando em duas linhas, a seta ia parar
ao lado do bloco inteiro e parecia solta no meio do cabeçalho. Rótulo de coluna é curto, e a
tabela tem largura — se algum precisar de duas linhas, encurte o rótulo em vez de deixar quebrar.

## A regra do débito futuro mora em `utils/debito.ts`

O backend é quem decide se o projeto pode ir à Coelba (`ProjetoService`), e é lá que a regra tem
de ficar: ela precisa valer também quando a origem não é a tela — a importação da planilha, a
leitura do e-mail, uma integração futura. O que existe aqui é a mesma leitura feita **antes do
clique**, para a analista não descobrir o motivo só depois de tentar enviar.

`bloqueioDoEnvio(debitos)` devolve a função que responde por cliente, com os três motivos na mesma
ordem do servidor: `SEM_CONSULTA` (ninguém olhou a agência virtual), `DEBITO_ATIVO` (o cliente
deve) e `PROXIMO_DEBITO` (está quitado, mas a próxima conta vence em um dia ou menos — a Coelba
analisaria o projeto já com débito em aberto).

⚠️ Está num util, e não dentro do `ProjetosModule` como estava antes, porque o terceiro motivo
nasceria copiado para a tela de Débitos e para a de Vistoria assim que alguém precisasse dele
ali. Um lugar só.

⚠️ **`diasAte` compara datas, não instantes**, e lê os números da string em vez de usar
`new Date('2026-09-23')` — esse construtor lê a data pura como meia-noite **UTC**, que em
`America/Sao_Paulo` é o dia anterior às 21h. Seria um erro de um dia exatamente na faixa em que a
resposta muda de "pode enviar" para "não pode", e que só apareceria à noite. Mesma armadilha
descrita abaixo.

A coluna **"Próximo débito"** da tela de Projetos sai daí, e do débito de **homologação** — o de
pendência pertence a outra etapa e mostrá-lo ali responderia a pergunta errada. Sem data, a
coluna diz **"Não informado"** por extenso, e não um travessão: travessão se lê como "não tem", e
aqui não se sabe.

## Datas

`src/utils/data.ts` é o único lugar que formata data para o usuário: `formatarData`
(`DD/MM/AAAA`), `formatarDataHora` (`DD/MM/AAAA HH:mm`, horário de Brasília), `diasDesde` e
`textoDiasParado`. Antes cada tela renderizava a string ISO crua.

⚠️ **Data pura (`2026-08-20`) não pode passar por `new Date()`**: o construtor a lê como meia-noite
UTC, que em `America/Sao_Paulo` vira **19/08**. `formatarData` quebra a string em vez de construir
um `Date`; só os instantes, que carregam fuso, passam pelo `Intl`.

## Dashboard: os filtros

As pílulas de período **eram enfeite** até 16/09/2026 — mudavam o estado local e o painel
continuava mostrando o histórico inteiro. Agora elas escrevem em `periodoDashboard` do
`AppContext`, que é o que vai para a API, e há duas adições pedidas pelo usuário:

- **Período personalizado**: dois `<input type="date">` que aparecem só no modo
  `PERSONALIZADO`, para não competir com os atalhos. Ponta vazia é "sem limite daquele lado" —
  dá para pedir "tudo até 31/08" sem inventar uma data inicial.
- **Filtro por analista**: a API recorta cada métrica pelo responsável da sua etapa e devolve
  `filtro.analistaNome`, que a tela usa no subtítulo. O rótulo importa: "3 projetos aprovados"
  diz coisas bem diferentes com e sem filtro de pessoa.

⚠️ Os atalhos calculam datas com `hojeISO()`/`somarDiasISO()` de `utils/data.ts`, **não** com
`new Date().toISOString().split('T')[0]`: depois das 21h em Brasília o `toISOString` já está no
dia seguinte em UTC, e o filtro "hoje" traria o dia errado.

Mudar qualquer filtro dispara o `recarregar()` inteiro do contexto, não só o dashboard — é o
preço do `recarregar` único, e por ora é barato.

### ⚠️ Nem tudo na tela vem do `kpis`

Alguns blocos são **derivados das listas** que o `AppContext` já carregou, não da resposta do
dashboard: carga por analista, projetos por tipo, projetos recentes, o total do gráfico de ritmo
e o card "Pendências na Fila". Isso custou um bug encontrado na conferência visual de
16/09/2026: com o filtro de analista ligado, tudo que vinha da API zerava e "Pendências na Fila"
continuava mostrando 5 — metade do painel recortada, metade não, sem nada avisando. É
exatamente o tipo de incoerência que faz o gestor parar de confiar nos números.

A regra que resolveu, e que qualquer bloco novo tem de seguir: **todo derivado parte de
`projetosNoRecorte` / `pendenciasNoRecorte`**, nunca de `projetos` / `pendencias` crus.

Fica uma limitação conhecida: o recorte de **período** não vale para esses derivados, só o de
pessoa. Replicá-lo aqui significaria reimplementar no cliente a regra de que cada métrica tem
a sua data de referência — que é justamente o que o `DashboardRepository` faz. Leia-os como "a
situação de agora, para esta pessoa". Se isso incomodar, a saída é mover os três blocos para a
API, não copiar a lógica de datas para cá.

### "Situação por etapa" (30/09/2026)

Quantos estão parados em cada etapa agora, vindo de `situacaoPorEtapa` da API — **não** é
derivado das listas, justamente pela regra acima. ⚠️ É a exceção consciente ao recorte: a API
ignora período **e** analista nessa seção (o porquê está no `CLAUDE.md` do backend, seção 5), e
por isso ela também foge do `projetosNoRecorte`. O subtítulo do card diz "a equipe inteira, sem
filtro de período"; a faixa de aprovados embaixo dele vem dos quantitativos e segue o período.
O campo é opcional no mapeamento: com uma API anterior, a seção some em vez de quebrar o painel.

## Diálogos: o `Modal` (30/09/2026)

Dois bugs da primeira rodada de uso real, os dois do mesmo componente:

- ⚠️ **O `onClose` não pode entrar em dependência de efeito.** Os módulos passam `onClose`
  inline e guardam o estado do formulário neles mesmos, então cada tecla criava uma função nova;
  com ela nas dependências do efeito de foco, o campo perdia o foco depois de **um** caractere
  em todo diálogo do sistema. Fica numa ref.
- **Portal para o `<body>`**: os módulos vivem dentro do `animate-entrar-tela` do `App`, e
  ancestral com `transform` vira o bloco de contenção do `position: fixed`.

E no `ClienteModal`: o `trim` dos campos é **no envio**, nunca no `onChange` — aparar a cada
tecla comia o espaço digitado ("Vitória da Conquista" não saía). O formulário passou a `3xl` em
duas colunas, e cabe sem rolagem numa tela de notebook de 768px.

## Sessão: só a recusa do servidor desloga (30/09/2026)

`renovarToken` distingue `RECUSADA` (400/401 do `/auth/refresh`) de `INDISPONIVEL` (5xx, 429,
sem conexão). Só a primeira apaga os tokens; a segunda vira `SEM_CONEXAO` e a próxima
requisição tenta de novo. Antes, qualquer falha da renovação deslogava — e com o deploy
automático a API reinicia várias vezes por dia. Mesma regra na abertura (`AuthContext`): só
401/403 do `/auth/eu` limpam a sessão.

## Projetos: "feito, aguardando envio" (30/09/2026)

`AGUARDANDO_ENVIO` aparece como **"Feito, aguardando envio"**, e a ação tem botão na linha da
tabela (ícone `FileCheck2`) para todo projeto `RECEBIDO` — antes ficava só no rodapé do
detalhe, e a equipe concluiu que o sistema não deixava registrar o projeto pronto sem enviá-lo.
Não é oferecida a partir de `REPROVADO`: o envio a partir dali sairia como `ENCAMINHADO`, e o
reenvio sumiria da contagem de reencaminhados.

## Deploy

Escrito em 24/09/2026 e **refeito no mesmo dia** (ver abaixo). O runbook é o `deploy/README.md`
do repositório do backend; a seção 14 do `CLAUDE.md` de lá registra as decisões.

Esta interface e a API são servidas **do mesmo domínio**: o Caddy entrega os estáticos em `/` e
faz proxy de `/api/*` para o backend. A imagem que o Caddy roda sai **deste** repositório — o
`Dockerfile` daqui constrói o `dist` com Node e o copia para dentro de um `caddy:2-alpine`. A
configuração do Caddy não fica aqui: ela é do outro repositório, montada pelo compose. Este
repositório sabe construir a si mesmo; o outro sabe o desenho da pilha.

⚠️ **O desenho anterior mandava esta tela para o Cloudflare Pages**, com a API num subdomínio
`api.`. O Pages dava CDN e build automático de graça, mas comprava um problema: duas origens
significam CORS, e errar a lista de origens no servidor é o modo de falhar mais confuso que
existe aqui — a tela carrega perfeitamente, nenhuma requisição funciona, e o erro só aparece no
console do navegador, porque do lado da API a requisição nem chega a ser processada. O CDN, em
troca, quase não paga: acelera só o primeiro carregamento, já que toda interação depois vai ao
servidor de qualquer jeito.

O que isso exigiu em `src/api/client.ts`:

- **`BASE_URL` é vazio em produção** — `import.meta.env.VITE_API_URL ?? (DEV ?
  'http://localhost:8080' : '')`. Em desenvolvimento o Vite serve na 5173 e o backend na 8080,
  que são origens diferentes de verdade, daí o endereço explícito continuar lá.
- **`montarUrl` passa `window.location.origin` como base** do `new URL`. Sem a base, um caminho
  relativo estoura com "Invalid URL"; com ela, `BASE_URL` vazio vira caminho relativo e um
  `BASE_URL` absoluto continua ganhando. É a linha que faz as duas situações conviverem.
- `VITE_API_URL` continua existindo e continua sendo lida **no build**, não em tempo de execução.
  A diferença é que agora ninguém precisa dela — e por isso o `Dockerfile` não a define.

O Caddy faz `try_files {path} /index.html`. Hoje nada depende disso, porque a navegação entre
módulos é estado e não URL; está lá para o dia em que entrar um roteador, senão o sintoma seria
404 em toda página recarregada — e ele não apontaria para o servidor.

⚠️ O `index.html` vai com `Cache-Control: no-cache` e os arquivos de `/assets` com `immutable`.
É o par que faz um deploy aparecer na hora: o index é quem aponta para os bundles com hash no
nome, então um index velho em cache serve a versão anterior do sistema inteiro — e a pessoa vê um
bug já corrigido sem ter como saber por quê.

## Pendente

- **Botão de reportar problema** (item 8 do checklist de produção do backend).
- **Recarregar só o dashboard** quando muda um filtro dele, em vez de todas as listas.
- **Mover para a API os blocos derivados do dashboard** (carga por analista, projetos por tipo,
  projetos recentes), para eles passarem a respeitar o filtro de período como o resto da tela.
- **Senha dos analistas semeados**: Ivan, Larissa e Camila existem sem senha e não conseguem
  entrar. Definir uma para cada em Usuários & Acesso é trabalho de quem administra, não de
  migration — semear senha no repositório é o que o checklist de produção proíbe.
