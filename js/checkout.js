/* Opcoda — configuracao de venda direta.
 * Edite somente este arquivo para trocar precos ou links de pagamento.
 * Os links abaixo sao os unicos pontos de venda do site.
 */
window.OPCODA_CHECKOUT = (function () {
  'use strict';

  var moeda = {
    BRL: { preco: 'R$ 97',  nome: 'real',   link: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=SUBSTITUIR_PREF_ID_BR' },
    USD: { preco: 'US$ 59', nome: 'dolar',  link: 'https://buy.stripe.com/SUBSTITUIR_LINK_USD' },
    EUR: { preco: 'EUR 55', nome: 'euro',   link: 'https://buy.stripe.com/SUBSTITUIR_LINK_EUR' }
  };

  var avaliacao = 'mailto:bloodwormtrax@gmail.com?subject=Opcoda%20avalia%C3%A7%C3%A3o';
  var contato = 'mailto:bloodwormtrax@gmail.com';

  function linkDaMoeda() {
    var atual = 'BRL';
    try { atual = localStorage.getItem('opcoda.moeda') || 'BRL'; } catch (e) {}
    return (moeda[atual] || moeda.BRL).link;
  }

  return {
    moeda: moeda,
    avaliacao: avaliacao,
    contato: contato,
    linkDaMoeda: linkDaMoeda
  };
})();
