'use client';

import { useAuth } from "@/contexts/auth-context";
import { resolveActionPermission, type AuthAction } from "@lib/authz";
import { FormView } from "@components/TypeView/FormView/FormView";
import { FieldList } from "@core/components/DetailView/FieldList";
import type { FormFieldConfig } from "@core/registry/types";

type EditableSectionProps<T> = {
    record: T;
    fields: (keyof T & string)[];
    formFields: FormFieldConfig<T>[];
    model: string;
    recordId: string;
    /** `RecordModuleDefinition.permission` — default: resolução atual de `${model}.update`. */
    permission?: string;
};

/**
 * Seção `editable` do detail (ADR 0005): autosave sempre ativo pra quem tem
 * `${permission}.update`, `FieldList` somente leitura pra quem não tem — sem
 * toggle, sem `?mode=edit`. A checagem é client-side (useAuth); o backend
 * segue validando toda escrita independente do que a UI mostra.
 */
export function EditableSection<T>({ record, fields, formFields, model, recordId, permission }: EditableSectionProps<T>) {
    const { hasPermission } = useAuth();
    const permissionKey = permission ? `${permission}.update` : resolveActionPermission(`${model}.update` as AuthAction);
    const canEdit = Boolean(permissionKey) && hasPermission(permissionKey);

    if (!canEdit) {
        return <FieldList record={record} fields={fields} formFields={formFields} />;
    }

    const sectionFormFields = formFields.filter((field) => fields.includes(field.name));

    return (
        <FormView<Record<string, unknown>>
            mode="edit"
            layout="inline"
            model={model}
            recordId={recordId}
            fields={sectionFormFields as FormFieldConfig<Record<string, unknown>>[]}
            initialValues={record as Record<string, unknown>}
        />
    );
}
