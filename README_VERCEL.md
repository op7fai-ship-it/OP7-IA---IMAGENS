# OP7 IA - IMAGENS (Configuração de Produção)

Para que o sistema funcione corretamente na Vercel (Produção), siga estes passos:

### 1. Configurar Variável de Ambiente
O backend depende da chave do Gemini para funcionar.
1. Vá para o painel da **Vercel** > Seu Projeto.
2. Clique em **Settings** > **Environment Variables**.
3. Adicione a seguinte variável:
   - **Key:** `GEMINI_API_KEY`
   - **Value:** `SUA_CHAVE_AQUI` (Obtenha em: [aistudio.google.com](https://aistudio.google.com/app/apikey))
4. Certifique-se de marcar as opções **Production**, **Preview** e **Development**.
5. Clique em **Save**.

### 2. Realizar um Novo Deploy
Após salvar a variável, ela só entrará em vigor em um novo build.
1. Vá na aba **Deployments**.
2. Clique nos três pontinhos do deploy mais recente e selecione **Redeploy** (ou faça um novo push no GitHub).

---

### Notas Técnicas
- **Segurança:** A chave nunca é exposta ao frontend. O navegador chama apenas `/api/generate`.
- **Backend:** O endpoint utiliza o runtime `nodejs` para garantir estabilidade.
- **Limites:** Verifique os limites da sua chave (Free Tier tem limites de RPM).
