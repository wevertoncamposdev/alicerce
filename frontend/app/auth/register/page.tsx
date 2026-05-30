"use client";

import SimpleForm from "@/components/SimpleForm";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <SimpleForm
        title="Registrar"
        fields={[
          { name: "name", label: "Nome" },
          { name: "email", label: "E-mail", type: "email" },
          { name: "password", label: "Senha", type: "password" },
        ]}
        buttonLabel="Registrar"
        onSubmit={(data) => {
          // TODO: Implementar registro
          alert("Registro: " + JSON.stringify(data));
        }}
      />
    </div>
  );
}
