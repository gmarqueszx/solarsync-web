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

Os dois primeiros são recusas **diferentes** de propósito, e as telas antecipam qual será
(`bloqueioDaResolucao` em Pendências, `bloqueioDoEnvio` em Projetos) em vez de deixar o analista
descobrir clicando. Juntá-los mandaria cobrar um cliente que talvez não deva nada.

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
| `PENDENCIA` | há pendência `ABERTA`/`EM_ANDAMENTO` do cliente |
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

## Ordenação das listagens

`src/hooks/useOrdenacao.ts` + o `Ordenavel` de `ui/Tabela` dão ordenação crescente/decrescente
por coluna em todas as listagens. Cada módulo declara um mapa `VALORES_ORDENAVEIS` (coluna →
como extrair o valor da linha) e uma ordem de abertura, que é a **fila de trabalho** daquela
tela, não a primeira coluna da tabela: Débitos abre pelos mais urgentes, Pendências pela mais
antiga por resolver, Clientes por "falta checar".

Três decisões que a implementação carrega:

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

## Pendente

- **Botão de reportar problema** (item 8 do checklist de produção do backend).
- **Recarregar só o dashboard** quando muda um filtro dele, em vez de todas as listas.
- **Mover para a API os blocos derivados do dashboard** (carga por analista, projetos por tipo,
  projetos recentes), para eles passarem a respeitar o filtro de período como o resto da tela.
- **Senha dos analistas semeados**: Ivan, Larissa e Camila existem sem senha e não conseguem
  entrar. Definir uma para cada em Usuários & Acesso é trabalho de quem administra, não de
  migration — semear senha no repositório é o que o checklist de produção proíbe.
