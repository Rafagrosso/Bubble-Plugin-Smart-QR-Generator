# Smart QR Generator

Plugin do [Bubble](https://bubble.io) que converte qualquer texto ou URL em um
QR Code renderizado na página, com cores personalizáveis, logo central e
exportação em PNG/base64.

## Recursos

- Cores do código e do fundo configuráveis, com opção de **fundo transparente**
- **Logo central** com fundo branco arredondado automático, para o código
  continuar escaneável
- **Nível de correção de erro** (L/M/Q/H) e margem ajustáveis
- Estado **`qr_base64`** com a imagem gerada, pronta para salvar no banco,
  enviar por e-mail ou imprimir
- Ações de workflow **"Baixar QR Code (PNG)"** e **"Copiar QR Code para a área
  de transferência"**
- Eventos **"QR Code foi gerado"** e **"Ocorreu um erro na geração"**

A referência completa de campos, estados, eventos e ações está no
`params.json` de cada entidade e nas instruções em `meta_data.json`.

## Desenvolvimento

**Este repositório é a fonte da verdade do plugin.** O editor do Bubble é
espelho: as alterações são feitas aqui e o Bubble as importa pelo botão
*Synchronize with GitHub*.

Antes de todo push:

```bash
node tools/validate-plugin.js
```

O fluxo completo de sincronização, incluindo como resolver o conflito de merge
que o Bubble pode apresentar, está em **[SYNC.md](SYNC.md)**.

## Dependências

[`qrcode`](https://github.com/soldair/node-qrcode) 1.4.4, carregado via CDN em
`elements/AAC-850m6/headers.html`.
