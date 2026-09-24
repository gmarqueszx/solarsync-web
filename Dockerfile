# Imagem que serve o SolarSync: os estáticos desta interface dentro de um Caddy.
#
# Duas etapas: a primeira constrói com Node, a segunda carrega só o Caddy e o `dist`. A imagem
# final não tem Node, npm nem node_modules — ela tem três arquivos e um servidor.
#
# ⚠️ Este Caddy é o MESMO que termina o TLS e faz proxy de `/api/*` para o backend. A
# configuração dele não está aqui: é o `deploy/Caddyfile` do repositório solarsync, montado pelo
# compose. Aqui ficam só os arquivos a servir — este repositório sabe construir a si mesmo, e o
# outro sabe o desenho da pilha.

FROM node:22-alpine AS build
WORKDIR /app

# O manifesto vem sozinho primeiro para que o `npm ci` vire uma camada própria: mexer em código
# não refaz a instalação das dependências.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Sem VITE_API_URL de propósito. A tela e a API são servidas no mesmo domínio, então o cliente
# HTTP usa caminho relativo (`src/api/client.ts`) — não há endereço para embutir, e portanto não
# há o build a refazer quando o domínio muda.
RUN npm run build


FROM caddy:2-alpine
COPY --from=build /app/dist /srv
