import "server-only";

// Cada linha aqui é uma feature existente. O import roda o código de
// nível superior do arquivo (que inclui o registerModule(...)), mas não
// precisamos do valor exportado — por isso não há "import { x } from".
import "@modules/favorites/config/contract";
// import "@modules/tasks/config/contract";