import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 font-sans">
      {/* Navbar */}
      <nav className="w-full flex justify-end gap-4 px-8 py-4 bg-white dark:bg-black border-b border-zinc-200 dark:border-zinc-800">
        <Link href="/auth/login" className="px-4 py-2 rounded bg-zinc-800 text-white hover:bg-zinc-700 transition">Login</Link>
        <Link href="/auth/register" className="px-4 py-2 rounded border border-zinc-800 text-zinc-800 dark:text-zinc-100 dark:border-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">Registrar</Link>
      </nav>
      {/* Main content */}
      <main className="flex flex-1 flex-col items-center justify-center w-full px-4 py-16">
        <img src="/icon.png" alt="SaaS Illustration" className="w-64 mb-8" />
        <h1 className="text-4xl font-bold text-zinc-900 mb-4 text-center">Projeto Multi-Tenant SaaS</h1>
        
        <p className="text-lg text-zinc-700 max-w-xl text-center mb-8">
          Base reutilizável para projetos SaaS multi-tenant com autenticação, autorização e auditoria. Estrutura modular para facilitar a expansão e manutenção.
        </p>
        <div className="flex flex-col gap-2 items-center">
          <span className="text-zinc-500 ">Comece acessando o Login ou faça seu Registro.</span>
        </div>
      </main>
    </div>
  );
}
