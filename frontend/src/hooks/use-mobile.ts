import * as React from "react"

const MOBILE_BREAKPOINT = 768

// useSyncExternalStore é o jeito recomendado pelo React para assinar uma
// API externa (matchMedia) sem cair no anti-padrão de chamar setState
// direto dentro do corpo do efeito (causa um render em cascata extra logo
// após o mount) — ver "You Might Not Need an Effect" na doc do React.
function subscribe(callback: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

function getSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT
}

function getServerSnapshot() {
  return false
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
