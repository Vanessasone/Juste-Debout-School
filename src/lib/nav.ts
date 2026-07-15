/**
 * Retour arrière robuste : revient en arrière s'il y a un historique,
 * sinon retombe sur l'accueil (évite l'erreur « GO_BACK was not handled »
 * quand on a rafraîchi la page directement sur un écran profond, sur web).
 */
export function goBack(router: { canGoBack: () => boolean; back: () => void; replace: (href: any) => void }) {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)');
}
