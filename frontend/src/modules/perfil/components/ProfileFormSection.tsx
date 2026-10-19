"use client";

import { FormView } from "@components/TypeView/FormView/FormView";
import type { FormFieldConfig } from "@core/registry/types";
import type { MeProfile } from "@modules/perfil/types/types";

/**
 * Seção editável do próprio perfil, fora do EditableSection genérico (ver
 * ADR 0009): EditableSection exige `${model}.update` via RBAC, mas "perfil"
 * não tem (nem precisa de) permissão própria — é sempre o próprio usuário,
 * o backend (/me) também não checa nenhuma. Chama o mesmo FormView/autosave
 * que EditableSection usa por dentro, só sem a checagem de permissão.
 */
export function ProfileFormSection({
    fields,
    record,
    formFields,
}: {
    fields: (keyof MeProfile & string)[];
    record: MeProfile;
    formFields: FormFieldConfig<MeProfile>[];
}) {
    const sectionFields = formFields.filter((field) => fields.includes(field.name));

    return (
        <FormView<MeProfile>
            mode="edit"
            layout="inline"
            model="perfil"
            recordId="me"
            fields={sectionFields}
            initialValues={record}
        />
    );
}
