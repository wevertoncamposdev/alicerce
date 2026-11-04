export type ShowcaseEntity = {
    id: string;
    name: string;
    role: string;
    status: "active" | "inactive";
    email: string;
    phone: string;
    city: string;
    document: string;
    birthDate: string;
    maritalStatus: string;
    nationality: string;
    department: string;
    notes: string;
    tags: string[];
    // U4 (docs/PLAN-fundacao-ux.md): só pra exercitar os tipos `tags`/`multiselect`
    // do FormView — valores separados por vírgula na mesma string (ver FormView.tsx,
    // TagsFieldInput/MultiselectFieldInput), diferente de `tags` acima (`string[]`,
    // usado só pelo `render` da seção "Tags", que já existia antes do U4).
    interests: string;
    workShift: string;
    // U4: só pra exercitar o tipo `lookup` — aponta pra outro ShowcaseEntity.
    // `mentorName` é o mesmo padrão de `previewField` (type: "image"): nome já
    // resolvido, pra não precisar de fetch extra no client só pra exibir.
    mentorId: string;
    mentorName: string;
    createdAt: string;
};
