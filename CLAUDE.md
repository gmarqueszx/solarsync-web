# SolarSync — frontend (`solarsync-front`)

Interface do SolarSync, o sistema que substitui a planilha de 18 abas com que a ConectSol
controla a homologação de projetos solares na Coelba.

**Este documento cobre o frontend.** O contexto de negócio, o modelo de domínio e as regras do
fluxo vivem no `CLAUDE.md` do repositório do backend (`solarsync`) — a fonte de verdade é lá, e
duplicá-la aqui só criaria duas versões divergentes (foi o que aconteceu com a cópia anterior
deste arquivo).

## Stack

React 18 + TypeScript + Vite + Tailwind. Ícones: `lucide-react`. Sem router: a navegação entre
módulos é estado no `AppContext`, o que basta para uma aplicação de seis telas atrás de login.
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

### Erros e feedback

O `AppContext` já mostra toast de sucesso e, no erro, a mensagem que a API devolveu — inclusive
as regras de negócio, que chegam como 409 com texto pronto:

| `codigo` | Significa |
|---|---|
| `CLIENTE_COM_DEBITO` | não dá para encaminhar à Coelba enquanto o cliente deve |
| `PROJETO_SEM_INSTALACAO` | vistoria exige a data de instalação registrada antes |
| `TRANSICAO_INVALIDA` | o status atual não permite aquela mudança |
| `ACESSO_NEGADO` | o papel do usuário não permite a ação |

Componentes **não** devem mostrar toast próprio depois de uma mutação: duplicaria a mensagem.

## RBAC na interface

O papel vem do login (`useAuth().papel`). ANALISTA não vê o Dashboard — e não é só a sidebar
que esconde: a API responde 403, então o `AppContext` nem pede as métricas. Excluir registro é
restrito a ADMINISTRADOR; o caminho normal para registro errado é cancelar por status, que
preserva o histórico.

## Design system

Estilo Navan em paleta verde, já configurado em `tailwind.config.js` como `solar.*`:

- primária `#149911`, hover `#256D1B`, sidebar `#244F26`, neutro `#424342`
- destaque `#1EFC1E` **apenas** para indicador ativo e badge "novo" — nunca fundo de botão ou texto
- superfície branca, fundo `#F4F6F8`, quase-preto `#13151A`
- Inter, pesos 400/500; cards com raio 14px; tabelas com divisores sutis; status em badge pílula

## Pendente

- **Login com Google**: a API já tem `POST /api/auth/login/google` e o `AuthContext` já expõe
  `entrarComGoogle(idToken)`. Falta o botão do Google Identity Services na tela de login, que
  depende de criar o OAuth Client ID no Google Cloud.
- **Botão de reportar problema** (item 8 do checklist de produção do backend).
