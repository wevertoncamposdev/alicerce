// Constante única hoje: Termos de Uso + Política de Privacidade combinados
// num checkbox só. Um segundo documento no futuro é só outro valor de
// string em `document` (ver ConsentRecord) — sem migration.
export const TERMS_DOCUMENT = 'terms';

// Subir esta data é o gatilho pra "todo mundo precisa aceitar de novo":
// mapAuthUserContext passa a devolver `termsAccepted: false` pra quem só
// tem ConsentRecord de uma versão anterior, até aceitar a atual via
// POST /me/consent.
export const CURRENT_TERMS_VERSION = '2026-10-24';
