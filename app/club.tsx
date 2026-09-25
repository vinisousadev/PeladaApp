"use client";

import {ClubPicker} from "./club-picker";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type CSSProperties,
} from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  ClipboardList,
  Goal,
  History,
  LogOut,
  Plus,
  RefreshCw,
  ShieldCheck,
  Shirt,
  Target,
  Trophy,
  Upload,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { configured, friendlyError, getSupabase } from "@/lib/supabase";
import {
  attendanceWindow,
  startTimestamp,
  scheduleLabel,
  photoStyle,
  currentDate,
  dateLabel,
  monthLabel,
  rankPlayers,
  validTotals,
  type Audit,
  type ClubData,
  type Match,
  type Payment,
  type Performance,
  type Profile,
  type Ranked,
} from "@/lib/model";
import {
  validatePaymentProof,
  validPaymentAmount,
  type PixAnalysis,
} from "@/lib/payments";
import { PlayerCard } from "./player-card";
import { StarEditor } from "./match-star";
import { MatchRow, ScheduleEditor } from "./attendance";
import { PaymentsView } from "./payments";
import { demoData } from "@/lib/demo";

const EMPTY: ClubData = {
  profiles: [],
  sessions: [],
  performances: [],
  attendances: [],
  payments: [],
  slots: [],
  audit: [],
};
type View =
  | "overview"
  | "ranking"
  | "matches"
  | "payments"
  | "players"
  | "profile"
  | "admin";
type AuthMode = "login" | "signup" | "forgot" | "recovery";
const POSITIONS = ["GOL", "DEF", "MEI", "ATA"] as const;

function Brand() {
  return (
    <div className="brand">
      <span className="brand-icon">P/</span>
      <span>
        PELADA<span className="brand-muted">CLUB</span>
      </span>
    </div>
  );
}

function Auth({
  mode,
  setMode,
  onDemo,
}: {
  mode: AuthMode;
  setMode: (m: AuthMode) => void;
  onDemo: () => void;
}) {
  const [displayName, setDisplayName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (mode === "login") {
        const { error } = await sb.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
      if (mode === "signup") {
        const { data, error } = await sb.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: location.origin + "/",
            data: { display_name: displayName.trim() },
          },
        });
        if (error) throw error;
        if (!data.session)
          setNotice(
            "Confira seu e-mail para confirmar o cadastro e depois entre com sua senha.",
          );
      }
      if (mode === "forgot") {
        const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: location.origin + "/?recover=1",
        });
        if (error) throw error;
        setNotice(
          "Se esse e-mail estiver cadastrado, você receberá um link para criar uma nova senha.",
        );
      }
      if (mode === "recovery") {
        const { error } = await sb.auth.updateUser({ password });
        if (error) throw error;
        await sb.auth.signOut();
        history.replaceState(null, "", "/");
        setMode("login");
        setNotice("Senha atualizada. Entre com a nova senha.");
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-story">
        <Brand />
        <div>
          <span className="eyebrow">O SEU FUTEBOL TEM HISTÓRIA.</span>
          <h1>
            O próximo
            <br />
            craque é<br />
            <em>da nossa turma.</em>
          </h1>
          <p>
            Uma carta para cada jogador.
            <br />
            Cada gol e cada passe contam.
          </p>
        </div>
        <div className="auth-bottom">
          <span>24 POR PELADA</span>
          <span>UMA PELADA. NOSSO CLUBE.</span>
        </div>
      </section>
      <section className="auth-form-wrap">
        <div className="auth-form">
          <span className="eyebrow">VESTIÁRIO / PELADA CLUB</span>
          <h2>
            {mode === "login"
              ? "Bora pro jogo."
              : mode === "signup"
                ? "Sua vaga no elenco."
                : mode === "forgot"
                  ? "Recupere seu acesso."
                  : "Uma nova senha."}
          </h2>
          <p>
            {mode === "login"
              ? "Entre para registrar seus números e ver o ranking."
              : mode === "signup"
                ? "Crie sua conta com nome, e-mail e senha para entrar no clube."
                : mode === "forgot"
                  ? "Enviaremos um link para o seu e-mail."
                  : "Escolha uma senha com pelo menos 8 caracteres."}
          </p>
          {!configured && (
            <div className="notice">
              Estamos preparando o acesso da turma. Enquanto isso, você pode
              explorar a demonstração.
            </div>
          )}
          <form onSubmit={submit}>
            {mode === "signup" && (
              <label>
                Nome na carta
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  minLength={2}
                  maxLength={32}
                  autoComplete="nickname"
                  required
                  disabled={!configured || busy}
                />
              </label>
            )}
            {mode !== "recovery" && (
              <label>
                E-mail
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  disabled={!configured || busy}
                />
              </label>
            )}
            {mode !== "forgot" && (
              <label>
                Senha
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={mode === "login" ? 1 : 8}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  required
                  disabled={!configured || busy}
                />
              </label>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p className="success" role="status">
                {notice}
              </p>
            )}
            <button
              className="primary full"
              disabled={
                !configured ||
                busy ||
                (mode === "signup" && displayName.trim().length < 2)
              }
            >
              {busy
                ? "Aguarde…"
                : mode === "login"
                  ? "Entrar no clube"
                  : mode === "signup"
                    ? "Criar minha conta"
                    : mode === "forgot"
                      ? "Enviar link"
                      : "Salvar nova senha"}
              <ArrowUpRight size={18} />
            </button>
          </form>
          <div className="auth-links">
            {mode === "login" ? (
              <>
                <button
                  onClick={() => {
                    setMode("forgot");
                    setError("");
                    setNotice("");
                  }}
                >
                  Esqueci minha senha
                </button>
                <button
                  onClick={() => {
                    setMode("signup");
                    setError("");
                    setNotice("");
                  }}
                >
                  Criar conta
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setMode("login");
                  setError("");
                  setNotice("");
                }}
              >
                Voltar para entrar
              </button>
            )}
          </div>
          {mode !== "recovery" && (
            <button className="secondary full demo-entry" onClick={onDemo}>
              Explorar demonstração <ChevronRight size={17} />
            </button>
          )}
          <small>Gols e assistências registrados por quem joga.</small>
        </div>
      </section>
    </main>
  );
}

export default function Club() {
  const [authMode, setAuthMode] = useState<AuthMode>("login"),
    [ready, setReady] = useState(false),
    [userId, setUserId] = useState<string | null>(null),
    [demo, setDemo] = useState(false),
    [demoRole, setDemoRole] = useState<"player" | "admin">("player");
  const [data, setData] = useState<ClubData>(EMPTY),
    [month, setMonth] = useState(currentDate().slice(0, 7)),
    [sort, setSort] = useState<"points" | "goals" | "assists">("points"),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [viewHistory, setViewHistory] = useState<View[]>(["overview"]);
  const view = viewHistory[viewHistory.length - 1];
  const setView = useCallback((next: View) => {
    setViewHistory((stack) =>
      next === stack[stack.length - 1]
        ? stack
        : next === "overview"
          ? ["overview"]
          : [...stack, next],
    );
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);
  const navigation = {
    goBack: () => {
      setViewHistory((stack) =>
        stack.length > 1 ? stack.slice(0, -1) : ["overview"],
      );
      window.scrollTo({ top: 0, behavior: "instant" });
    },
  };
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null),
    [editing, setEditing] = useState<{
      session: Match;
      player: Profile;
    } | null>(null);
  const me = data.profiles.find((p) => p.id === (demo ? "demo-0" : userId));
  const isAdmin = demo ? demoRole === "admin" : me?.role === "admin";
  const ranked = rankPlayers(data, month, sort),
    ownRank = rankPlayers(data, month).find((p) => p.id === me?.id);
  const requestVersion = useRef(0);
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setReady(true);
      return;
    }
    if (new URLSearchParams(location.search).get("recover") === "1")
      setAuthMode("recovery");
    const hash = new URLSearchParams(location.hash.slice(1));
    if (hash.has("error_description"))
      setError(
        "O link expirou ou não é válido. Solicite um novo link de recuperação.",
      );
    let live = true;
    sb.auth.getSession().then(({ data, error }) => {
      if (!live) return;
      if (error) setError(friendlyError(error));
      setUserId(data.session?.user.id ?? null);
      setReady(true);
    });
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user.id ?? null);
      if (event === "PASSWORD_RECOVERY") setAuthMode("recovery");
      if (event === "SIGNED_OUT") {
        requestVersion.current++;
        setData(EMPTY);
        setView("overview");
      }
    });
    return () => {
      live = false;
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  const load = useCallback(
    async (silent = false) => {
      const sb = getSupabase();
      if (!sb || !userId || demo) return;
      const request = ++requestVersion.current;
      if (!silent) setLoading(true);
      try {
        const results = await Promise.all([
          sb.from("profiles").select("*"),
          sb
            .from("sessions")
            .select("*")
            .order("played_on", { ascending: false }),
          sb.from("performances").select("*"),
          sb.from("attendances").select("*"),
          sb.from("payments").select("*").order("submitted_at", { ascending: false }),
        ]);
        for (const r of results) if (r.error) throw r.error;
        const profiles = (results[0].data ?? []) as Profile[];
        const paths = profiles
          .map((p) => p.photo_path)
          .filter((x): x is string => Boolean(x));
        if (paths.length) {
          const { data: urls, error } = await sb.storage
            .from("player-photos")
            .createSignedUrls(paths, 3600);
          if (error) throw error;
          profiles.forEach((p) => {
            p.photo_url =
              urls?.find((u) => u.path === p.photo_path)?.signedUrl ??
              undefined;
          });
        }
        const payments = (results[4].data ?? []) as Payment[];
        const proofPaths = payments.map((payment) => payment.proof_path);
        if (proofPaths.length) {
          const { data: urls, error } = await sb.storage
            .from("payment-proofs")
            .createSignedUrls(proofPaths, 900);
          if (error) throw error;
          payments.forEach((payment) => {
            payment.proof_url =
              urls?.find((url) => url.path === payment.proof_path)?.signedUrl ??
              undefined;
          });
        }
        const admin = profiles.find((p) => p.id === userId)?.role === "admin";
        let slots: ClubData["slots"] = [],
          audit: Audit[] = [];
        if (admin) {
          const [s, a] = await Promise.all([
            sb.from("roster_slots").select("*").order("created_at"),
            sb
              .from("audit_log")
              .select("*")
              .order("created_at", { ascending: false })
              .limit(100),
          ]);
          if (s.error) throw s.error;
          if (a.error) throw a.error;
          slots = s.data ?? [];
          audit = a.data ?? [];
        }
        if (request !== requestVersion.current) return;
        setData({
          profiles,
          sessions: results[1].data ?? [],
          performances: results[2].data ?? [],
          attendances: results[3].data ?? [],
          payments,
          slots,
          audit,
        });
        setError("");
      } catch (e) {
        if (request === requestVersion.current) setError(friendlyError(e));
      } finally {
        if (request === requestVersion.current) setLoading(false);
      }
    },
    [userId, demo],
  );
  useEffect(() => {
    void load();
    if (!userId || demo) return;
    const timer = setInterval(() => {
      if (!document.hidden) void load(true);
    }, 30000);
    const focus = () => void load(true);
    window.addEventListener("focus", focus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", focus);
      requestVersion.current++;
    };
  }, [load, userId, demo]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6500);
    return () => clearTimeout(timer);
  }, [notice]);
  function enterDemo() {
    requestVersion.current++;
    setDemo(true);
    setData(demoData());
    setDemoRole("player");
    setView("overview");
    setAuthMode("login");
    setError("");
    setMonth(currentDate().slice(0, 7));
    setLoading(false);
  }
  async function logout() {
    if (demo) {
      setDemo(false);
      setData(EMPTY);
      setView("overview");
      return;
    }
    const { error } = await getSupabase()!.auth.signOut();
    if (error) setError(friendlyError(error));
  }
  async function savePerformance(
    session: Match,
    player: Profile,
    goals: number,
    assists: number,
    previous: Performance | undefined,
  ) {
    if (session.status === 'cancelled') throw Error('Esta pelada foi cancelada');
    if (!validTotals(goals, assists)) throw Error("invalid");
    if (
      !data.attendances.some(
        (a) => a.session_id === session.id && a.player_id === player.id && a.status !== "waiting",
      )
    )
      throw Error("Confirme sua presença");
    if (!previous && !attendanceWindow(session).started)
      throw Error("após o início");
    if (demo) {
      const id = previous?.id ?? crypto.randomUUID();
      const next: Performance = {
        id,
        session_id: session.id,
        player_id: player.id,
        goals,
        assists,
        revision: (previous?.revision ?? 0) + 1,
        updated_at: new Date().toISOString(),
      };
      setData((d) => ({
        ...d,
        performances: [...d.performances.filter((p) => p.id !== id), next],
        audit: [
          {
            id: Date.now(),
            actor_id: me!.id,
            performance_id: id,
            action: previous ? "UPDATE" : "INSERT",
            created_at: new Date().toISOString(),
            old_values: previous ?? null,
            new_values: next,
          },
          ...d.audit,
        ],
      }));
    } else {
      const sb = getSupabase()!;
      if (previous) {
        const { data: rows, error } = await sb
          .from("performances")
          .update({ goals, assists })
          .eq("id", previous.id)
          .eq("revision", previous.revision)
          .select();
        if (error) throw error;
        if (!rows?.length) throw Error("conflict");
      } else {
        const { error } = await sb
          .from("performances")
          .insert({
            session_id: session.id,
            player_id: player.id,
            goals,
            assists,
          });
        if (error) throw error;
      }
      await load();
    }
    setNotice("Desempenho salvo. O ranking já foi atualizado.");
  }
  async function submitPayment(
    player: Profile,
    paymentMonth: string,
    amount: number,
    proof: File,
    analysis: PixAnalysis,
  ) {
    if (player.membership !== "monthly")
      throw Error("O pagamento é exclusivo para mensalistas.");
    if (!validPaymentAmount(amount)) throw Error("Valor de pagamento inválido.");
    validatePaymentProof(proof);
    const previous = data.payments.find(
      (payment) =>
        payment.player_id === player.id &&
        payment.payment_month.slice(0, 7) === paymentMonth,
    );
    if (previous?.status === "confirmed")
      throw Error("Este pagamento já foi confirmado.");
    if (previous?.status === "pending")
      throw Error("Este pagamento já aguarda confirmação.");

    if (demo) {
      const payment: Payment = {
        id: previous?.id ?? crypto.randomUUID(),
        player_id: player.id,
        payment_month: `${paymentMonth}-01`,
        amount,
        proof_path: `${player.id}/${paymentMonth}/${crypto.randomUUID()}.webp`,
        proof_url: await fileAsDataURL(proof),
        status: "pending",
        pix_analysis: analysis,
        submitted_by: me!.id,
        submitted_at: new Date().toISOString(),
        reviewed_by: null,
        reviewed_at: null,
      };
      setData((current) => ({
        ...current,
        payments: [
          ...current.payments.filter((item) => item.id !== payment.id),
          payment,
        ],
      }));
    } else {
      const sb = getSupabase()!;
      const path = `${player.id}/${paymentMonth}/${crypto.randomUUID()}.webp`;
      const { error: uploadError } = await sb.storage
        .from("payment-proofs")
        .upload(path, proof, {
          contentType: "image/webp",
          cacheControl: "3600",
          upsert: false,
        });
      if (uploadError) throw uploadError;
      const { error: saveError } = await sb.rpc("submit_payment", {
        p_player_id: player.id,
        p_month: `${paymentMonth}-01`,
        p_amount: amount,
        p_proof_path: path,
        p_pix_analysis: analysis,
      });
      if (saveError) {
        await sb.storage.from("payment-proofs").remove([path]);
        throw saveError;
      }
      if (previous?.proof_path)
        await sb.storage.from("payment-proofs").remove([previous.proof_path]);
      await load();
    }
    setNotice("Pagamento enviado. Agora ele aguarda confirmação da organização.");
  }
  async function reviewPayment(
    payment: Payment,
    status: "confirmed" | "rejected",
  ) {
    if (!isAdmin) throw Error("Apenas o administrador pode revisar pagamentos.");
    if (demo) {
      setData((current) => ({
        ...current,
        payments: current.payments.map((item) =>
          item.id === payment.id
            ? {
                ...item,
                status,
                reviewed_by: me!.id,
                reviewed_at: new Date().toISOString(),
              }
            : item,
        ),
      }));
    } else {
      const { error } = await getSupabase()!.rpc("review_payment", {
        p_payment_id: payment.id,
        p_status: status,
      });
      if (error) throw error;
      await load();
    }
    setNotice(
      status === "confirmed"
        ? "Pagamento confirmado."
        : "Revisão solicitada; o mensalista já pode reenviar o comprovante.",
    );
  }
  async function setMembership(player: Profile, membership: 'monthly' | 'guest') {
 if(demo){
 if(membership==='monthly' && player.membership!=='monthly' && data.profiles.filter(p=>p.membership==='monthly').length>=24) throw Error('24 mensalistas');
 setData(d=>({...d,profiles:d.profiles.map(p=>p.id===player.id?{...p,membership}:p)}));
 }else{const {error}=await getSupabase()!.rpc('set_membership',{p_player_id:player.id,p_membership:membership});if(error)throw error;await load();}
 setNotice('Tipo de jogador atualizado. A confirmação automática vale para novas peladas.');
 }
 async function createMatch(name: string, date: string, time: string) {
    if (demo) {
      const sessionId=crypto.randomUUID();
      setData((d) => ({
        ...d,
        sessions: [
          {
            id: sessionId,
            name,
            played_on: date,
            starts_at: startTimestamp(date, time),
            status: "open",
            created_by: me!.id,
          },
          ...d.sessions,
 ],
 attendances:[...d.attendances,...d.profiles.filter(p=>p.membership==='monthly').map(p=>({session_id:sessionId,player_id:p.id,confirmed_at:new Date().toISOString(),status:'confirmed' as const}))],
 }));
    } else {
      const { error } = await getSupabase()!
        .from("sessions")
        .insert({
          name,
          played_on: date,
          starts_at: startTimestamp(date, time),
          created_by: userId,
        });
      if (error) throw error;
      await load();
    }
    setNotice("Pelada criada. Mensalistas confirmados automaticamente; inscrições abertas para convidados.");
  }
  async function setAttendance(session: Match, confirm: boolean) {
    if (demo) {
      const own=data.attendances.find(a=>a.session_id===session.id && a.player_id===me!.id);
 const window=attendanceWindow(session);
 if(confirm && own || !confirm && !own)return;
 if(confirm && !window.canConfirm)throw Error('confirmações encerraram');
 if(!confirm && !window.canCancel)throw Error('cancelamento encerrou');
 if(!confirm && data.performances.some(p=>p.session_id===session.id && p.player_id===me!.id))throw Error('Já existe desempenho');
 setData(d=>{
 let attendances=d.attendances.filter(a=>!(a.session_id===session.id && a.player_id===me!.id));
 if(confirm)attendances.push({session_id:session.id,player_id:me!.id,confirmed_at:new Date().toISOString(),status:'waiting',queue_order:Math.max(0,...d.attendances.map(a=>a.queue_order??0))+1});
 const free=24-attendances.filter(a=>a.session_id===session.id && a.status!=='waiting').length;
 const promoted=new Set(attendances.filter(a=>a.session_id===session.id && a.status==='waiting').sort((a,b)=>(a.queue_order??0)-(b.queue_order??0)).slice(0,free).map(a=>a.player_id));
 attendances=attendances.map(a=>a.session_id===session.id && promoted.has(a.player_id)?{...a,status:'confirmed' as const}:a);
 return {...d,attendances};
 });
    } else {
      const { error } = await getSupabase()!.rpc("set_attendance", {
        p_session_id: session.id,
        p_confirm: confirm,
      });
      if (error) {
        void load(true);
        throw error;
      }
      await load();
    }
    setNotice(
      confirm
        ? "Inscrição realizada! Confira abaixo sua confirmação ou posição na lista de espera."
        : "Inscrição cancelada. A fila foi atualizada automaticamente.",
    );
  }
  async function scheduleMatch(session: Match, date: string, time: string) {
    const starts_at = startTimestamp(date, time);
    if (demo)
      setData((d) => ({
        ...d,
        sessions: d.sessions.map((s) =>
          s.id === session.id ? { ...s, starts_at, played_on: date } : s,
        ),
      }));
    else {
      const { error } = await getSupabase()!
        .from("sessions")
        .update({ starts_at })
        .eq("id", session.id);
      if (error) throw error;
      await load();
    }
    setNotice("Data e horário atualizados.");
  }
  async function saveStar(match: Match, playerId: string|null) {
 if(demo){
 if(match.status==='cancelled')throw Error('Esta pelada foi cancelada');
 if(playerId && !data.attendances.some(a=>a.session_id===match.id&&a.player_id===playerId&&a.status!=='waiting'))throw Error('O craque precisa ser um participante confirmado.');
 setData(d=>({...d,sessions:d.sessions.map(s=>s.id===match.id?{...s,star_player_id:playerId}:s)}));
 }else{const {data:changed,error}=await getSupabase()!.from('sessions').update({star_player_id:playerId}).eq('id',match.id).select();if(error)throw error;await load();if(!changed?.length)throw Error('conflict');}
 setNotice(playerId?'Craque escolhido! A carta está disponível na pelada.':'Destaque removido da pelada.');
 }
 async function cancelMatch(match: Match) {
 if(!match.starts_at || Date.now()>=Date.parse(match.starts_at)) throw Error('Só é possível cancelar a pelada antes do início');
 if(demo) setData(d=>({...d,sessions:d.sessions.map(s=>s.id===match.id?{...s,status:'cancelled' as const}:s)}));
 else {
 const {data:changed,error}=await getSupabase()!.from('sessions').update({status:'cancelled'}).eq('id',match.id).eq('status',match.status).select();
 if(error) throw error;
 await load();
 if(!changed?.length) throw Error('conflict');
 }
 setNotice('Pelada cancelada. Inscrições e registros estão bloqueados.');
 }
 async function toggleMatch(match: Match) {
    try {
      const status = match.status === "open" ? "closed" : "open";
      if (demo)
        setData((d) => ({
          ...d,
          sessions: d.sessions.map((s) =>
            s.id === match.id ? { ...s, status } : s,
          ),
        }));
      else {
        const { data: changed, error } = await getSupabase()!
          .from("sessions")
          .update({ status })
          .eq("id", match.id)
          .eq("status", match.status)
          .select();
        if (error) throw error;
        if (!changed?.length) {
          await load();
          throw Error("conflict");
        }
        await load();
      }
      setNotice(
        status === "closed"
          ? "Pelada encerrada. Você ainda pode corrigir os registros."
          : "Pelada reaberta para registros.",
      );
    } catch (e) {
      setError(friendlyError(e));
    }
  }
  async function saveProfile(profile: Profile, file: File | null) {
    if (demo) {
      const photo_url = file ? await fileAsDataURL(file) : profile.photo_url;
      setData((d) => ({
        ...d,
        profiles: d.profiles.map((p) =>
          p.id === profile.id ? { ...profile, photo_url } : p,
        ),
      }));
    } else {
      const sb = getSupabase()!;
      let path = profile.photo_path;
      const oldPath = path;
      if (file) {
        path = `${userId}/${crypto.randomUUID()}.webp`;
        const { error } = await sb.storage
          .from("player-photos")
          .upload(path, file, { contentType: "image/webp", upsert: false });
        if (error) throw error;
      }
      const { data: updated, error } = await sb
        .from("profiles")
        .update({
          display_name: profile.display_name,
          position: profile.position,
          photo_y: profile.photo_y,
          photo_x: profile.photo_x ?? 50,
          photo_zoom: profile.photo_zoom ?? 1,
          photo_path: path,
          favorite_club_id: profile.favorite_club_id ?? null,
        })
        .eq("id", userId)
        .select();
      if (error || !updated?.length) {
        if (file && path) await sb.storage.from("player-photos").remove([path]);
        throw error ?? Error("profile");
      }
      if (file && oldPath)
        await sb.storage.from("player-photos").remove([oldPath]);
      await load();
    }
    setNotice("Sua carta foi atualizada.");
  }
  if (!ready)
    return (
      <main className="loading">
        <Brand />
        <p>Preparando o vestiário…</p>
      </main>
    );
  if ((!userId && !demo) || authMode === "recovery")
    return (
      <>
        {error && (
          <div className="global-error" role="alert">
            {error}
            <button aria-label="Fechar aviso" onClick={() => setError("")}>
              <X size={18} />
            </button>
          </div>
        )}
        <Auth mode={authMode} setMode={setAuthMode} onDemo={enterDemo} />
      </>
    );
  if (!me)
    return (
      <main className="loading">
        <Brand />
        <h1>
          {loading ? "Carregando sua turma…" : "Não encontramos seu perfil."}
        </h1>
        <p>
          {error ||
            "Não foi possível carregar seu perfil. Tente novamente ou fale com o organizador."}
        </p>
        <button className="primary" onClick={() => load()}>
          Tentar novamente
        </button>
        <button className="secondary" onClick={logout}>
          Sair
        </button>
      </main>
    );
  const nav = [
    { id: "overview", label: "Visão geral", icon: Trophy },
    { id: "ranking", label: "Ranking", icon: ClipboardList },
    { id: "matches", label: "Peladas", icon: Goal },
    { id: "payments", label: "Pagamentos", icon: WalletCards },
    { id: "players", label: "Elenco", icon: Users },
    { id: "profile", label: "Minha carta", icon: Shirt },
    ...(isAdmin
      ? [{ id: "admin", label: "Administração", icon: ShieldCheck }]
      : []),
  ];
  const monthlyMatches = data.sessions.filter((s) =>
    s.played_on.startsWith(month),
  );
  return (
    <div className="app-shell">
      {demo && (
        <div className="demo-bar">
          <span>
            <strong>Demonstração</strong> · Dados fictícios; alterações duram
            nesta visita.
          </span>
          <label>
            Testar como
            <select
              value={demoRole}
              onChange={(e) => {
                setDemoRole(e.target.value as "player" | "admin");
                setEditing(null);
                setView("overview");
              }}
            >
              <option value="player">Jogador</option>
              <option value="admin">Administrador</option>
            </select>
          </label>
        </div>
      )}
      <header className="app-header">
        <Brand />
        <div className="header-user">
          <span className="avatar">
            {me.display_name.slice(0, 2).toUpperCase()}
          </span>
          <span>
            {me.display_name}
            <small>{isAdmin ? "Administrador" : "Jogador"}</small>
          </span>
          <button
            className="icon-button"
            aria-label="Sair da conta"
            onClick={logout}
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>
      <div className="workspace">
        <aside className="sidebar">
          <nav aria-label="Navegação principal">
            {nav.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={view === id ? "active" : ""}
                aria-current={view === id ? "page" : undefined}
                onClick={() => {
                  setView(id as View);
                  setSelectedPlayer(null);
                }}
              >
                <Icon size={20} />
                {label}
                {id === "players" && (
                  <span className="nav-count">{data.profiles.length}</span>
                )}
              </button>
            ))}
          </nav>
          <div className="sidebar-note">
            <span className="mini-mark">P/</span>
            <p>
              O clube é nosso.
              <br />A história também.
            </p>
            <small>PELADA CLUB / 01</small>
          </div>
        </aside>
        <main className="main-content">
          {view !== "overview" && (
            <button
              className="text-button back-button"
              onClick={navigation.goBack}
            >
              <ArrowLeft size={18} /> Voltar
            </button>
          )}
          <div className="page-top">
            <div>
              <span className="eyebrow">
                {view === "admin"
                  ? "NA ORGANIZAÇÃO"
                  : view === "profile"
                    ? "SUA IDENTIDADE"
                    : view === "payments"
                      ? "EM DIA COM A RESENHA"
                    : "TEMPORADA DO CLUBE"}
              </span>
              <h1>
                {view === "overview"
                  ? "Seu futebol em destaque."
                  : view === "ranking"
                    ? "O ranking da turma."
                    : view === "matches"
                      ? "Dentro de campo."
                      : view === "payments"
                        ? "Mensalidade sem complicação."
                      : view === "players"
                        ? "Nosso elenco."
                        : view === "profile"
                          ? "Essa carta é sua."
                          : "Tudo sob controle."}
              </h1>
            </div>
            <label className="month-picker">
              {view === "payments" ? "Mês do pagamento" : "Mês do ranking"}
              <input
                aria-label={
                  view === "payments" ? "Mês do pagamento" : "Mês do ranking"
                }
                type="month"
                value={month}
                onChange={(e) => {
                  if (e.target.value) setMonth(e.target.value);
                }}
              />
            </label>
          </div>
          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <button onClick={() => load()}>
                <RefreshCw size={16} /> Tentar novamente
              </button>
            </div>
          )}
          {notice && (
            <div className="toast" role="status">
              <Check size={18} />
              {notice}
              <button aria-label="Fechar" onClick={() => setNotice("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {view === "overview" && (
            <>
              <div className="player-home">
                <section
                  className="player-hero"
                  aria-label="Meu perfil e desempenho"
                >
                  <div className="hero-card">
                    {ownRank && (
                      <PlayerCard player={ownRank} month={month} large />
                    )}
                  </div>
                  <div className="hero-copy">
                    <span className="eyebrow">ESSA HISTÓRIA É SUA</span>
                    <h2>{me.display_name}</h2>
                    <p>
                      Sua carta, seus números e a próxima pelada. Tudo começa
                      aqui.
                    </p>
                    <span className="hero-rank">
                      <Trophy size={18} />
                      {ownRank?.rank ?? 1}º no ranking de {monthLabel(month)}
                    </span>
                    <div className="personal-numbers">
                      <span>
                        <b>{ownRank?.goals ?? 0}</b>gols
                      </span>
                      <span>
                        <b>{ownRank?.assists ?? 0}</b>assistências
                      </span>
                      <span>
                        <b>{ownRank?.played ?? 0}</b>peladas
                      </span>
                      <span>
                        <b>{ownRank?.points ?? 50}</b>pontos
                      </span>
                    </div>
                    <div className="hero-actions">
                      <button
                        className="primary"
                        onClick={() => setView("profile")}
                      >
                        Editar minha carta <Shirt size={18} />
                      </button>
                      <button
                        className="secondary"
                        onClick={() => setView("matches")}
                      >
                        Ver peladas <ArrowUpRight size={18} />
                      </button>
                    </div>
                  </div>
                </section>
                <section className="ranking-panel">
                  <div className="section-heading">
                    <h2>Na briga pelo topo</h2>
                    <span className="muted">
                      {data.profiles.length} jogadores
                    </span>
                  </div>
                  <div className="segmented" aria-label="Critério do ranking">
                    {(
                      [
                        { key: "points", label: "Geral" },
                        { key: "goals", label: "Gols" },
                        { key: "assists", label: "Assistências" },
                      ] as const
                    ).map((s) => (
                      <button
                        key={s.key}
                        aria-pressed={sort === s.key}
                        onClick={() => setSort(s.key)}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <div className="home-ranking-feature">
                    {ranked[0] && (
                      <button
                        className="leader-showcase"
                        onClick={() => setSelectedPlayer(ranked[0].id)}
                        aria-label={
                          "Ver carta do líder " + ranked[0].display_name
                        }
                      >
                        <span className="leader-kicker">
                          <Trophy size={19} /> NO TOPO DO RANKING
                        </span>
                        <PlayerCard player={ranked[0]} month={month} large />
                        <span className="leader-caption">
                          {ranked[0].rank}º ·{" "}
                          {sort === "goals"
                            ? ranked[0].goals + " gols"
                            : sort === "assists"
                              ? ranked[0].assists + " assistências"
                              : ranked[0].points + " pontos"}
                        </span>
                      </button>
                    )}
                    <Ranking
                      rows={ranked.slice(0, 5)}
                      me={me.id}
                      onSelect={setSelectedPlayer}
                    />
                  </div>
                  <button
                    className="text-button full-ranking-link"
                    onClick={() => setView("ranking")}
                  >
                    Ver ranking completo <ChevronRight size={16} />
                  </button>
                  <p className="ranking-rule">
                    Todos começam em <b>50</b>. Gol: <b>+3</b>. Assistência:{" "}
                    <b>+2</b>.<br />
                    Limite de <b>100 pontos</b> por mês. A nota reinicia em 50
                    no próximo mês.
                    <br />
                    Desempate por gols, depois assistências. Empates finais
                    dividem a posição.
                  </p>
                </section>
              </div>
              <section className="section-space">
                <div className="section-heading">
                  <h2>Peladas do mês</h2>
                  <button
                    className="text-button"
                    onClick={() => setView("matches")}
                  >
                    Ver peladas <ChevronRight size={16} />
                  </button>
                </div>
                {monthlyMatches.length ? (
                  monthlyMatches.slice(0, 3).map((s) => (
                    <MatchRow
                      key={s.id}
                      confirmed={data.attendances.some(
                        (a) => a.session_id === s.id && a.player_id === me.id && a.status !== "waiting",
                      )}
                      participants={data.attendances
                        .filter((a) => a.session_id === s.id && a.status !== "waiting")
                        .map((a) =>
                          data.profiles.find((p) => p.id === a.player_id),
                        )
                        .filter((p): p is Profile => Boolean(p))}
                      waiting={data.attendances.filter(a=>a.session_id===s.id && a.status==='waiting').sort((a,b)=>(a.queue_order??0)-(b.queue_order??0)).map(a=>data.profiles.find(p=>p.id===a.player_id)).filter((p): p is Profile=>Boolean(p))}
 star={rankPlayers(data,s.played_on.slice(0,7)).find(p=>p.id===s.star_player_id)}
 starTotal={data.profiles.length}
 starPerformance={data.performances.find(p=>p.session_id===s.id&&p.player_id===s.star_player_id)}
 meId={me.id}
 onAttendance={(confirm) => setAttendance(s, confirm)}
                      match={s}
                      performance={data.performances.find(
                        (p) => p.session_id === s.id && p.player_id === me.id,
                      )}
                      onClick={() => setEditing({ session: s, player: me })}
                      isAdmin={isAdmin}
                    />
                  ))
                ) : (
                  <Empty
                    title="Nenhuma pelada neste mês."
                    text={
                      isAdmin
                        ? "Crie uma pelada na Administração."
                        : "O organizador vai adicionar os próximos jogos."
                    }
                  />
                )}
              </section>
            </>
          )}
          {view === "ranking" && (
            <section
              className="ranking-panel complete-ranking"
              aria-label="Ranking completo do mês"
            >
              <div className="section-heading">
                <div>
                  <h2>Classificação completa</h2>
                  <p className="muted">
                    {monthLabel(month)} · {data.profiles.length} jogadores
                  </p>
                </div>
                <span className="badge">Nota mensal · 50 a 100</span>
              </div>
              <div
                className="segmented"
                aria-label="Critério do ranking completo"
              >
                {(
                  [
                    { key: "points", label: "Geral" },
                    { key: "goals", label: "Gols" },
                    { key: "assists", label: "Assistências" },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.key}
                    aria-pressed={sort === s.key}
                    onClick={() => setSort(s.key)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <section className="podium-section" aria-label="Top 3 do ranking">
                <div className="podium-heading">
                  <span className="eyebrow">OS NOMES DA RESENHA</span>
                  <h2>O pódio da turma</h2>
                  <p>
                    {sort === "goals"
                      ? "Os artilheiros do mês"
                      : sort === "assists"
                        ? "Os donos do último passe"
                        : "Os destaques do mês"}
                  </p>
                </div>
                <div className="podium-grid">
                  {ranked.slice(0, 3).map((p, i) => (
                    <button
                      key={p.id}
                      className={"podium-player podium-place-" + (i + 1)}
                      onClick={() => setSelectedPlayer(p.id)}
                      aria-label={p.rank + "º no ranking: " + p.display_name}
                    >
                      <span className="podium-medal">
                        <Trophy size={i === 0 ? 26 : 20} />
                        <b>{p.rank}º</b>
                      </span>
                      <PlayerCard player={p} month={month} />
                      <span className="podium-score">
                        <strong>
                          {sort === "goals"
                            ? p.goals
                            : sort === "assists"
                              ? p.assists
                              : p.points}
                        </strong>
                        {sort === "goals"
                          ? "GOLS"
                          : sort === "assists"
                            ? "ASSISTÊNCIAS"
                            : "PONTOS"}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="podium-footnote">
                  Top 3 da lista selecionada · empates mantêm a mesma colocação.
                </p>
              </section>
              <Ranking rows={ranked} me={me.id} onSelect={setSelectedPlayer} />
              <p className="ranking-rule">
                Todos começam em <b>50</b>. Gol: <b>+3</b>. Assistência:{" "}
                <b>+2</b>. Limite: <b>100</b>.<br />
                Desempate por gols, depois assistências. Empates finais dividem
                a posição.
                <br />
                Toque no nome de um jogador para ver sua carta.
              </p>
            </section>
          )}
          {view === "matches" && (
            <section>
              <div className="section-heading">
                <div>
                  <h2>Seus gols. Seus passes.</h2>
                  <p className="muted">
                    Reserve sua vaga antes do início. Cancelamentos até uma hora
                    antes. Depois do início, registre seus gols e assistências.
                    Horários de João Pessoa (PB).
                  </p>
                </div>
              </div>
              {monthlyMatches.length ? (
                monthlyMatches.map((s) => (
                  <MatchRow
                    key={s.id}
                    confirmed={data.attendances.some(
                      (a) => a.session_id === s.id && a.player_id === me.id && a.status !== "waiting",
                    )}
                    participants={data.attendances
                      .filter((a) => a.session_id === s.id && a.status !== "waiting")
                      .map((a) =>
                        data.profiles.find((p) => p.id === a.player_id),
                      )
                      .filter((p): p is Profile => Boolean(p))}
                    waiting={data.attendances.filter(a=>a.session_id===s.id && a.status==='waiting').sort((a,b)=>(a.queue_order??0)-(b.queue_order??0)).map(a=>data.profiles.find(p=>p.id===a.player_id)).filter((p): p is Profile=>Boolean(p))}
 star={rankPlayers(data,s.played_on.slice(0,7)).find(p=>p.id===s.star_player_id)}
 starTotal={data.profiles.length}
 starPerformance={data.performances.find(p=>p.session_id===s.id&&p.player_id===s.star_player_id)}
 meId={me.id}
 onAttendance={(confirm) => setAttendance(s, confirm)}
                    match={s}
                    performance={data.performances.find(
                      (p) => p.session_id === s.id && p.player_id === me.id,
                    )}
                    onClick={() => setEditing({ session: s, player: me })}
                    isAdmin={isAdmin}
                  />
                ))
              ) : (
                <Empty
                  title="Sem peladas neste mês"
                  text="Selecione outro mês ou aguarde o organizador criar uma pelada."
                />
              )}
            </section>
          )}
          {view === "payments" && (
            <PaymentsView
              profiles={data.profiles}
              payments={data.payments}
              month={month}
              me={me}
              isAdmin={isAdmin}
              submit={submitPayment}
              review={reviewPayment}
            />
          )}
          {view === "players" && (
            <section>
              <div className="section-heading">
                <h2>{data.profiles.length} jogadores, um clube.</h2>
                <span className="muted">{monthLabel(month)}</span>
              </div>
              <div className="roster-grid">
                {rankPlayers(data, month).map((p) => (
                  <button
                    className="roster-card"
                    key={p.id}
                    onClick={() => setSelectedPlayer(p.id)}
                    aria-label={`Ver carta de ${p.display_name}`}
                  >
                    <PlayerCard player={p} month={month} />
                    <span className="roster-caption">
                      {p.rank}º NO RANKING <ChevronRight size={14} />
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
          {view === "profile" && ownRank && (
            <ProfileEditor
              key={me.id}
              player={ownRank}
              month={month}
              save={saveProfile}
            />
          )}
          {view === "admin" && isAdmin && (
            <Admin
              data={data}
              month={month}
              createMatch={createMatch}
              toggleMatch={toggleMatch}
              cancelMatch={cancelMatch}
              saveStar={saveStar}
              scheduleMatch={scheduleMatch}
 setMembership={setMembership}
              onEdit={(session, player) => setEditing({ session, player })}
            />
          )}
          <footer className="footer">
            <span>PELADA CLUB</span>
            <span>
              {demo ? "Demonstração interativa" : "Gol · Assistência · Resenha"}
            </span>
            <button
              className="text-button"
              disabled={loading || demo}
              onClick={() => load()}
            >
              <RefreshCw size={13} />
              {loading ? "Atualizando…" : "Atualizar"}
            </button>
          </footer>
        </main>
      </div>
      {selectedPlayer && (
        <Modal
          title="Carta do jogador"
          onClose={() => setSelectedPlayer(null)}
        >
          <div className="player-modal">
            <PlayerCard
              player={
                rankPlayers(data, month).find((p) => p.id === selectedPlayer)!
              }
              month={month}
              large
            />
            <p>{monthLabel(month)} · Pontuação por gols e assistências</p>
          </div>
        </Modal>
      )}
      {editing && (
        <PerformanceEditor
          session={editing.session}
          player={editing.player}
          previous={data.performances.find(
            (p) =>
              p.session_id === editing.session.id &&
              p.player_id === editing.player.id,
          )}
          isAdmin={isAdmin}
          save={savePerformance}
          close={() => setEditing(null)}
          onConflict={() => load()}
        />
      )}
    </div>
  );
}

function Ranking({rows,me,onSelect}:{rows:Ranked[];me:string;onSelect:(id:string)=>void}) {
 return <div className="standings-wrap"><table className="standings-table"><caption className="sr-only">Classificação dos jogadores no mês selecionado</caption><thead><tr><th scope="col">Jogador</th><th scope="col"><abbr title="Gols">G</abbr></th><th scope="col"><abbr title="Assistências">A</abbr></th><th scope="col">PTS</th></tr></thead><tbody>{rows.map(p=><tr key={p.id} className={[p.rank<=3?'standings-top':'',p.id===me?'standings-me':''].join(' ')}><th scope="row"><button className="standings-person" onClick={()=>onSelect(p.id)} aria-label={'Ver carta de '+p.display_name}><span className={'standings-place place-'+p.rank}>{p.rank===1?<Trophy size={16}/>:p.rank}<span className="sr-only">{p.rank===1?'1º lugar':''}</span></span><span className="standings-avatar">{p.photo_url?<img src={p.photo_url} alt="" style={photoStyle(p)}/>:p.display_name.slice(0,2).toUpperCase()}</span><span className="standings-name"><strong>{p.display_name}</strong><small>{p.position} · {p.played} {p.played===1?'pelada':'peladas'}{p.id===me&&<em>VOCÊ</em>}</small></span></button></th><td><span className="standings-stat">{p.goals}</span></td><td><span className="standings-stat">{p.assists}</span></td><td><span className="standings-points">{p.points}</span></td></tr>)}</tbody></table>{!rows.length&&<p className="muted">Nenhum jogador neste ranking.</p>}</div>;
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <Goal size={26} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dlg = ref.current;
    dlg?.showModal();
    return () => dlg?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Fechar janela"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function PerformanceEditor({
  session,
  player,
  previous,
  isAdmin,
  save,
  close,
  onConflict,
}: {
  session: Match;
  player: Profile;
  previous?: Performance;
  isAdmin: boolean;
  save: (
    s: Match,
    p: Profile,
    g: number,
    a: number,
    prev?: Performance,
  ) => Promise<void>;
  close: () => void;
  onConflict: () => void;
}) {
  const [original] = useState(previous),
    [goals, setGoals] = useState(String(previous?.goals ?? 0)),
    [assists, setAssists] = useState(String(previous?.assists ?? 0)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (
      !goals.trim() ||
      !assists.trim() ||
      !validTotals(Number(goals), Number(assists))
    )
      return;
    setBusy(true);
    try {
      await save(session, player, Number(goals), Number(assists), original);
      close();
    } catch (err) {
      if ((err as Error).message === "conflict") {
        setError(
          "Esse registro mudou em outra sessão. Feche esta janela e abra novamente para ver os valores atuais.",
        );
        onConflict();
      } else setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={isAdmin ? "Editar desempenho" : "Meu desempenho"}
      onClose={() => {
        if (!busy) close();
      }}
    >
      <div className="edit-summary">
        <span>
          {dateLabel(session.played_on)} · {session.name}
        </span>
        <h3>{player.display_name}</h3>
      </div>
      <form onSubmit={submit}>
        <div className="score-inputs">
          <label>
            <Target size={22} />
            Gols
            <input
              aria-label="Total de gols"
              type="number"
              inputMode="numeric"
              min="0"
              max="99"
              step="1"
              required
              value={goals}
              disabled={busy}
              onChange={(e) => setGoals(e.target.value)}
            />
          </label>
          <label>
            <Goal size={22} />
            Assistências
            <input
              aria-label="Total de assistências"
              type="number"
              inputMode="numeric"
              min="0"
              max="99"
              step="1"
              required
              value={assists}
              disabled={busy}
              onChange={(e) => setAssists(e.target.value)}
            />
          </label>
        </div>
        <p className="muted">
          Informe seus totais desta pelada. Os pontos entram direto no ranking.
        </p>
        {original && (
          <p className="muted">
            Anterior: {original.goals} gols e {original.assists} assistências.
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="primary full" disabled={busy}>
          {busy ? "Salvando…" : "Salvar desempenho"}
          <Check size={18} />
        </button>
      </form>
    </Modal>
  );
}

async function fileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
async function preparePhoto(file: File): Promise<File> {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 5242880
  )
    throw Error("Escolha uma foto JPG, PNG ou WebP de até 5 MB.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(Error("Não foi possível abrir essa foto."));
      image.src = url;
    });
    const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) =>
          b ? resolve(b) : reject(Error("Não foi possível preparar a foto.")),
        "image/webp",
        0.88,
      ),
    );
    return new File([blob], "photo.webp", { type: "image/webp" });
  } finally {
    URL.revokeObjectURL(url);
  }
}
function ProfileEditor({
  player,
  month,
  save,
}: {
  player: Ranked;
  month: string;
  save: (p: Profile, file: File | null) => Promise<void>;
}) {
  const [name, setName] = useState(player.display_name),
    [position, setPosition] = useState(player.position),
    [favoriteClub, setFavoriteClub] = useState(player.favorite_club_id ?? ""),
    [y, setY] = useState(player.photo_y),
    [x, setX] = useState(player.photo_x ?? 50),
    [zoom, setZoom] = useState(player.photo_zoom ?? 1),
    [photo, setPhoto] = useState<File | null>(null),
    [preview, setPreview] = useState(player.photo_url),
    [busy, setBusy] = useState(false),
    [preparing, setPreparing] = useState(false),
    [error, setError] = useState("");
  const tempUrl = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (tempUrl.current) URL.revokeObjectURL(tempUrl.current);
    },
    [],
  );
  async function choose(file: File | undefined) {
    if (!file) return;
    setPreparing(true);
    setError("");
    try {
      const normalized = await preparePhoto(file);
      if (tempUrl.current) URL.revokeObjectURL(tempUrl.current);
      tempUrl.current = URL.createObjectURL(normalized);
      setPhoto(normalized);
      setPreview(tempUrl.current);
      setY(25);
      setX(50);
      setZoom(1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPreparing(false);
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await save(
        { ...player, display_name: name.trim(), position, favorite_club_id: favoriteClub || null, photo_y: y, photo_x: x, photo_zoom: zoom },
        photo,
      );
      setPhoto(null);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="profile-layout">
      <section className="profile-preview">
        <span className="eyebrow">SUA CARTA / {monthLabel(month)}</span>
        <PlayerCard
          player={{
            ...player,
            display_name: name,
            position,
            photo_y: y,
            photo_x: x,
            photo_zoom: zoom,
            photo_url: preview,
            favorite_club_id: favoriteClub || null,
          }}
          month={month}
          large
        />
        <p>O destaque é você.</p>
      </section>
      <form className="panel profile-form" onSubmit={submit}>
        <h2>Do seu jeito.</h2>
        <label>
          Nome na carta
          <input
            value={name}
            minLength={2}
            maxLength={32}
            required
            disabled={busy}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Posição
          <select
            value={position}
            disabled={busy}
            onChange={(e) => setPosition(e.target.value as Profile["position"])}
          >
            {POSITIONS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <ClubPicker value={favoriteClub} onChange={setFavoriteClub} disabled={busy}/>
        <label className="upload-label">
          <Upload size={20} /> Foto do jogador
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy || preparing}
            onChange={(e) => choose(e.target.files?.[0])}
          />
          <small>JPG, PNG ou WebP · até 5 MB</small>
        </label>
        <div className="photo-controls"><div className="section-heading"><h3>Enquadrar foto</h3><button className="text-button" type="button" disabled={busy||preparing} onClick={()=>{setX(50);setY(25);setZoom(1);}}>Redefinir</button></div><p className="muted">Ajuste a foto e confira o resultado na carta. Salve para aplicar.</p></div>
        <label>Enquadramento horizontal <output>{x}%</output><input aria-label="Enquadramento horizontal" type="range" min="0" max="100" value={x} disabled={busy||preparing} onChange={e=>setX(Number(e.target.value))}/></label>
        <label>Zoom da foto <output>{zoom.toFixed(2)}×</output><input aria-label="Zoom da foto" type="range" min="1" max="3" step="0.05" value={zoom} disabled={busy||preparing} onChange={e=>setZoom(Number(e.target.value))}/></label>
        <label>
          Enquadramento vertical
          <input
            type="range"
            min="0"
            max="100"
            value={y}
            disabled={busy}
            onChange={(e) => setY(Number(e.target.value))}
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button
          className="primary full"
          disabled={busy || preparing || name.trim().length < 2}
        >
          {preparing
            ? "Preparando foto…"
            : busy
              ? "Salvando…"
              : "Salvar minha carta"}
          <Check size={18} />
        </button>
      </form>
    </div>
  );
}

function Admin({
 setMembership,
 data,
  month,
  createMatch,
  toggleMatch,
  cancelMatch,
  saveStar,
  scheduleMatch,
  onEdit,
}: {
  setMembership: (p: Profile, membership: 'monthly'|'guest') => Promise<void>;
  data: ClubData;
 month: string;
  createMatch: (n: string, d: string, t: string) => Promise<void>;
  scheduleMatch: (s: Match, d: string, t: string) => Promise<void>;
  toggleMatch: (s: Match) => Promise<void>;
  cancelMatch: (s: Match) => Promise<void>;
  saveStar: (s: Match,id: string|null) => Promise<void>;
  onEdit: (s: Match, p: Profile) => void;
}) {
  const [name, setName] = useState("Pelada de quinta"),
    [date, setDate] = useState(currentDate()),
    [time, setTime] = useState("20:00"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [section, setSection] = useState<"games" | "members" | "history">("games"),
    [matchId, setMatchId] = useState(""),
    [playerId, setPlayerId] = useState("");
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  const matches = data.sessions.filter((s) => s.played_on.startsWith(month));
  const selected = matches.find((s) => s.id === matchId) ?? matches[0];
  const player =
    data.profiles.find((p) => p.id === playerId) ?? data.profiles[0];
  return (
    <section>
      <div className="segmented admin-tabs">
        <button
          aria-pressed={section === "games"}
          onClick={() => setSection("games")}
        >
          <ClipboardList size={16} /> Peladas
        </button>
        <button
          aria-pressed={section === "members"}
          onClick={() => setSection("members")}
        >
          <Users size={16} /> Jogadores
        </button>
        <button
          aria-pressed={section === "history"}
          onClick={() => setSection("history")}
        >
          <History size={16} /> Histórico
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {section === "games" && (
        <>
          <form
            className="panel admin-create"
            onSubmit={(e) => {
              e.preventDefault();
              action(() => createMatch(name.trim(), date, time));
            }}
          >
            <h2>Nova pelada</h2>
            <div className="form-grid">
              <label>
                Nome
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  minLength={2}
                  maxLength={80}
                  required
                  disabled={busy}
                />
              </label>
              <label>
                Data
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={busy}
                />
              </label>
              <label>
                Início · João Pessoa (PB)
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  disabled={busy}
                />
              </label>
            </div>
            <button
              className="primary"
              disabled={busy || name.trim().length < 2}
            >
              <Plus size={18} /> Criar pelada
            </button>
          </form>
          <div className="panel section-space">
            <h2>Corrigir um desempenho</h2>
            <div className="form-grid">
              <label>
                Pelada
                <select
                  value={selected?.id ?? ""}
                  onChange={(e) => setMatchId(e.target.value)}
                >
                  {!matches.length && (
                    <option value="">Sem peladas no mês</option>
                  )}
                  {matches.map((s) => (
                    <option key={s.id} value={s.id}>
                      {dateLabel(s.played_on)} · {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Jogador
                <select
                  value={player?.id ?? ""}
                  onChange={(e) => setPlayerId(e.target.value)}
                >
                  {data.profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.display_name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              className="secondary"
              disabled={!selected || selected.status === 'cancelled' || !player || busy}
              onClick={() => onEdit(selected, player)}
            >
              Editar gols e assistências
            </button>
          </div>
          <div className="section-space">
            <h2>Controle das peladas</h2>
            {matches.map((s) => (
              <div className="admin-session" key={s.id}>
                <div>
                  <strong>{s.name}</strong>
                  <p>
                    {s.starts_at
                      ? scheduleLabel(s.starts_at) + " · João Pessoa (PB)"
                      : dateLabel(s.played_on) + " · Horário pendente"}{" "}
                    · {s.status === 'cancelled' ? 'Cancelada' : s.status === "open" ? "Aberta" : "Encerrada"}
                  </p>
                  {s.status !== 'cancelled' && <ScheduleEditor
                    key={s.id + (s.starts_at ?? "")}
                    session={s}
                    save={scheduleMatch}
                  />}
                </div>
                <button
                  className="secondary"
                  disabled={busy || s.status === 'cancelled'}
                  onClick={() => action(() => toggleMatch(s))}
                >
                  {s.status === 'cancelled' ? 'Pelada cancelada' : s.status === "open"
                    ? "Encerrar registros"
                    : "Reabrir registros"}
                </button>
                <CancelSession session={s} save={cancelMatch}/>
 <StarEditor match={s} save={saveStar} players={data.profiles.filter(p=>data.attendances.some(a=>a.session_id===s.id&&a.player_id===p.id&&a.status!=='waiting'))}/>
              </div>
            ))}
            <p className="muted">
              Encerrar impede novas alterações pelos jogadores. Você continua
              podendo corrigir os números.
            </p>
          </div>
        </>
      )}
      {section === "members" && (
        <>
          <div className="panel">
            <div className="section-heading">
              <h2>Jogadores cadastrados</h2>
              <span className="badge">{data.profiles.length} jogadores</span>
            </div>
            <p className="muted">
              Cada jogador cria a própria conta pelo site. Não é necessário
              liberar acessos. Marque até 24 mensalistas: eles entram automaticamente nas novas peladas.
 Alterar o tipo não muda inscrições em peladas já criadas. Convidados entram por ordem de inscrição, conforme as vagas.
 Mensalistas: {data.profiles.filter(p=>p.membership==='monthly').length}/24.
            </p>
          </div>
          <div className="section-space">
            {data.profiles.map((p) => (
              <div className="member-row" key={p.id}>
                <div>
                  <strong>{p.display_name}</strong>
                  <p>{p.position}</p>
                </div>
                <label className="membership-control">Tipo de jogador
 <select aria-label={'Tipo de '+p.display_name} value={p.membership??'guest'} disabled={busy} onChange={e=>action(()=>setMembership(p,e.target.value as 'monthly'|'guest'))}>
 <option value="guest">Convidado</option><option value="monthly">Mensalista</option>
 </select></label>
              </div>
            ))}
          </div>
        </>
      )}
      {section === "history" && (
        <>
          <h2>Últimas alterações</h2>
          <p className="muted">
            Os 100 registros mais recentes, com autor e valores anteriores.
          </p>
          {!data.audit.length ? (
            <Empty
              title="Nenhuma alteração registrada"
              text="O histórico aparece assim que os desempenhos forem salvos."
            />
          ) : (
            data.audit.map((a) => (
              <div className="audit-row" key={a.id}>
                <span className="audit-icon">
                  <History size={18} />
                </span>
                <div>
                  <strong>
                    {data.profiles.find((p) => p.id === a.new_values.player_id)
                      ?.display_name ?? "Jogador"}
                  </strong>
                  <p>
                    {
                      data.sessions.find(
                        (s) => s.id === a.new_values.session_id,
                      )?.name
                    }{" "}
                    ·{" "}
                    {a.old_values
                      ? `${a.old_values.goals} G / ${a.old_values.assists} A → `
                      : ""}
                    {a.new_values.goals} G / {a.new_values.assists} A
                  </p>
                  <small>
                    Por{" "}
                    {data.profiles.find((p) => p.id === a.actor_id)
                      ?.display_name ?? "Organização"}{" "}
                    ·{" "}
                    {new Date(a.created_at).toLocaleString("pt-BR", {
                      timeZone: "America/Fortaleza",
                    })}
                  </small>
                </div>
              </div>
            ))
          )}
        </>
      )}
    </section>
  );
}

function CancelSession({session,save}:{session:Match;save:(s:Match)=>Promise<void>}){
 const [confirm,setConfirm]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[now,setNow]=useState(Date.now());
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 if(session.status==='cancelled')return null;
 const allowed=Boolean(session.starts_at)&&now<Date.parse(session.starts_at!);
 return <div className="cancel-session">{confirm?<div role="group" aria-label={'Cancelar '+session.name}><p>Cancelar <strong>{session.name}</strong>? As inscrições serão bloqueadas. Para jogar novamente, será necessário criar outra pelada.</p><button className="primary" disabled={busy||!allowed} onClick={async()=>{setBusy(true);setError('');try{await save(session);setConfirm(false);}catch(e){setError(friendlyError(e));}finally{setBusy(false);}}}>{busy?'Cancelando…':'Sim, cancelar pelada'}</button><button className="secondary" disabled={busy} onClick={()=>setConfirm(false)}>Manter pelada</button></div>:<button className="secondary" disabled={!allowed} onClick={()=>setConfirm(true)}>Cancelar pelada</button>}{!allowed&&<small>Disponível somente antes do início, com horário definido.</small>}{error&&<p className="error" role="alert">{error}</p>}</div>;
}
