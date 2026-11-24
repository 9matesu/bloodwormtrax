# bloodworm trax

Site do selo independente **bloodworm trax** (Vale do Paraíba, SP). Site estático em HTML, CSS e JavaScript puro, sem build.

Publicado em **https://bloodwormtr.ax** por GitHub Pages.

## Páginas

- `index.html` — catálogo (releases, artistas, selo, arquivo e links) com navegação por hash, busca e filtros.
- `opcoda.html` — página do sintetizador granular Opcoda, com preços e botões de compra.
- `sistema.html` — design system e componentes do site.

## Estrutura

- `css/` — estilos (`style.css`, `rare.css`, `opcoda.css`).
- `js/` — dados e lógica (`data.js`, `app.js`, `rare.js`, `graph.js`, `fx.js`, `ui-core.js`, `checkout.js`).
- `assets/` — capas, thumbnails, fontes e imagens.

## Venda do Opcoda

Os preços e os links de pagamento ficam **somente** em `js/checkout.js`. Para colocar a venda no ar:

1. Criar um link de pagamento no Mercado Pago (Brasil) e outro no Stripe (EUA e Europa).
2. Substituir os marcadores `SUBSTITUIR_PREF_ID_BR`, `SUBSTITUIR_LINK_USD` e `SUBSTITUIR_LINK_EUR` nesse arquivo.
3. Fazer commit e push. Os três botões "comprar licença" passam a apontar para o link da moeda selecionada pelo visitante.

Preços em produção: R$ 97 no Brasil, US$ 59 nos Estados Unidos, EUR 55 na Europa. A moeda é escolhida no topo da página `opcoda.html` e lembrada no navegador. O pedido de build de avaliação e o contato continuam por e-mail.

## Publicação

O repositório é servido pelo GitHub Pages a partir do branch `master`, na raiz. O arquivo `CNAME` fixa o domínio `bloodwormtr.ax`. Para DNS, apontar `www` como CNAME para `9matesu.github.io` e o ápice para os quatro IPs do GitHub Pages (185.199.108.153 a 185.199.111.153). Manter o proxy do Cloudflare desligado durante a validação do certificado e marcar "Enforce HTTPS" nas configurações do Pages.

## Rodar localmente

Basta abrir `index.html` no navegador ou servir a pasta com um servidor estático:

```sh
npx serve .
```

## Contato

bloodwormtrax@gmail.com
