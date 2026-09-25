"use client";

import {
  Check,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileCheck2,
  ImagePlus,
  LockKeyhole,
  SearchCheck,
  ShieldCheck,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  isPixPayload,
  MAX_PAYMENT_PROOF_BYTES,
  MAX_PAYMENT_PROOF_PIXELS,
  type PixAnalysis,
  validatePaymentProof,
  validPaymentAmount,
} from "@/lib/payments";
import { friendlyError } from "@/lib/supabase";
import {
  monthLabel,
  type Payment,
  type PaymentStatus,
  type Profile,
} from "@/lib/model";

type PreparedProof = {
  file: File;
  analysis: PixAnalysis;
  detail: string;
};

type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue?: string }>>;
};
type BarcodeDetectorConstructor = new (options: {
  formats: string[];
}) => BarcodeDetectorLike;

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(Error("Não foi possível abrir essa imagem."));
    };
    image.src = url;
  });
}

async function inspectPix(image: HTMLImageElement): Promise<{
  analysis: PixAnalysis;
  detail: string;
}> {
  const Detector = (
    window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }
  ).BarcodeDetector;
  if (!Detector)
    return {
      analysis: "unavailable",
      detail: "Leitura automática de QR indisponível neste navegador.",
    };
  try {
    const codes = await new Detector({ formats: ["qr_code"] }).detect(image);
    if (codes.some((code) => isPixPayload(code.rawValue ?? "")))
      return {
        analysis: "detected",
        detail: "QR Pix identificado. A organização ainda precisa confirmar o pagamento.",
      };
    return {
      analysis: "unverified",
      detail: "Nenhum QR Pix foi identificado. O comprovante seguirá para revisão manual.",
    };
  } catch {
    return {
      analysis: "unavailable",
      detail: "Não foi possível ler o QR. O comprovante seguirá para revisão manual.",
    };
  }
}

async function preparePaymentProof(file: File): Promise<PreparedProof> {
  validatePaymentProof(file);
  const image = await loadImage(file);
  if (
    image.naturalWidth <= 0 ||
    image.naturalHeight <= 0 ||
    image.naturalWidth * image.naturalHeight > MAX_PAYMENT_PROOF_PIXELS
  )
    throw Error("A imagem é grande demais. Use um comprovante com até 20 megapixels.");

  const pix = await inspectPix(image);
  const scale = Math.min(
    1,
    2000 / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw Error("Não foi possível preparar o comprovante.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (result) =>
        result
          ? resolve(result)
          : reject(Error("Não foi possível preparar o comprovante.")),
      "image/webp",
      0.92,
    ),
  );
  if (blob.size > MAX_PAYMENT_PROOF_BYTES)
    throw Error("Mesmo otimizada, a imagem ultrapassa 3 MB. Escolha outra.");
  return {
    file: new File([blob], "comprovante.webp", { type: "image/webp" }),
    ...pix,
  };
}

function money(amount: number) {
  return amount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const statusContent: Record<
  PaymentStatus,
  { label: string; icon: typeof Clock3 }
> = {
  pending: { label: "Aguardando confirmação", icon: Clock3 },
  confirmed: { label: "Confirmado", icon: CheckCircle2 },
  rejected: { label: "Revisão solicitada", icon: XCircle },
};

function PaymentBadge({ status }: { status?: PaymentStatus }) {
  if (!status)
    return <span className="payment-status not-sent">Não enviado</span>;
  const content = statusContent[status];
  const Icon = content.icon;
  return (
    <span className={`payment-status ${status}`}>
      <Icon size={14} /> {content.label}
    </span>
  );
}

export function PaymentsView({
  profiles,
  payments,
  month,
  me,
  isAdmin,
  submit,
  review,
}: {
  profiles: Profile[];
  payments: Payment[];
  month: string;
  me: Profile;
  isAdmin: boolean;
  submit: (
    player: Profile,
    month: string,
    amount: number,
    proof: File,
    analysis: PixAnalysis,
  ) => Promise<void>;
  review: (payment: Payment, status: "confirmed" | "rejected") => Promise<void>;
}) {
  const [target, setTarget] = useState<Profile | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const monthly = useMemo(
    () =>
      profiles
        .filter((profile) => profile.membership === "monthly")
        .sort((a, b) => {
          if (!isAdmin && (a.id === me.id || b.id === me.id))
            return a.id === me.id ? -1 : 1;
          return a.display_name.localeCompare(b.display_name, "pt-BR");
        }),
    [profiles, isAdmin, me.id],
  );
  const currentPayments = payments.filter(
    (payment) => payment.payment_month.slice(0, 7) === month,
  );
  const paymentFor = (playerId: string) =>
    currentPayments.find((payment) => payment.player_id === playerId);
  const confirmed = currentPayments.filter(
    (payment) => payment.status === "confirmed",
  ).length;
  const pending = currentPayments.filter(
    (payment) => payment.status === "pending",
  ).length;

  async function changeStatus(
    payment: Payment,
    status: "confirmed" | "rejected",
  ) {
    setReviewing(payment.id);
    setError("");
    try {
      await review(payment, status);
    } catch (reason) {
      setError(friendlyError(reason));
    } finally {
      setReviewing(null);
    }
  }

  return (
    <section className="payments-page" aria-label="Pagamentos dos mensalistas">
      <div className="payment-summary" aria-label="Resumo de pagamentos">
        <article>
          <span>Mensalistas</span>
          <strong>{monthly.length}</strong>
          <small>jogadores no plano mensal</small>
        </article>
        <article>
          <span>Confirmados</span>
          <strong>{isAdmin ? confirmed : paymentFor(me.id)?.status === "confirmed" ? 1 : 0}</strong>
          <small>{isAdmin ? `em ${monthLabel(month)}` : "seu pagamento no mês"}</small>
        </article>
        <article>
          <span>Em análise</span>
          <strong>{isAdmin ? pending : paymentFor(me.id)?.status === "pending" ? 1 : 0}</strong>
          <small>aguardando a organização</small>
        </article>
      </div>

      <div className="payment-security-note">
        <ShieldCheck size={22} />
        <div>
          <strong>Comprovantes protegidos</strong>
          <p>
            As imagens são privadas. Somente o próprio jogador e a organização
            podem acessá-las; a verificação de Pix é apenas um apoio à revisão.
          </p>
        </div>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="section-heading payment-list-heading">
        <div>
          <h2>Mensalistas</h2>
          <p className="muted">
            {monthLabel(month)} · valores e comprovantes têm acesso restrito
          </p>
        </div>
        <span className="badge">{monthly.length} mensalistas</span>
      </div>

      <div className="payment-list">
        {monthly.map((player) => {
          const payment = paymentFor(player.id);
          const canSee = isAdmin || player.id === me.id;
          const canSubmit =
            canSee && (!payment || payment.status === "rejected");
          return (
            <article
              className={`payment-row${player.id === me.id ? " is-me" : ""}`}
              key={player.id}
            >
              <div className="payment-player">
                <span className="payment-avatar">
                  {player.display_name.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <strong>{player.display_name}</strong>
                  <small>
                    Mensalista{player.id === me.id ? " · Você" : ""}
                  </small>
                </div>
              </div>
              <div className="payment-value">
                <span>Valor</span>
                <strong>
                  {canSee && payment ? money(payment.amount) : "—"}
                </strong>
              </div>
              <div className="payment-state">
                {canSee ? (
                  <PaymentBadge status={payment?.status} />
                ) : (
                  <span className="payment-private">
                    <LockKeyhole size={13} /> Privado
                  </span>
                )}
                {canSee && payment && (
                  <small>
                    {payment.pix_analysis === "detected"
                      ? "QR Pix identificado"
                      : "Revisão manual necessária"}
                  </small>
                )}
              </div>
              <div className="payment-actions">
                {canSee && payment?.proof_url && (
                  <a
                    className="secondary"
                    href={payment.proof_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Comprovante <ExternalLink size={15} />
                  </a>
                )}
                {canSubmit && (
                  <button className="primary" onClick={() => setTarget(player)}>
                    {payment ? "Reenviar" : "Registrar pagamento"}
                    <ImagePlus size={17} />
                  </button>
                )}
                {isAdmin && payment?.status === "pending" && (
                  <>
                    <button
                      className="secondary payment-reject"
                      disabled={reviewing === payment.id}
                      onClick={() => changeStatus(payment, "rejected")}
                    >
                      <X size={16} /> Solicitar revisão
                    </button>
                    <button
                      className="primary"
                      disabled={reviewing === payment.id}
                      onClick={() => changeStatus(payment, "confirmed")}
                    >
                      <Check size={16} /> Confirmar
                    </button>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {!monthly.length && (
        <div className="empty">
          <FileCheck2 size={26} />
          <h3>Nenhum mensalista cadastrado</h3>
          <p>Defina os mensalistas na Administração para iniciar o controle.</p>
        </div>
      )}

      {target && (
        <PaymentForm
          key={`${target.id}-${month}`}
          player={target}
          month={month}
          previous={paymentFor(target.id)}
          close={() => setTarget(null)}
          submit={submit}
        />
      )}
    </section>
  );
}

function PaymentForm({
  player,
  month,
  previous,
  close,
  submit,
}: {
  player: Profile;
  month: string;
  previous?: Payment;
  close: () => void;
  submit: (
    player: Profile,
    month: string,
    amount: number,
    proof: File,
    analysis: PixAnalysis,
  ) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [amount, setAmount] = useState(String(previous?.amount ?? "50.00"));
  const [proof, setProof] = useState<PreparedProof | null>(null);
  const [preview, setPreview] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const previewRef = useRef("");

  useEffect(() => {
    dialog.current?.showModal();
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  async function choose(file?: File) {
    if (!file) return;
    setPreparing(true);
    setProof(null);
    setError("");
    try {
      const prepared = await preparePaymentProof(file);
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = URL.createObjectURL(prepared.file);
      setPreview(previewRef.current);
      setProof(prepared);
    } catch (reason) {
      setPreview("");
      setError((reason as Error).message);
    } finally {
      setPreparing(false);
    }
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!validPaymentAmount(numericAmount) || !proof) return;
    setBusy(true);
    setError("");
    try {
      await submit(player, month, numericAmount, proof.file, proof.analysis);
      close();
    } catch (reason) {
      setError(friendlyError(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      className="modal payment-modal"
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) close();
      }}
    >
      <div className="modal-heading">
        <div>
          <span className="eyebrow">REGISTRAR PAGAMENTO</span>
          <h2>{player.display_name}</h2>
        </div>
        <button
          className="icon-button"
          aria-label="Fechar janela"
          disabled={busy}
          onClick={close}
        >
          <X size={20} />
        </button>
      </div>
      <p className="muted payment-modal-intro">
        {monthLabel(month)} · após o envio, o registro ficará aguardando
        confirmação da organização.
      </p>
      <form onSubmit={send}>
        <label>
          Valor pago
          <div className="money-input">
            <span>R$</span>
            <input
              aria-label="Valor pago"
              type="number"
              inputMode="decimal"
              min="0.01"
              max="9999.99"
              step="0.01"
              required
              value={amount}
              disabled={busy}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
        </label>
        <label className="payment-upload">
          <Upload size={22} />
          <strong>Comprovante do Pix</strong>
          <span>JPG, PNG ou WebP · até 3 MB</span>
          <input
            aria-label="Comprovante de pagamento"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            disabled={busy || preparing}
            onChange={(event) => choose(event.target.files?.[0])}
          />
        </label>
        {preparing && <p className="muted">Protegendo e analisando imagem…</p>}
        {proof && (
          <div className={`pix-analysis ${proof.analysis}`}>
            {preview && <img src={preview} alt="Prévia do comprovante" />}
            <div>
              <span>
                <SearchCheck size={18} /> Análise preliminar
              </span>
              <strong>
                {proof.analysis === "detected"
                  ? "Indício de Pix encontrado"
                  : "Confirmação manual necessária"}
              </strong>
              <p>{proof.detail}</p>
            </div>
          </div>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button
          className="primary full"
          disabled={
            busy ||
            preparing ||
            !proof ||
            !validPaymentAmount(Number(amount)) ||
            proof.file.size > MAX_PAYMENT_PROOF_BYTES
          }
        >
          {busy ? "Enviando…" : "Enviar para confirmação"}
          <Check size={18} />
        </button>
      </form>
    </dialog>
  );
}
