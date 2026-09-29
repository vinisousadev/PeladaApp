import { expect, test } from "@playwright/test";

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

test("mensalista envia comprovante e administrador confirma", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explorar demonstração" }).click();
  await page.getByRole("button", { name: "Pagamentos" }).click();

  await expect(
    page.getByRole("heading", { name: "Mensalidade sem complicação." }),
  ).toBeVisible();
  await expect(page.getByText("24 mensalistas", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /Registrar pagamento/ }).click();
  const fileInput = page.getByLabel("Comprovante de pagamento");
  await fileInput.setInputFiles({
    name: "comprovante-grande.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(3 * 1024 * 1024 + 1),
  });
  await expect(page.locator(".payment-modal .error")).toContainText(
    "no máximo 3 MB",
  );

  await fileInput.setInputFiles({
    name: "comprovante-pix.png",
    mimeType: "image/png",
    buffer: onePixelPng,
  });
  await expect(page.getByAltText("Prévia do comprovante")).toBeVisible();
  await expect(page.getByText("Confirmação manual necessária")).toBeVisible();
  await page.getByLabel("Valor pago").fill("65.50");
  await page.getByRole("button", { name: /Enviar para confirmação/ }).click();

  const viniRow = page.locator(".payment-row").filter({ hasText: "Vini" });
  await expect(viniRow).toContainText("R$ 65,50");
  await expect(viniRow).toContainText("Aguardando confirmação");

  await page.getByLabel("Testar como").selectOption("admin");
  await page.getByRole("button", { name: "Pagamentos" }).click();
  await expect(viniRow.getByRole("link", { name: /Comprovante/ })).toBeVisible();
  await viniRow.getByRole("button", { name: /Confirmar/ }).click();
  await expect(viniRow).toContainText("Confirmado");

  await page.screenshot({
    path: "test-results/pagamentos-confirmados.png",
    fullPage: true,
  });
});
