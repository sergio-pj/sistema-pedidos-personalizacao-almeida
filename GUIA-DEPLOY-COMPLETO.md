# 🚀 GUIA COMPLETO - Deploy no Vercel (Passo a Passo)

## ✅ PASSO 1: Limpar Deploys Antigos (OPCIONAL)

Se quiser começar do zero:

1. Acesse: https://vercel.com/dashboard
2. Encontre o projeto `sistema-pedidos-personalizacao-almeida`
3. Clique em **Settings** (Configurações)
4. Role até o final da página
5. Clique em **Delete Project** (Deletar Projeto)
6. Digite o nome do projeto para confirmar
7. Clique em **Delete**

---

## ✅ PASSO 2: Criar MongoDB Atlas (Se não tiver)

### 2.1 - Criar Conta
1. Acesse: https://www.mongodb.com/cloud/atlas
2. Clique em **Try Free** (Experimente Grátis)
3. Crie uma conta (pode usar Google/GitHub)

### 2.2 - Criar Cluster Gratuito
1. Escolha **M0 FREE** (Cluster Gratuito)
2. Escolha **AWS** e região **São Paulo (sa-east-1)** ou mais próxima
3. Nome do cluster: `Cluster0` (padrão)
4. Clique em **Create Cluster**

### 2.3 - Criar Usuário de Banco de Dados
1. Na tela que aparecer, em **Security Quickstart**:
   - **Username:** `admin` (ou o que você quiser)
   - **Password:** Clique em **Autogenerate Secure Password** e COPIE a senha
   - ⚠️ **GUARDE ESSA SENHA!**
2. Clique em **Create User**

### 2.4 - Liberar Acesso (IP Whitelist)
1. Em **Where would you like to connect from?**
2. Clique em **Add My Current IP Address**
3. **IMPORTANTE:** Clique em **Add Entry** e adicione:
   - IP: `0.0.0.0/0`
   - Description: `Allow all (Vercel)`
   - Clique em **Add Entry**
4. Clique em **Finish and Close**

### 2.5 - Copiar String de Conexão
1. Clique em **Connect** no seu cluster
2. Escolha **Connect your application**
3. Copie a string que aparece (parecida com):
   ```
   mongodb+srv://admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Substitua `<password>` pela senha que você copiou no passo 2.3
   5. Adicione o nome do banco no final, antes do `?`:
   ```
   mongodb+srv://admin:SUA_SENHA@cluster0.xxxxx.mongodb.net/pedidos_db?retryWrites=true&w=majority
   ```
6. **GUARDE ESSA STRING!** Você vai precisar no Vercel

---

## ✅ PASSO 3: Importar Projeto no Vercel

### 3.1 - Acessar Vercel
1. Acesse: https://vercel.com/
2. Faça login (use GitHub para facilitar)

### 3.2 - Importar do GitHub
1. Clique em **Add New...** → **Project**
2. Na lista de repositórios, encontre:
   `sergio-pj/sistema-pedidos-personalizacao-almeida`
3. Clique em **Import**

### 3.3 - Configurar o Projeto
Na tela de configuração:

1. **Project Name:** `sistema-pedidos-almeida` (ou deixe o padrão)
2. **Framework Preset:** `Other` (deixe assim)
3. **Root Directory:** `.` (deixe assim)
4. **Build Command:** deixe vazio
5. **Output Directory:** deixe vazio
6. **Install Command:** `npm install`

### 3.4 - **IMPORTANTE: Adicionar Variáveis de Ambiente**

Ainda na mesma tela, role até **Environment Variables**:

#### Variável 1: MONGO_URI
- **Name:** `MONGO_URI`
- **Value:** Cole aqui a string que você copiou no passo 2.5
  - Exemplo: `mongodb+srv://admin:SuaSenha@cluster0.xxxxx.mongodb.net/pedidos_db?retryWrites=true&w=majority`
- Clique em **Add**

#### Variável 2: JWT_SECRET
- **Name:** `JWT_SECRET`
- **Value:** Cole uma chave aleatória forte (veja abaixo como gerar)
- Clique em **Add**

**Para gerar JWT_SECRET:**
Abra o terminal/PowerShell e rode:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Copie o resultado e cole como valor de JWT_SECRET.

#### Variável 3: PORT
- **Name:** `PORT`
- **Value:** `3000`
- Clique em **Add**

### 3.5 - Fazer Deploy
1. Após adicionar as 3 variáveis, clique em **Deploy**
2. Aguarde o deploy (pode levar 2-3 minutos)
3. Quando aparecer "🎉 Congratulations!", clique em **Visit**

---

## ✅ PASSO 4: Testar se Funcionou

### 4.1 - Testar a API
Acesse no navegador:
```
https://seu-projeto.vercel.app/api/pedidos
```

**Resultado esperado:** 
```json
{"message": "Acesso negado. Token não fornecido."}
```

✅ **Se aparecer essa mensagem, a API está funcionando!**

❌ **Se aparecer erro 404 ou 500, volte ao Passo 3 e revise as variáveis de ambiente**

### 4.2 - Criar sua Conta
1. Acesse: `https://seu-projeto.vercel.app/cadastro.html`
2. Preencha:
   - Nome do Administrador
   - Email
   - Senha
3. Clique em **Cadastrar**

### 4.3 - Fazer Login
1. Acesse: `https://seu-projeto.vercel.app/login.html`
2. Use o email e senha que você criou
3. Clique em **Entrar**

✅ **Se entrou no Dashboard, está tudo funcionando!**

---

## 🔧 Troubleshooting (Resolver Problemas)

### ❌ Erro: "Erro ao conectar com o servidor"

**Possíveis causas:**

1. **Variáveis de ambiente não configuradas**
   - Solução: Vá em Vercel → Settings → Environment Variables
   - Verifique se `MONGO_URI`, `JWT_SECRET` e `PORT` estão lá
   - Se não estiverem, adicione e faça **Redeploy**

2. **MONGO_URI incorreta**
   - Solução: Verifique se substituiu `<password>` pela senha real
   - Verifique se tem `/pedidos_db?` antes dos parâmetros
   - Teste a conexão no MongoDB Compass

3. **IP não liberado no MongoDB**
   - Solução: MongoDB Atlas → Network Access → Add IP Address
   - Adicione `0.0.0.0/0` para liberar todos os IPs

### ❌ Erro: "Token inválido" ou "Unauthorized"

**Solução:**
1. Faça logout (limpe o localStorage do navegador)
2. Crie uma nova conta em `/cadastro.html`
3. Faça login novamente

### ❌ Página carrega mas API não funciona (erro 404)

**Solução:**
1. Verifique se o arquivo `vercel.json` está correto
2. Vá em Vercel → Settings → General → Root Directory
3. Certifique-se que está como `./` (raiz)
4. Faça **Redeploy**

### ❌ Erro: "Function Execution Timeout"

**Solução:**
1. Problema de conexão lenta com MongoDB
2. Verifique se escolheu região próxima no MongoDB Atlas
3. Considere upgrade do plano Vercel se necessário

---

## 📱 Como Fazer Redeploy

Se você fez alterações no código:

### Via Git:
```bash
git add .
git commit -m "Suas alterações"
git push
```
O Vercel vai fazer deploy automático!

### Via Vercel Dashboard:
1. Vá em https://vercel.com/dashboard
2. Clique no seu projeto
3. Vá em **Deployments**
4. Clique nos 3 pontinhos do último deploy
5. Clique em **Redeploy**

---

## 🎯 Checklist Final

Antes de dar por concluído, verifique:

- [ ] MongoDB Atlas criado e funcionando
- [ ] IP `0.0.0.0/0` liberado no Network Access
- [ ] String MONGO_URI copiada e senha substituída
- [ ] JWT_SECRET gerado com node crypto
- [ ] Variáveis de ambiente adicionadas no Vercel
- [ ] Deploy concluído sem erros
- [ ] `/api/pedidos` retorna erro 401 (esperado)
- [ ] Conseguiu criar conta em `/cadastro.html`
- [ ] Conseguiu fazer login em `/login.html`
- [ ] Dashboard carrega corretamente

✅ **Se todos os itens estão marcados, seu sistema está funcionando!**

---

## 🆘 Precisa de Ajuda?

Se mesmo seguindo todos os passos não funcionar:

1. Verifique os **Logs** no Vercel:
   - Dashboard → Seu Projeto → Functions → server/server.js → Logs
   
2. Teste localmente primeiro:
   ```bash
   npm install
   npm run dev
   ```
   Acesse `http://localhost:3000`

3. Use o console do navegador (F12) para ver erros JavaScript

---

**Boa sorte! 🚀**
