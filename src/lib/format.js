export const price = (v) => `${Math.round(Number(v || 0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA`;

export const date = (d, withTime = false) => {
  if (!d) return '';
  const x = new Date(d);
  const s = x.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  return withTime ? `${s} ${x.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : s;
};

// [libellé, ton] — tons : success | danger | warning | info | gold
export const ORDER_STATUS = {
  pending: ['En attente de paiement', 'warning'],
  confirmed: ['Confirmée', 'info'],
  preparing: ['En préparation', 'info'],
  ready: ['Prête à expédier', 'info'],
  shipped: ['Expédiée', 'gold'],
  in_delivery: ['En livraison', 'gold'],
  delivered: ['Livrée', 'success'],
  cancelled: ['Annulée', 'danger'],
  return_requested: ['Retour demandé', 'warning'],
  return_accepted: ['Retour accepté', 'info'],
  return_rejected: ['Retour refusé', 'danger'],
  refunding: ['Remboursement en cours', 'warning'],
  refunded: ['Remboursée', 'success'],
  partially_refunded: ['Partiellement remboursée', 'warning'],
};

export const PAYMENT_STATUS = {
  initiated: ['Paiement initié', 'warning'],
  pending: ['Paiement en attente', 'warning'],
  succeeded: ['Payé', 'success'],
  partially_paid: ['Acompte payé', 'gold'],
  failed: ['Paiement échoué', 'danger'],
  cancelled: ['Paiement annulé', 'danger'],
  refunding: ['Remboursement en cours', 'warning'],
  partially_refunded: ['Partiellement remboursé', 'warning'],
  refunded: ['Remboursé', 'info'],
};

// Statuts de paiement qui ne font que répéter le statut de la commande (ex. « Annulée » + « Paiement annulé »)
const PAYMENT_REPEATS_ORDER = {
  cancelled: ['cancelled', 'failed', 'pending', 'initiated'],
  refunding: ['refunding'],
  refunded: ['refunded'],
  partially_refunded: ['partially_refunded'],
};
/** Faut-il afficher le badge de paiement à côté du statut de la commande ? */
export const showPaymentStatus = (o) => !(PAYMENT_REPEATS_ORDER[o.status] || []).includes(o.payment_status);

export const PRODUCT_STATUS = {
  draft: ['Brouillon', ''],
  pending: ['En validation', 'warning'],
  published: ['En ligne', 'success'],
  rejected: ['Refusé', 'danger'],
  disabled: ['Désactivé', ''],
};

export const PAYMENT_METHODS = {
  orange_money: { label: 'Orange Money', color: '#FF7900' },
  mtn_momo: { label: 'MTN MoMo', color: '#D4A900' },
  wave: { label: 'Wave', color: '#1499C4' },
  moov_money: { label: 'Moov Money', color: '#0066B3' },
  card: { label: 'Carte bancaire', color: '#1C1C1C' },
  cash_on_delivery: { label: 'Paiement à la livraison', color: '#2E7D4F' },
};

// Formules de paiement (le solde éventuel est réglé au vendeur à la livraison)
export const PAYMENT_PLANS = {
  full: 'Paiement de la totalité en ligne',
  half: 'Moitié en ligne, le reste à la livraison',
  deposit: 'Paiement à la livraison (acompte en ligne)',
};

export const PAYOUT_METHODS = {
  orange_money: 'Orange Money', mtn_momo: 'MTN MoMo', wave: 'Wave', moov_money: 'Moov Money', bank: 'Virement bancaire',
};

export const DELIVERY_MODES = {
  home: ['Domicile', 'house'],
  office: ['Bureau', 'building'],
  pickup_point: ['Point de retrait', 'boxes-stacked'],
  shop_pickup: ['Retrait en boutique', 'store'],
};

export const AUDIENCES = { homme: 'Homme', femme: 'Femme', enfant: 'Enfant', bebe: 'Bébé', unisexe: 'Unisexe' };

export const SORTS = { newest: 'Récents', popular: 'Populaires', price_asc: 'Prix ↑', price_desc: 'Prix ↓', rating: 'Mieux notés' };
