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
    createdAt: string;
};
