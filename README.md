# Backend - Sistema de Pedidos (Personalizações Almeida)

Este repositório contém o frontend (páginas HTML/JS) e um backend mínimo em Node.js/Express com MongoDB (Mongoose) para persistência de clientes e pedidos.

Resumo do que foi adicionado:

- `js/server.js`  -> servidor Express com modelos `Cliente` e `Pedido` e rotas REST (`/api/clientes`, `/api/pedidos`).
- `package.json` -> dependências e scripts (`npm start`, `npm run dev`).
- `.env.example` -> template para configurar `MONGO_URI`.

Instalação e execução (Windows / PowerShell):

1. Instale dependências:

```powershell
cd "c:\Users\Junior\OneDrive\Desktop\Projeto real\sistema-pedidos-personalizacao-almeida"
npm install
```

2. Configure a conexão com o MongoDB:

- Renomeie `.env.example` para `.env` e preencha `MONGO_URI` com sua string do MongoDB Atlas.

3. Inicie o servidor:

```powershell
npm run dev   # se quiser usar nodemon (reinicia automaticamente)
# ou
npm start
```

API disponível em: `http://localhost:3000`

Principais endpoints:

- `GET /api/pedidos` - lista todos pedidos
- `POST /api/pedidos` - cria um novo pedido (o corpo aceita os mesmos campos do formulário)
- `GET /api/pedidos/:id` - busca por _id Mongo ou `legacyId` numérico
- `PUT /api/pedidos/:id` - atualiza (aceita _id ou legacyId)
- `DELETE /api/pedidos/:id` - exclui (aceita _id ou legacyId)

Observações e próximos passos sugeridos:

- Hoje o frontend continua salvando em `localStorage` por padrão; ao salvar um pedido o sistema tenta sincronizar com o backend.
- Recomendo conectar com MongoDB Atlas (`MONGO_URI`) para persistência na nuvem.
- Melhorias possíveis: sincronização bidirecional, tratamento de conflitos, autenticação e UI para gerenciar clientes no backend.
