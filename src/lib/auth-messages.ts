/** Human-readable messages, without disclosing whether an address has an account. */
export function schoolAuthError(error:unknown):string{
 const value=error as {code?:string;status?:number;message?:string}|null;
 switch(value?.code){
  case 'invalid_credentials':return 'Email ou mot de passe incorrect. Utilise les identifiants de ton compte School.';
  case 'email_not_confirmed':return 'Confirme ton adresse email avant de te connecter. Tu peux demander un nouveau lien ci-dessous.';
  case 'over_email_send_rate_limit':case 'over_request_rate_limit':return 'Trop de demandes rapprochées. Patiente quelques minutes avant de réessayer.';
  case 'weak_password':return 'Ce mot de passe est trop faible. Choisis-en un plus long et difficile à deviner.';
  case 'same_password':return 'Choisis un mot de passe différent de l’ancien.';
  case 'otp_expired':return 'Ce lien est expiré ou a déjà été utilisé. Demande un nouveau lien.';
  case 'email_address_not_authorized':case 'email_address_invalid':return 'L’envoi vers cette adresse est indisponible. Vérifie l’adresse ou contacte l’école.';
  case 'signup_disabled':return 'Les inscriptions sont temporairement fermées. Contacte l’école.';
 }
 if(value?.status===429)return 'Trop de demandes rapprochées. Patiente quelques minutes avant de réessayer.';
 if(value?.message&&/network|fetch|connection/i.test(value.message))return 'Connexion au service impossible. Vérifie ta connexion internet puis réessaie.';
 // Keep local validation errors readable; do not expose backend internals.
 if(error instanceof Error&&!value?.code&&!value?.status&&!/Auth|fetch|network/i.test(error.name))return error.message;
 return 'L’opération n’a pas abouti. Réessaie dans quelques instants ou contacte l’école.';
}
