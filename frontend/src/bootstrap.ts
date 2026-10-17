import "server-only";

// Cada linha aqui é uma feature existente — as mesmas 6 chaves de
// alicerce.config.ts (ícone/rota/permissão/grupo de menu). O import roda o
// código de nível superior do arquivo (que inclui o registerModule(...)),
// mas não precisamos do valor exportado — por isso não há "import { x }
// from". Fica como lista estática de propósito: Next.js/Turbopack exige
// caminhos de import literais pro code-splitting, não dá pra gerar isso a
// partir de alicerce.config.ts em runtime sem arriscar quebrar o bundling —
// um módulo novo ainda precisa de uma linha aqui, além de uma entrada no
// config.
import "@modules/tenants/config/contract";
import "@modules/users/config/contract";
import "@modules/roles/config/contract";
import "@modules/permissions/config/contract";
import "@modules/audit/config/contract";
import "@modules/feedbacks/config/contract";