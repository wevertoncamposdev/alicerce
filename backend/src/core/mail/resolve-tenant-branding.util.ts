import type { FilesService } from '@core/files/file.service';

export interface TenantBrandingSource {
  id: string;
  legalName: string;
  tradeName?: string | null;
  logoFileId?: string | null;
}

export interface TenantBranding {
  tenantName: string;
  tenantLogoUrl: string | null;
}

// Repetido em todo fluxo que manda e-mail de conta (reset de senha,
// convite, verificação, troca de e-mail) — resolve o nome/logo da
// instituição pro template (ver account-email.template.ts).
export async function resolveTenantBranding(
  filesService: FilesService,
  tenant: TenantBrandingSource,
): Promise<TenantBranding> {
  const tenantName = tenant.tradeName ?? tenant.legalName;
  const tenantLogoUrl = tenant.logoFileId
    ? await filesService.getSignedUrlOrNull(tenant.logoFileId, tenant.id)
    : null;

  return { tenantName, tenantLogoUrl };
}
