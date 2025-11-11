# ⚡ DEPLOY RÁPIDO - 5 Minutos

## ✅ Acabei de corrigir o código! Agora faça isso:

### 1️⃣ No Vercel (se já tem projeto):
Opção A - **Redeploy Simples:**
1. Acesse: https://vercel.com/dashboard
2. Clique no seu projeto
3. Vá em **Deployments**
4. Clique no último deployment
5. Clique nos 3 pontinhos `...`
6. Clique em **Redeploy**
7. Aguarde o deploy terminar

**OU**

Opção B - **Começar do Zero (recomendado):**
1. Delete o projeto antigo no Vercel
2. Clique em **Add New...** → **Project**
3. Import do GitHub: `sergio-pj/sistema-pedidos-personalizacao-almeida`
4. Continue no passo 2 abaixo ⬇️

---

### 2️⃣ Configurar Variáveis de Ambiente (OBRIGATÓRIO)

**No Vercel, antes ou depois do deploy:**
1. Vá em **Settings** → **Environment Variables**
2. Adicione estas 3 variáveis:

| Nome | Valor | Como obter |
|------|-------|------------|
| `MONGO_URI` | `mongodb+srv://...` | Veja passo 3 abaixo ⬇️ |
| `JWT_SECRET` | Gere com crypto | Veja passo 4 abaixo ⬇️ |
| `PORT` | `3000` | Digite `3000` |

3. Clique em **Save** para cada uma
4. Faça **Redeploy** se já tinha feito deploy antes

---

### 3️⃣ MongoDB Atlas - String de Conexão

**Se JÁ TEM MongoDB configurado:**
- Copie sua string: `mongodb+srv://usuario:senha@cluster.mongodb.net/pedidos_db?retryWrites=true&w=majority`
- Cole no Vercel como `MONGO_URI`

**Se NÃO TEM MongoDB:**
1. Acesse: https://www.mongodb.com/cloud/atlas
2. Crie conta grátis
3. Crie cluster M0 FREE
4. Em **Security**:
   - Crie usuário (guarde a senha!)
   - Network Access → Add IP → `0.0.0.0/0`
5. Clique em **Connect** → **Connect your application**
6. Copie a string e substitua `<password>` pela sua senha
7. Adicione o nome do banco: `/pedidos_db?` antes dos parâmetros
8. Cole no Vercel

---

### 4️⃣ Gerar JWT_SECRET

Abra o **PowerShell** ou **Terminal** e rode:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copie o resultado gigante que aparecer e cole no Vercel como `JWT_SECRET`.

---

### 5️⃣ Testar se Funcionou

Após o deploy terminar:

1. **Teste a API:**
   ```
   https://seu-projeto.vercel.app/api
   ```
   Deve aparecer: `{"status":"ok","message":"API está funcionando!"}`

2. **Crie sua conta:**
   - Acesse: `https://seu-projeto.vercel.app/cadastro.html`
   - Preencha e clique em **Cadastrar**

3. **Faça login:**
   - Acesse: `https://seu-projeto.vercel.app/login.html`
   - Use email e senha que criou

✅ **Se entrou no Dashboard, está funcionando!**

---

## 🔧 Se der erro 404 ainda:

1. **Verifique se as variáveis de ambiente estão configuradas:**
   - Vercel → Settings → Environment Variables
   - Deve ter: `MONGO_URI`, `JWT_SECRET`, `PORT`

2. **Veja os logs do erro:**
   - Vercel → Functions → api/index → Logs
   - Vai mostrar o erro exato

3. **Teste a conexão do MongoDB:**
   - Verifique se o IP `0.0.0.0/0` está liberado
   - Verifique se a senha está correta na `MONGO_URI`

4. **Limpe o cache e refaça deploy:**
   - Deployments → último → `...` → Redeploy

---

## 📱 URL do Projeto

Depois do deploy, sua URL será algo como:
```
https://sistema-pedidos-almeida.vercel.app
```

Cole essa URL no navegador e comece a usar! 🚀

---

## ⚠️ IMPORTANTE

✅ **Acabei de fazer as seguintes correções no código:**
- Criei `api/index.js` para funcionar como Serverless Function no Vercel
- Corrigi o `vercel.json` para a configuração correta
- Removi erros que causavam o 404

✅ **O código já está no GitHub, basta fazer o deploy!**

---

**Qualquer dúvida, veja o guia completo:** `GUIA-DEPLOY-COMPLETO.md`
