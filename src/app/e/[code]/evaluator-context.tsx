"use client";

import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Evaluator, PublicEvent } from "@/lib/types";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "join" }
  | { status: "ready"; evaluator: Evaluator };

export interface Identity {
  name: string;
  email: string;
  institution: string;
}

interface Ctx {
  event: PublicEvent;
  supabase: SupabaseClient;
  state: State;
  userId: string | null;
  join: (identity: Identity, pin: string) => Promise<string | null>;
  switchEvaluator: () => Promise<void>;
}

const EvaluatorContext = createContext<Ctx | null>(null);
const IDENTITY_KEY = "evalqr:identity";

export function savedIdentity(): Identity {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    if (raw) return { name: "", email: "", institution: "", ...JSON.parse(raw) };
  } catch {}
  return { name: "", email: "", institution: "" };
}

export function EvaluatorProvider({ event, children }: { event: PublicEvent; children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<State>({ status: "loading" });
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      let user = data.session?.user ?? null;
      if (!user) {
        if (event.status !== "open") {
          setState({ status: "join" });
          return;
        }
        const res = await supabase.auth.signInAnonymously();
        if (res.error) throw res.error;
        user = res.data.user;
      }
      if (!user) throw new Error("No se pudo iniciar la sesión.");
      setUserId(user.id);
      const { data: ev, error } = await supabase
        .from("evaluators")
        .select("*")
        .eq("event_id", event.id)
        .eq("auth_user_id", user.id)
        .maybeSingle<Evaluator>();
      if (error) throw error;
      setState(ev ? { status: "ready", evaluator: ev } : { status: "join" });
    } catch (e) {
      const msg = (e as Error).message || "";
      setState({
        status: "error",
        message: /anonymous/i.test(msg)
          ? "El acceso de evaluadores no está habilitado. Avisa al organizador del evento."
          : `No se pudo conectar. Revisa tu internet e intenta de nuevo. (${msg})`,
      });
    }
  }, [supabase, event.id, event.status]);

  useEffect(() => {
    // Carga inicial de la sesión del evaluador (sistema externo: Supabase Auth)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const join = useCallback(
    async (identity: Identity, pin: string) => {
      if (!userId) {
        const res = await supabase.auth.signInAnonymously();
        if (res.error) return res.error.message;
        setUserId(res.data.user?.id ?? null);
      }
      const { error } = await supabase.rpc("join_event", {
        code: event.short_code,
        pin: pin || null,
        evaluator_name: identity.name,
        evaluator_email: identity.email || null,
        evaluator_institution: identity.institution || null,
      });
      if (error) return error.message;
      try {
        localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
      } catch {}
      await load();
      return null;
    },
    [supabase, event.short_code, userId, load],
  );

  const switchEvaluator = useCallback(async () => {
    await supabase.auth.signOut({ scope: "local" });
    try {
      localStorage.removeItem(IDENTITY_KEY);
    } catch {}
    setUserId(null);
    setState({ status: "loading" });
    await load();
  }, [supabase, load]);

  return <EvaluatorContext value={{ event, supabase, state, userId, join, switchEvaluator }}>{children}</EvaluatorContext>;
}

export function useEvaluator() {
  const ctx = use(EvaluatorContext);
  if (!ctx) throw new Error("useEvaluator debe usarse dentro de EvaluatorProvider");
  return ctx;
}
