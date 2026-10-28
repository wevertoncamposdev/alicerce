"use client";

import { useAuth } from "@/contexts/auth-context";
import { FormView } from "@components/TypeView/FormView/FormView";
import { FieldList } from "@core/components/DetailView/FieldList";
import type { FormFieldConfig } from "@core/registry/types";
import type { TenantProfile } from "@modules/instituicao/types/types";

/**
 * Mesma razão de ser do ProfileFormSection (bypassar o gate de
 * `${model}.update` genérico do EditableSection) — aqui o módulo TEM uma
 * permissão real (`tenant.update`), então o gate é feito uma vez aqui, não
 * por campo.
 */
export function InstitutionFormSection({
    fields,
    record,
    formFields,
}: {
    fields: (keyof TenantProfile & string)[];
    record: TenantProfile;
    formFields: FormFieldConfig<TenantProfile>[];
}) {
    const { hasPermission } = useAuth();
    const sectionFields = formFields.filter((field) => fields.includes(field.name));

    if (!hasPermission("tenant.update")) {
        return <FieldList record={record} fields={fields} formFields={formFields} />;
    }

    return (
        <FormView<TenantProfile>
            mode="edit"
            layout="inline"
            model="instituicao"
            recordId="current"
            fields={sectionFields}
            initialValues={record}
        />
    );
}
