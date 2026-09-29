export const MAX_PAYMENT_PROOF_BYTES = 3 * 1024 * 1024;
export const MAX_PAYMENT_PROOF_PIXELS = 20_000_000;
export const PAYMENT_PROOF_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type PixAnalysis = "detected" | "unverified" | "unavailable";

export function validPaymentAmount(amount: number) {
  return (
    Number.isFinite(amount) &&
    amount >= 0.01 &&
    amount <= 9999.99 &&
    Math.abs(Math.round(amount * 100) - amount * 100) < 1e-9
  );
}

export function validatePaymentProof(file: Pick<File, "size" | "type">) {
  if (!PAYMENT_PROOF_TYPES.includes(file.type as (typeof PAYMENT_PROOF_TYPES)[number]))
    throw Error("Escolha uma imagem JPG, PNG ou WebP.");
  if (file.size <= 0 || file.size > MAX_PAYMENT_PROOF_BYTES)
    throw Error("O comprovante deve ter no máximo 3 MB.");
}

export function isPixPayload(value: string) {
  const normalized = value.replace(/\s/g, "").toUpperCase();
  return (
    normalized.includes("BR.GOV.BCB.PIX") ||
    (normalized.startsWith("000201") && normalized.includes("0014BR.GOV.BCB.PIX"))
  );
}
