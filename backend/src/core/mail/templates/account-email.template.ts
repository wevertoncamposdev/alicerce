// Template simples (HTML + texto) compartilhado pelos quatro fluxos de
// conta (convite, reset de senha, verificação de e-mail, troca de
// e-mail) — título, corpo, botão de ação, nome/logo da instituição. Puro:
// quem chama já resolveu `tenantLogoUrl` (ex.: via
// `FilesService.getSignedUrlOrNull`) — o template não conhece storage.
export interface AccountEmailParams {
  title: string;
  bodyText: string;
  tenantName: string;
  tenantLogoUrl?: string | null;
  actionUrl?: string;
  actionLabel?: string;
}

export function renderAccountEmail(params: AccountEmailParams): {
  html: string;
  text: string;
} {
  const { title, bodyText, tenantName, tenantLogoUrl, actionUrl, actionLabel } =
    params;

  const logoHtml = tenantLogoUrl
    ? `<img src="${tenantLogoUrl}" alt="${tenantName}" height="32" style="margin-bottom:16px" />`
    : `<p style="font-weight:600;margin-bottom:16px">${tenantName}</p>`;

  const buttonHtml =
    actionUrl && actionLabel
      ? `<p style="margin:24px 0"><a href="${actionUrl}" style="background:#111827;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">${actionLabel}</a></p>`
      : '';

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      ${logoHtml}
      <h1 style="font-size:18px">${title}</h1>
      <p style="color:#374151;line-height:1.5">${bodyText}</p>
      ${buttonHtml}
    </div>
  `.trim();

  const text = [
    tenantName,
    '',
    title,
    '',
    bodyText,
    actionUrl ? `\n${actionUrl}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return { html, text };
}
