// D7 (docs/PLAN-fundacao-ux.md): redimensiona no browser antes de subir —
// avatar/logo não precisam de mais que ~512px, e enviar o arquivo original
// (câmera de celular facilmente passa de 1 MB) é o que faz o upload bater
// no limite de 1 MB padrão de Server Action do Next (ver next.config.ts,
// que ainda sobe esse limite como rede de segurança — este resize é o que
// evita precisar dela na maioria das vezes).
//
// Falha aberta: qualquer problema (API do browser ausente, arquivo
// corrompido) devolve o arquivo original sem lançar — o upload nunca é
// bloqueado por isto.
export async function resizeImageToWebp(file: File, maxDimension = 512): Promise<File> {
    if (!file.type.startsWith("image/")) {
        return file;
    }

    if (typeof createImageBitmap !== "function") {
        return file;
    }

    try {
        const bitmap = await createImageBitmap(file);
        try {
            const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
            const width = Math.round(bitmap.width * scale);
            const height = Math.round(bitmap.height * scale);

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");
            if (!ctx) return file;

            ctx.drawImage(bitmap, 0, 0, width, height);

            const blob = await new Promise<Blob | null>((resolve) => {
                canvas.toBlob(resolve, "image/webp", 0.9);
            });
            if (!blob) return file;

            const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
            return new File([blob], name, { type: "image/webp" });
        } finally {
            bitmap.close();
        }
    } catch {
        return file;
    }
}
