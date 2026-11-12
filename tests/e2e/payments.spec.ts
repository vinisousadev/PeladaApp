import { expect, test } from "@playwright/test";
import {PAYMENT_PIX} from '../../lib/pix-payment';

test('Pix shows recipient, copies exact payload and offers manual fallback on mobile',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(value:string)=>{(window as any).copiedPix=value;}}}));
 await page.goto('/');await page.getByRole('button',{name:'Explorar demonstração'}).click();await page.getByRole('button',{name:'Pagamentos',exact:true}).click();
 const pix=page.getByRole('region',{name:'Seu Pix, sem complicação.'});
 await expect(pix).toContainText(PAYMENT_PIX.recipient);await expect(pix).toContainText('NUBANK');await expect(pix).toContainText('R$ 39,00');
  const qr=pix.getByRole('img',{name:/QR Code Pix de/});await expect(qr).toBeVisible();
 expect(await qr.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
 await qr.screenshot({path:'../../work/pix-qr-mobile.png'});
 await pix.getByRole('button',{name:'Copiar Pix',exact:true}).click();
 expect(await page.evaluate(()=>(window as any).copiedPix)).toBe(PAYMENT_PIX.payload);
 await expect(pix.getByRole('status')).toContainText('Código copiado');
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('denied');}}}));
 await pix.getByRole('button',{name:'Pix copiado!',exact:true}).click();
 await expect(pix.getByLabel('Código Pix Copia e Cola')).toHaveValue(PAYMENT_PIX.payload);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await pix.screenshot({path:'../../work/payment-pix-mobile.png'});
 await page.getByRole('button',{name:/Registrar pagamento/}).click();await expect(page.getByLabel('Valor pago')).toHaveValue('39');
});

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

test('PDF proof validates type and size, uploads unchanged and opens for admin review',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Explorar demonstração'}).click();await page.getByRole('button',{name:'Pagamentos',exact:true}).click();
 await page.getByRole('button',{name:/Registrar pagamento/}).click();
 const input=page.getByLabel('Comprovante de pagamento');
 await input.setInputFiles({name:'invalido.pdf',mimeType:'application/pdf',buffer:Buffer.from('not a PDF')});
 await expect(page.locator('.payment-modal .error')).toContainText('não é um PDF válido');
 await input.setInputFiles({name:'grande.pdf',mimeType:'application/pdf',buffer:Buffer.alloc(3*1024*1024+1)});
 await expect(page.locator('.payment-modal .error')).toContainText('3 MB');
 const pdf=Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');
 await input.setInputFiles({name:'comprovante.pdf',mimeType:'application/pdf',buffer:pdf});
 await expect(page.getByRole('link',{name:'Abrir prévia do PDF'})).toHaveAttribute('href',/^blob:/);
 await expect(page.getByAltText('Prévia do comprovante')).toHaveCount(0);
 await page.getByRole('button',{name:/Enviar para confirmação/}).click();
 await page.getByLabel('Testar como').selectOption('admin');await page.getByRole('button',{name:'Pagamentos',exact:true}).click();
 const row=page.locator('.payment-row').filter({hasText:'Vini'});await row.getByRole('button',{name:'Comprovante',exact:true}).click();
 await expect(row.getByRole('link',{name:'Abrir PDF em nova aba'})).toHaveAttribute('href','data:application/pdf;base64,'+pdf.toString('base64'));
 await row.getByRole('button',{name:/Confirmar/}).click();await expect(row).toContainText('Confirmado');
});

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
  await expect(viniRow.getByRole("button", { name: /Comprovante/ })).toBeVisible();
  await viniRow.getByRole("button", { name: /Confirmar/ }).click();
  await expect(viniRow).toContainText("Confirmado");

  await page.screenshot({
    path: "test-results/pagamentos-confirmados.png",
    fullPage: true,
  });
});
