// Nome do cookie que transporta o refresh token entre BFF e Nest.
// O access token nunca viaja em cookie para o Nest — ele vem como Bearer no header.
export const REFRESH_COOKIE = 'refresh_token';

// Path restrito reduz a superfície: este cookie só é enviado automaticamente
// para /api/auth/* — não para /api/users, /api/tasks etc. Compartilhado por
// AuthController (login/refresh/logout) e MeController (sessions), que
// precisam ler o mesmo cookie para identificar a sessão/família atual.
export const COOKIE_PATH = '/api/auth';
export const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias
