export type TenantProfile = {
    id: string;
    legalName: string;
    slug: string;
    tradeName?: string | null;
    documentType?: "CNPJ" | "CPF" | "OUTRO" | null;
    document?: string | null;
    email?: string | null;
    phone?: string | null;
    website?: string | null;
    addressStreet?: string | null;
    addressNumber?: string | null;
    addressComplement?: string | null;
    addressNeighborhood?: string | null;
    addressCity?: string | null;
    addressState?: string | null;
    addressZipCode?: string | null;
};
