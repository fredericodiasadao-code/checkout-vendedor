# CHECKOUT VENDEDOR — Instruções de Desenvolvimento

## Objetivo
Transformar a página de checkout em uma **single-page checkout completa**, onde o cliente preenche dados e efetua compra **sem sair da página**. Remover botão externo. Checkout integrado na parte inferior.

---

## Status Atual
✅ Estrutura HTML/CSS pronta  
✅ Setas de navegação funcionando  
❌ Botão de checkout externo (REMOVER)  
❌ Formulário de compra não existe  
❌ Integração de pagamento não existe  

---

## Estrutura da Página (atual)

```
1. Hero/Intro (setas de navegação)
2. Módulos/Ofertas (setas de navegação)
3. Depoimentos (setas de navegação)
4. CTA com botão "Ir para Checkout" (PROBLEMA: leva para externa)
   ↓
[NOVO] Formulário de Checkout Integrado (ADICIONAR AQUI)
```

---

## O Que Fazer

### 1. Remover Botão de Checkout Externo
- Deletar elemento com class/id que contém `href` externo  
- Manter apenas o CTA visual (texto incentivador, imagens, etc)
- **Não deixar botão nenhum apontando para fora da página**

### 2. Adicionar Formulário de Checkout Integrado (Final da Página)

**Localização:** Logo após a última seção de conteúdo, antes do footer  
**Comportamento:** 
- Fixo/visível ao scroll
- Smooth scroll até o checkout quando usuário chegar no fim da página
- Responsivo (mobile: largura 100%, desktop: max-width 600px, centrado)

**Campos obrigatórios:**
```
├─ Nome Completo
├─ Email
├─ CPF
├─ Telefone (WhatsApp)
├─ Endereço (Rua, Número, Complemento, CEP)
├─ Cidade / Estado
├─ Opção de Pagamento (Cartão / PIX)
│  ├─ Se Cartão: Número, Validade, CVC, Nome Titular
│  └─ Se PIX: Chave PIX (ler da config)
└─ Checkbox: "Concordo com Termos"
```

**Botão:** "Confirmar Compra" (verde, destaque, +20px padding)

---

## Integração de Pagamento

### PIX (Recomendado)
- Usar **Hotmart** ou **Kiwify** (já existe conta?)
- API para gerar QR code dinâmico
- Endpoint: `/api/generate-pix`
- Resposta: `{ qrCode: "base64", expiresIn: 300 }`
- Cliente escaneia e paga via app bancário
- Webhook confirma pagamento → redireciona para página de sucesso

### Cartão de Crédito (Opcional - Fase 2)
- Stripe / 2Checkout
- Tokenizar dados (nunca enviar raw para servidor)
- Endpoint: `/api/charge-card`

---

## Fluxo de Compra (UX)

```
1. Cliente preenche formulário
2. Clica "Confirmar Compra"
3. Se PIX:
   a. Modal aparece com QR code
   b. Texto: "Escaneie com seu banco ou app de PIX"
   c. Spinner: aguardando confirmação
   d. Webhook recebe pagamento
   e. Redireciona para página de sucesso/obrigado
4. Se Cartão:
   a. Submit seguro via Stripe
   b. Aguarda resposta
   c. Mesmo fluxo de sucesso/erro
```

---

## Validações (Client + Server)

**Client-side (imediato, sem envio):**
- Nome: mín 3 caracteres, sem números
- Email: validar formato
- CPF: validar dígitos verificadores
- Telefone: mín 11 dígitos
- CEP: formato 00000-000
- Checkbox: deve estar marcado
- Tipo de pagamento: deve ser selecionado

**Server-side (antes de processar):**
- Verificar duplicação de CPF/Email (não permitir 2x mesma pessoa em 5min)
- Validar CEP em API externa (ViaCEP)
- Verificar limite de transações por IP (anti-fraud básico)
- Hash de CPF + Email como chave única de sessão

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/main.js` | **MODIFICAR** | Remover listener do botão externo, adicionar handler do form |
| `src/checkout-form.js` | **CRIAR** | Validação + submit do formulário |
| `src/pix-handler.js` | **CRIAR** | Integração PIX (gerar QR, aguardar webhook) |
| `index.html` | **MODIFICAR** | Remover botão externo, adicionar `<form id="checkout">` |
| `src/styles.css` | **MODIFICAR** | Estilizar formulário, modal PIX, estados de loading |
| `api/checkout.mjs` | **CRIAR** | Endpoint para processar formulário → Hotmart/Kiwify |
| `api/webhook-pix.mjs` | **CRIAR** | Receber confirmação de pagamento do Hotmart/Kiwify |

---

## Estrutura HTML do Checkout

```html
<!-- REMOVER ISTO: -->
<!-- <a href="https://checkout-externo.com" class="btn-checkout">Ir para Checkout</a> -->

<!-- ADICIONAR ISTO: -->
<section id="checkout-section" class="checkout-container">
  <h2>Finalize Sua Compra</h2>
  <p>Preencha seus dados e escolha a forma de pagamento</p>
  
  <form id="checkout-form">
    <!-- Dados Pessoais -->
    <fieldset>
      <legend>Dados Pessoais</legend>
      <input type="text" name="nome" placeholder="Nome Completo" required>
      <input type="email" name="email" placeholder="Email" required>
      <input type="text" name="cpf" placeholder="CPF (000.000.000-00)" required>
      <input type="tel" name="telefone" placeholder="WhatsApp (11 99999-9999)" required>
    </fieldset>

    <!-- Endereço -->
    <fieldset>
      <legend>Endereço de Entrega</legend>
      <input type="text" name="cep" placeholder="CEP (00000-000)" required>
      <input type="text" name="rua" placeholder="Rua" required>
      <input type="text" name="numero" placeholder="Número" required>
      <input type="text" name="complemento" placeholder="Complemento (opcional)">
      <input type="text" name="cidade" placeholder="Cidade" required>
      <select name="estado" required>
        <option>Estado</option>
        <option>SP</option>
        <option>RJ</option>
        <!-- ... outros estados -->
      </select>
    </fieldset>

    <!-- Pagamento -->
    <fieldset>
      <legend>Forma de Pagamento</legend>
      <label>
        <input type="radio" name="pagamento" value="pix" checked>
        PIX (Recomendado - Instântaneo)
      </label>
      <label>
        <input type="radio" name="pagamento" value="cartao">
        Cartão de Crédito
      </label>
    </fieldset>

    <!-- Cartão (oculto até seleção) -->
    <fieldset id="cartao-fields" style="display:none;">
      <legend>Dados do Cartão</legend>
      <input type="text" name="cartao_numero" placeholder="Número do Cartão" maxlength="19">
      <input type="text" name="cartao_validade" placeholder="MM/YY" maxlength="5">
      <input type="text" name="cartao_cvc" placeholder="CVC" maxlength="3">
      <input type="text" name="cartao_titular" placeholder="Nome do Titular">
    </fieldset>

    <!-- Termos -->
    <label>
      <input type="checkbox" name="termos" required>
      Concordo com os <a href="/termos">Termos de Uso</a>
    </label>

    <!-- Botão -->
    <button type="submit" class="btn-comprar" data-loading="Processando...">
      Confirmar Compra
    </button>

    <!-- Spinner oculto -->
    <div class="spinner" id="checkout-spinner" style="display:none;">
      Processando pagamento...
    </div>
  </form>

  <!-- Modal PIX (oculto até pagamento) -->
  <div id="modal-pix" class="modal" style="display:none;">
    <div class="modal-content">
      <h3>Escaneie o QR Code com seu banco</h3>
      <img id="qr-code" src="" alt="QR Code PIX">
      <p id="pix-copy-key" class="pix-key">Chave: <code>...</code> (clique para copiar)</p>
      <div id="pix-status">Aguardando pagamento...</div>
      <p style="font-size: 12px; color: #666;">Transação expira em <span id="pix-timer">5:00</span></p>
    </div>
  </div>
</section>
```

---

## CSS Base (Minimalista)

```css
.checkout-container {
  max-width: 600px;
  margin: 60px auto;
  padding: 40px 20px;
  background: #f9f9f9;
  border-radius: 8px;
}

#checkout-form fieldset {
  margin-bottom: 24px;
  border: none;
  padding: 0;
}

#checkout-form fieldset legend {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #222;
}

#checkout-form input,
#checkout-form select {
  width: 100%;
  padding: 12px;
  margin-bottom: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.btn-comprar {
  width: 100%;
  padding: 16px;
  background: #00a854;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
}

.btn-comprar:hover {
  background: #008c3a;
}

.btn-comprar:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 40px;
  border-radius: 8px;
  text-align: center;
  max-width: 400px;
}

.modal-content img {
  max-width: 300px;
  margin: 20px 0;
}

#pix-status {
  font-size: 14px;
  color: #666;
  margin-top: 16px;
}
```

---

## Variáveis de Ambiente (Criar `.env`)

```
VITE_HOTMART_API_KEY=seu_api_key_aqui
VITE_HOTMART_WEBHOOK_SECRET=seu_webhook_secret
VITE_CHECKOUT_PRODUCT_ID=123456
VITE_CHECKOUT_PRECO=R$ 19,90
```

---

## Checklist de Desenvolvimento

- [ ] Remover botão "Ir para Checkout" externo
- [ ] Criar formulário HTML integrado
- [ ] Estilizar formulário (responsivo)
- [ ] Validações client-side
- [ ] Radio button para PIX/Cartão com toggle de campos
- [ ] Criar endpoint `/api/checkout` (POST)
- [ ] Integrar Hotmart/Kiwify API
- [ ] Gerar QR Code PIX dinamicamente
- [ ] Criar modal para exibir QR
- [ ] Copiar chave PIX ao clicar
- [ ] Timer de expiração (5min)
- [ ] Webhook para confirmação de pagamento
- [ ] Página de sucesso (obrigado)
- [ ] Página de erro com retry
- [ ] Testes de pagamento (PIX testnet)
- [ ] Deploy no Vercel/Netlify
- [ ] Monitorar logs de erro

---

## Conta Hotmart/Kiwify

**Verificar:**
- [ ] CNPJ ativo para receber pagamentos?
- [ ] API keys configuradas?
- [ ] Webhook URL configurada?
- [ ] Produto cadastrado com ID correto?

Se não tiver, criar antes de começar.

---

## Deploy & Teste

1. **Local:** `npm run dev` → testar fluxo completo
2. **Staging:** Deploy em branch `staging`
3. **Produção:** Deploy em `main` após validar

---

## Sucesso quando:
✅ Página carrega com formulário visível  
✅ Validações funcionam (tenta enviar vazio = erro)  
✅ PIX gera QR code corretamente  
✅ Pagamento testado + webhook recebe confirmação  
✅ Redireciona para página de obrigado após sucesso  
✅ Responsivo em mobile/desktop  
✅ Sem erros no console  
