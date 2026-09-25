import test from "node:test";
import assert from "node:assert/strict";
import {
  isPixPayload,
  MAX_PAYMENT_PROOF_BYTES,
  validatePaymentProof,
  validPaymentAmount,
} from "../lib/payments";

test("payment amount accepts cents only inside the supported range", () => {
  assert.equal(validPaymentAmount(50), true);
  assert.equal(validPaymentAmount(49.9), true);
  assert.equal(validPaymentAmount(0), false);
  assert.equal(validPaymentAmount(10.001), false);
  assert.equal(validPaymentAmount(10_000), false);
  assert.equal(validPaymentAmount(Number.NaN), false);
});

test("payment proof metadata blocks unsupported or oversized files", () => {
  assert.doesNotThrow(() =>
    validatePaymentProof({ type: "image/png", size: MAX_PAYMENT_PROOF_BYTES }),
  );
  assert.throws(
    () => validatePaymentProof({ type: "image/gif", size: 100 }),
    /JPG, PNG ou WebP/,
  );
  assert.throws(
    () =>
      validatePaymentProof({
        type: "image/jpeg",
        size: MAX_PAYMENT_PROOF_BYTES + 1,
      }),
    /3 MB/,
  );
});

test("Pix heuristic requires an official BR.GOV.BCB.PIX payload", () => {
  assert.equal(
    isPixPayload("00020126580014BR.GOV.BCB.PIX0136chave-pix-aleatoria"),
    true,
  );
  assert.equal(isPixPayload("Comprovante de transferência bancária"), false);
  assert.equal(isPixPayload("foto-pix.png"), false);
});
