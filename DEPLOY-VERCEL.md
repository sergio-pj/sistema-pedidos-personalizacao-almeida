# 🚀 Como Fazer Deploy no Vercel

## ⚠️ IMPORTANTE: Configurar Variáveis de Ambiente

Antes de fazer deploy, você **PRECISA** configurar as variáveis de ambiente no Vercel:

### 1. Acesse o Painel do Vercel
1. Vá em https://vercel.com/dashboard
2. Selecione seu projeto: `sistema-pedidos-personalizacao-almeida`
3. Clique em **Settings** (Configurações)
4. Clique em **Environment Variables** (Variáveis de Ambiente)

### 2. Adicione as Variáveis de Ambiente

Adicione estas 3 variáveis:

#### MONGO_URI
- **Name:** `MONGO_URI`
- **Value:** Sua string de conexão do MongoDB Atlas
  - Exemplo: `mongodb+srv://usuario:senha@cluster0.mongodb.net/pedidos_db?retryWrites=true&w=majority`
- **Environment:** Production, Preview, Development (marque todos)

#### JWT_SECRET
- **Name:** `JWT_SECRET`
- **Value:** Uma chave secreta forte (veja abaixo como gerar)
- **Environment:** Production, Preview, Development (marque todos)

Para gerar uma chave JWT segura, rode no seu terminal:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### PORT
- **Name:** `PORT`
- **Value:** `3000`
- **Environment:** Production, Preview, Development (marque todos)

### 3. Como Obter a String do MongoDB Atlas

Se você ainda não tem:

1. Acesse https://www.mongodb.com/cloud/atlas
2. Crie uma conta gratuita
3. Crie um **Cluster Gratuito (Free Tier)**
4. Clique em **Connect**
5. Escolha **Connect your application**
6. Copie a string de conexão
7. Substitua `<password>` pela sua senha
8. Substitua `<dbname>` por `pedidos_db` (ou outro nome)

### 4. Deploy

Depois de configurar as variáveis de ambiente:

```bash
# Faça commit das mudanças
git add .
git commit -m "Configurar backend para Vercel"
git push

# O Vercel vai fazer deploy automaticamente!
```

### 5. Verificar se Funcionou

Após o deploy, acesse:
- `https://seu-projeto.vercel.app` - deve carregar o site
- `https://seu-projeto.vercel.app/api/pedidos` - deve retornar 401 (sem autenticação)

Se retornar 401, significa que a API está funcionando! ✅

### 6. Primeiro Acesso

1. Acesse `https://seu-projeto.vercel.app/cadastro.html`
2. Crie sua conta de administrador
3. Faça login em `https://seu-projeto.vercel.app/login.html`
4. Comece a usar! 🎉

## 🔍 Troubleshooting

### Erro: "Erro ao conectar com o servidor"
- ✅ Verifique se as variáveis de ambiente estão configuradas no Vercel
- ✅ Verifique se a `MONGO_URI` está correta
- ✅ Verifique se o IP do Vercel está na whitelist do MongoDB Atlas
  - No MongoDB Atlas: Network Access → Add IP Address → Allow Access from Anywhere (`0.0.0.0/0`)

### Erro: "Token inválido"
- ✅ Verifique se o `JWT_SECRET` está configurado no Vercel
- ✅ Tente fazer logout e login novamente

### Frontend carrega mas API não funciona
- ✅ Verifique os logs do Vercel (Functions → server/server.js → Logs)
- ✅ Verifique se o arquivo `vercel.json` está correto

## 📱 Testar Localmente Antes

Antes de fazer deploy, teste localmente:

```bash
# 1. Configure o .env
cp .env.example .env
# Edite o .env com suas credenciais

# 2. Instale as dependências
npm install

# 3. Rode o servidor
npm run dev

# 4. Acesse http://localhost:3000
```

Se funcionar localmente, vai funcionar no Vercel! ✅
