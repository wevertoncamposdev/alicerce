"use client";

import { useMemo, useState } from "react";
import { Button, Input } from "@/components/ui/index";
import {
    slugifyTenant,
    TENANT_INITIAL_FORM_VALUES,
} from "../tenant.constants";
import { TenantFormValues, TenantPayload } from "../tenant.types";

interface TenantsFormProps {
    mode: "create" | "edit";
    initialValues?: TenantFormValues;
    saving?: boolean;
    onCancel?: () => void;
    onSubmit: (payload: TenantPayload) => Promise<void>;
}

export default function TenantsForm({
    mode,
    initialValues,
    saving = false,
    onCancel,
    onSubmit,
}: TenantsFormProps) {
    const [values, setValues] = useState<TenantFormValues>(
        initialValues ?? TENANT_INITIAL_FORM_VALUES,
    );
    const [slugEdited, setSlugEdited] = useState(mode === "edit");
    const [error, setError] = useState<string | null>(null);

    const title = useMemo(
        () => (mode === "create" ? "Cadastrar tenant" : "Editar tenant"),
        [mode],
    );

    function handleNameChange(nextName: string) {
        setValues((prev) => {
            if (slugEdited) {
                return { ...prev, name: nextName };
            }

            return {
                ...prev,
                name: nextName,
                slug: slugifyTenant(nextName),
            };
        });
    }

    function handleSlugChange(nextSlug: string) {
        setSlugEdited(true);
        setValues((prev) => ({
            ...prev,
            slug: slugifyTenant(nextSlug),
        }));
    }

    function handleDescriptionChange(nextDescription: string) {
        setValues((prev) => ({ ...prev, description: nextDescription }));
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!values.name.trim()) {
            setError("Nome do tenant e obrigatorio.");
            return;
        }

        if (!values.slug.trim()) {
            setError("Slug do tenant e obrigatorio.");
            return;
        }

        setError(null);

        try {
            await onSubmit({
                name: values.name,
                slug: values.slug,
                description: values.description,
            });

            if (mode === "create") {
                setValues(TENANT_INITIAL_FORM_VALUES);
                setSlugEdited(false);
                setError(null);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Falha ao salvar tenant.";
            setError(message);
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="rounded-xl border bg-card p-5 shadow-sm space-y-4"
        >
            <div className="space-y-1">
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">
                    Informe os dados iniciais do tenant para o onboarding.
                </p>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="tenant-name">
                    Nome
                </label>
                <Input
                    id="tenant-name"
                    value={values.name}
                    onChange={(event) => handleNameChange(event.target.value)}
                    placeholder="Acme LTDA"
                    disabled={saving}
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="tenant-slug">
                    Slug
                </label>
                <Input
                    id="tenant-slug"
                    value={values.slug}
                    onChange={(event) => handleSlugChange(event.target.value)}
                    placeholder="acme"
                    disabled={saving}
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="tenant-description">
                    Descricao
                </label>
                <Input
                    id="tenant-description"
                    value={values.description}
                    onChange={(event) => handleDescriptionChange(event.target.value)}
                    placeholder="Tenant principal da organizacao"
                    disabled={saving}
                />
            </div>

            {error ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                </div>
            ) : null}

            <div className="flex items-center gap-2">
                <Button type="submit" disabled={saving}>
                    {saving ? "Salvando..." : mode === "create" ? "Cadastrar" : "Salvar"}
                </Button>

                {mode === "edit" && onCancel ? (
                    <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
                        Cancelar
                    </Button>
                ) : null}
            </div>
        </form>
    );
}
