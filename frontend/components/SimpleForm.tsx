import React from "react";

interface SimpleFormProps {
  title: string;
  fields: { name: string; label: string; type?: string }[];
  buttonLabel: string;
  onSubmit?: (data: Record<string, string>) => void;
}

export default function SimpleForm({ title, fields, buttonLabel, onSubmit }: SimpleFormProps) {
  const [form, setForm] = React.useState<Record<string, string>>({});

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit?.(form);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm mx-auto p-8 bg-white rounded shadow flex flex-col gap-4"
    >
      <h2 className="text-2xl font-bold mb-4 text-center">{title}</h2>
      {fields.map((field) => (
        <div key={field.name} className="flex flex-col gap-1">
          <label htmlFor={field.name} className="text-sm font-medium">
            {field.label}
          </label>
          <input
            id={field.name}
            name={field.name}
            type={field.type || "text"}
            value={form[field.name] || ""}
            onChange={handleChange}
            className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            required
          />
        </div>
      ))}
      <button
        type="submit"
        className="mt-4 bg-zinc-800 text-white py-2 rounded hover:bg-zinc-700 transition"
      >
        {buttonLabel}
      </button>
    </form>
  );
}
