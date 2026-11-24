/* Opcoda - venda direta. Edite somente este arquivo para precos e links. */
window.OPCODA_CHECKOUT = (function () {
  'use strict';

  var moeda = {
    BRL: { preco: 'R$ 97',  nome: 'real',   link: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=SUBSTITUIR_PREF_ID_BR' },
    USD: { preco: 'US$ 59', nome: 'dollar', link: 'https://buy.stripe.com/SUBSTITUIR_LINK_USD' },
    EUR: { preco: 'EUR 55', nome: 'euro',   link: 'https://buy.stripe.com/SUBSTITUIR_LINK_EUR' }
  };

  function detectar() {
    var locale = 'en-US';
    try { locale = Intl.DateTimeFormat().resolvedOptions().locale || 'en-US'; } catch (e) {}
    var tag = locale.toLowerCase();
    if (tag.indexOf('pt-br') === 0 || tag.indexOf('pt') === 0) return 'BRL';
    var paisesEUR = ['at','be','cy','ee','fi','fr','de','gr','ie','it','lv','lt','lu','mt','nl','pt','sk','si','es','hr'];
    var pais = tag.split('-')[1];
    if (pais && paisesEUR.indexOf(pais) >= 0) return 'EUR';
    return 'USD';
  }

  function atual() {
    try { return localStorage.getItem('opcoda.moeda') || detectar(); }
    catch (e) { return detectar(); }
  }

  function linkDaMoeda() {
    return (moeda[atual()] || moeda.BRL).link;
  }

  return {
    moeda: moeda,
    atual: atual,
    detectar: detectar,
    linkDaMoeda: linkDaMoeda
  };
})();
