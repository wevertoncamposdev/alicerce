"use client";

import SimpleForm from "@/components/SimpleForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <SimpleForm
        title="Login"
        fields={[
          { name: "email", label: "E-mail", type: "email" },
          { name: "password", label: "Senha", type: "password" },
        ]}
        buttonLabel="Entrar"
        onSubmit={(data) => {
          // TODO: Implementar autenticação
          alert("Login: " + JSON.stringify(data));
        }}
      />
    </div>
  );
}
