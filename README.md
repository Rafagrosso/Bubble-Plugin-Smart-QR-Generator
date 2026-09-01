# Smart QR Generator

Plugin do [Bubble](https://bubble.io) que converte qualquer texto ou URL em um
QR Code renderizado na página, com cores personalizáveis, logo central e
exportação em PNG/base64.

## Recursos

- Cor dos módulos configurável. O **fundo do QR Code é o Background do
  elemento**, definido no painel de estilo do Bubble — sem background, o código
  sai com fundo transparente
- Qualquer sintaxe de cor CSS é aceita e convertida para HEX, que é o formato
  exigido pela biblioteca de geração
- **Logo central** com fundo arredondado automático, para o código continuar
  escaneável
- **Nível de correção de erro** (L/M/Q/H) e margem ajustáveis
- Estado **`qr_base64`** com a imagem gerada, pronta para salvar no banco,
  enviar por e-mail ou imprimir
- Ações de workflow **"Baixar QR Code (PNG)"** e **"Copiar QR Code para a área
  de transferência"**
- Eventos **"QR Code foi gerado"** e **"Ocorreu um erro na geração"**

## Proteções de legibilidade

Um QR Code ilegível é uma falha silenciosa: ele aparece bonito na tela e
simplesmente não é lido. O plugin fecha as quatro portas mais comuns para isso:

- O logo é limitado a 25% da largura do código. Acima disso ele cobre módulos
  demais e o QR deixa de decodificar — limite medido decodificando os códigos
  gerados, não estimado. Valores maiores são reduzidos, com aviso no console
- A margem padrão é de 4 módulos, a zona de silêncio exigida pela
  especificação do QR Code
- Havendo logo, a correção de erro é elevada para H automaticamente
- Contraste insuficiente entre a cor do código e o fundo gera um aviso no
  console do navegador, com os valores envolvidos

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
