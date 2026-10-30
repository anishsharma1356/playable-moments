import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, setOwnerCsrf } from "./api";
import { EraseMoment } from "./data-controls";
import type {
  MomentDto,
  WorkspaceDto,
} from "../../../packages/contracts/src/index.js";

interface Status {
  state: string;
  channelId: string | null;
  safeMessage: string;
}
interface Stream {
  id: string;
  label: string;
}
function ErrorMessage({ text }: { text: string }) {
  return text ? (
    <p role="alert" className="error">
      {text}
    </p>
  ) : null;
}
export function RealStudio() {
  const [me, setMe] = useState<{ login: string } | null>(null),
    [status, setStatus] = useState<Status | null>(null),
    [sessions, setSessions] = useState<Stream[]>([]),
    [sid, setSid] = useState(""),
    [moments, setMoments] = useState<MomentDto[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [overlay, setOverlay] = useState("");
  const navigate = useNavigate();
  async function refresh() {
    const [ss, mm, st] = await Promise.all([
      api<Stream[]>("/api/owner/sessions"),
      api<MomentDto[]>("/api/owner/library"),
      api<Status>("/api/owner/twitch/status"),
    ]);
    setSessions(ss);
    setMoments(mm);
    setStatus(st);
  }
  useEffect(() => {
    api<{ login: string; csrfToken: string }>("/api/owner/me")
      .then((value) => {
        setOwnerCsrf(value.csrfToken);
        setMe(value);
        return refresh();
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!me) return;
    const timer = setInterval(() => {
      void api<Status>("/api/owner/twitch/status")
        .then(setStatus)
        .catch(() => {
          setMe(null);
          setError("Your creator session ended. Connect Twitch again.");
        });
    }, 2000);
    return () => clearInterval(timer);
  }, [me]);
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    void act(async () => {
      const m = await api<MomentDto>(`/api/owner/sessions/${sid}/moments`, {
        title: f.get("title"),
        question: f.get("question"),
        optionA: f.get("optionA"),
        optionB: f.get("optionB"),
        durationSeconds: Number(f.get("duration")),
      });
      navigate(`/studio/moments/${m.id}/live`);
    });
  }
  return (
    <main id="main-content" tabIndex={-1} className="live-studio">
      <div className="eyebrow">REAL TWITCH · CREATOR STUDIO</div>
      <h1>
        Capture the <em>live choice.</em>
      </h1>
      <ErrorMessage text={error} />
      {!me ? (
        <section className="panel login">
          <h2>Connect your broadcaster account</h2>
          <p>
            Authorize read-only chat access for the account configured on this
            computer.
          </p>
          <a className="button primary" href="/auth/twitch/start">
            Connect Twitch
          </a>
          <p className="fine">
            Only your configured broadcaster can enter. No simulated input is
            available in real mode.
          </p>
        </section>
      ) : (
        <>
          <section className="panel live-connection">
            <div>
              <h2>{me.login}</h2>
              <p>
                <strong>{status?.state ?? "CONNECTING"}</strong> ·{" "}
                {status?.safeMessage}
              </p>
            </div>
            <div className="live-actions">
              <button
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    setStatus(
                      await api<Status>("/api/owner/twitch/reconnect", {}),
                    );
                  })
                }
              >
                Reconnect intake
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    await api("/api/owner/twitch/disconnect", {});
                    setMe(null);
                  })
                }
              >
                Disconnect Twitch
              </button>
            </div>
            <p className="fine">
              Reconnecting or disconnecting interrupts an open round. Locked
              results stay frozen.
            </p>
          </section>
          <section className="panel">
            <h2>1. Prepare a stream session</h2>
            <form
              className="live-actions"
              onSubmit={(event) => {
                event.preventDefault();
                const f = new FormData(event.currentTarget);
                void act(async () => {
                  const ss = await api<Stream>("/api/owner/sessions", {
                    label: f.get("label"),
                  });
                  await refresh();
                  setSid(ss.id);
                  setOverlay("");
                });
              }}
            >
              <label>
                Session name
                <input
                  name="label"
                  required
                  maxLength={80}
                  placeholder="Tonight's original challenge"
                />
              </label>
              <button className="primary" disabled={busy}>
                Create session
              </button>
            </form>
            <label>
              Use session
              <select
                value={sid}
                onChange={(e) => {
                  setSid(e.target.value);
                  setOverlay("");
                }}
              >
                <option value="">Choose a session</option>
                {sessions.map((ss) => (
                  <option key={ss.id} value={ss.id}>
                    {ss.label}
                  </option>
                ))}
              </select>
            </label>
            {sid && (
              <div className="overlay-controls">
                <button
                  disabled={busy}
                  onClick={() =>
                    void act(async () => {
                      const value = await api<{ url: string }>(
                        `/api/owner/sessions/${sid}/overlay`,
                        {},
                      );
                      setOverlay(value.url);
                    })
                  }
                >
                  {overlay ? "Replace overlay URL" : "Create overlay URL"}
                </button>
                <p className="fine">
                  Add this read-only URL to an OBS Browser Source, 1920 × 1080.
                  It expires after 12 hours. Replacing it disables the previous
                  URL.
                </p>
                {overlay && (
                  <label>
                    Private OBS overlay URL
                    <input
                      readOnly
                      value={overlay}
                      onFocus={(e) => e.target.select()}
                    />
                  </label>
                )}
                <p>
                  Start a manual OBS recording before opening a round. Keep this
                  studio off the broadcast.
                </p>
              </div>
            )}
          </section>
          {sid && (
            <section className="panel">
              <h2>2. Draft your A/B moment</h2>
              <form className="live-form" onSubmit={create}>
                <label>
                  Neutral title
                  <input name="title" required maxLength={80} />
                </label>
                <label>
                  Question
                  <input name="question" required maxLength={180} />
                </label>
                <label>
                  Option A<input name="optionA" required maxLength={80} />
                </label>
                <label>
                  Option B<input name="optionB" required maxLength={80} />
                </label>
                <label>
                  Voting window (seconds)
                  <input
                    name="duration"
                    type="number"
                    min={20}
                    max={180}
                    defaultValue={45}
                    required
                  />
                </label>
                <button className="primary" disabled={busy}>
                  Create draft
                </button>
              </form>
            </section>
          )}
          <section>
            <h2>Moment library</h2>
            {moments.length === 0 && (
              <p>No real moments yet. Create a session and draft above.</p>
            )}
            <div className="moment-grid">
              {moments.map((m) => (
                <Link
                  className="panel"
                  key={m.id}
                  to={`/studio/moments/${m.id}/${m.captureState === "OUTCOME_RECORDED" ? "review" : "live"}`}
                >
                  <span className="tiny-badge">
                    REAL TWITCH · {m.captureState}
                  </span>
                  <h3>{m.title}</h3>
                  <p>{m.question}</p>
                  <span>{m.participantCount} participating accounts</span>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

export function LiveMoment() {
  const { id } = useParams(),
    [m, setM] = useState<MomentDto | null>(null),
    [status, setStatus] = useState<Status | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [now, setNow] = useState(Date.now()),
    [eventsOk, setEventsOk] = useState(true);
  const navigate = useNavigate();
  useEffect(() => {
    let closed = false,
      events: EventSource | undefined;
    api<{ csrfToken: string }>("/api/owner/me")
      .then(async (me) => {
        setOwnerCsrf(me.csrfToken);
        const moment = await api<MomentDto>(`/api/owner/moments/${id}`);
        if (closed) return;
        setM(moment);
        events = new EventSource(
          `/api/owner/sessions/${moment.sessionId}/events`,
        );
        events.addEventListener("snapshot", (event) => {
          const value = (
            JSON.parse((event as MessageEvent).data) as WorkspaceDto[]
          ).find((w) => w.moment.id === id);
          if (value) setM(value.moment);
          setEventsOk(true);
        });
        events.onerror = () => setEventsOk(false);
      })
      .catch((e) => setError((e as Error).message));
    const timer = setInterval(() => {
      setNow(Date.now());
      void api<Status>("/api/owner/twitch/status")
        .then(setStatus)
        .catch(() => setEventsOk(false));
    }, 1000);
    return () => {
      closed = true;
      events?.close();
      clearInterval(timer);
    };
  }, [id]);
  async function action(kind: string, fields: Record<string, unknown> = {}) {
    if (!m) return;
    setBusy(true);
    setError("");
    try {
      const value = await api<MomentDto>(`/api/owner/moments/${id}/${kind}`, {
        expectedVersion: m.version,
        ...fields,
      });
      setM(value);
      if (kind === "outcome") navigate(`/studio/moments/${id}/review`);
    } catch (e) {
      setError((e as Error).message);
      void api<MomentDto>(`/api/owner/moments/${id}`)
        .then(setM)
        .catch(() => {});
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main-content" tabIndex={-1} className="live-studio">
      <Link to="/studio">← Creator studio</Link>
      <div className="eyebrow">REAL TWITCH · LIVE CAPTURE</div>
      <h1>{m?.title ?? "Loading moment…"}</h1>
      <ErrorMessage text={error} />
      {!eventsOk && (
        <p role="alert" className="error">
          Live updates disconnected. Reload or sign in again before using the
          controls.
        </p>
      )}
      {m && <EraseMoment moment={m} disabled={busy} />}
      {m && (
        <section className="panel">
          <span className="status">
            {m.captureState} · Twitch {status?.state ?? "CONNECTING"}
          </span>
          <h2>{m.question}</h2>
          <div className="live-options">
            <p>A · {m.optionA}</p>
            <p>B · {m.optionB}</p>
          </div>
          <p className="vote-command">
            !pick {m.code} A <span>or</span> !pick {m.code} B
          </p>
          <p>
            {m.participantCount} participating accounts · First accepted choice
            per account
          </p>
          {m.captureState === "DRAFT" && (
            <>
              <p>
                Record your original scene in OBS, then open voting. Opening
                freezes the question and options.
              </p>
              <button
                className="primary"
                disabled={busy || !eventsOk || status?.state !== "READY"}
                onClick={() => void action("open")}
              >
                Open responses
              </button>
            </>
          )}
          {m.captureState === "OPEN" && (
            <>
              <p aria-live="polite">
                {Math.max(
                  0,
                  Math.min(
                    m.durationSeconds,
                    Math.ceil(((m.deadlineAtMs ?? now) - now) / 1000),
                  ),
                )}{" "}
                seconds remaining
              </p>
              <button
                className="primary"
                disabled={busy || !eventsOk}
                onClick={() => void action("lock")}
              >
                Lock responses
              </button>
            </>
          )}
          {["DRAFT", "OPEN"].includes(m.captureState) && (
            <button
              disabled={busy || !eventsOk}
              onClick={() => void action("cancel")}
            >
              Cancel round
            </button>
          )}
          {m.captureState === "INTERRUPTED" && (
            <p className="error">
              {m.interruptionReason} This round cannot reopen or publish. Create
              a new draft with a new code.
            </p>
          )}
          {m.captureState === "LOCKED" && (
            <form
              className="live-form"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void action("outcome", {
                  creatorChoice: f.get("choice"),
                  outcomeSummary: f.get("outcome"),
                });
              }}
            >
              <h2>Record what actually happened</h2>
              <label>
                Your actual choice
                <select name="choice" required>
                  <option value="">Choose…</option>
                  <option value="A">A · {m.optionA}</option>
                  <option value="B">B · {m.optionB}</option>
                </select>
              </label>
              <label>
                Observed outcome
                <textarea name="outcome" maxLength={500} required />
              </label>
              <button className="primary" disabled={busy || !eventsOk}>
                Save outcome and review recording
              </button>
            </form>
          )}
          {m.captureState === "OUTCOME_RECORDED" && (
            <Link
              className="button primary"
              to={`/studio/moments/${m.id}/review`}
            >
              Review recording
            </Link>
          )}
          <p className="fine">
            The broadcast overlay shows only the question, response status and
            total participation. Keep private creator controls out of your
            recording.
          </p>
        </section>
      )}
    </main>
  );
}

interface OverlayData {
  mode: string;
  connection: string;
  question: string | null;
  optionA: string | null;
  optionB: string | null;
  code: string | null;
  phase: string;
  participantCount: number;
}
export function Overlay() {
  const { key } = useParams(),
    [value, setValue] = useState<OverlayData | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    document.body.classList.add("overlay-page");
    document.documentElement.classList.add("overlay-page");
    const events = new EventSource(`/api/overlay/${key}/events`);
    events.addEventListener("snapshot", (event) => {
      setValue(JSON.parse((event as MessageEvent).data));
      setError("");
    });
    events.addEventListener("unavailable", () => {
      setValue(null);
      setError("Overlay expired or replaced. Update the OBS URL.");
      events.close();
    });
    events.onerror = () => {
      setValue(null);
      setError("Overlay disconnected · responses unavailable");
    };
    return () => {
      events.close();
      document.body.classList.remove("overlay-page");
      document.documentElement.classList.remove("overlay-page");
    };
  }, [key]);
  return (
    <div className="broadcast-overlay">
      <div className="eyebrow">
        PLAYABLE MOMENTS ·{" "}
        {value?.mode === "DEMO" ? "SIMULATED DEMO" : "REAL TWITCH"}
      </div>
      {error ? (
        <p role="alert">{error}</p>
      ) : (
        <>
          <span className="status">{value?.phase ?? "CONNECTING"}</span>
          <h1>{value?.question ?? "Waiting for the next moment"}</h1>
          {value?.question && (
            <div className="live-options">
              <p>A · {value.optionA}</p>
              <p>B · {value.optionB}</p>
            </div>
          )}
          {value?.phase === "OPEN" && (
            <p className="vote-command">
              !pick {value.code} A <span>or</span> !pick {value.code} B
            </p>
          )}
          <p>{value?.participantCount ?? 0} participating accounts</p>
          {value?.phase === "INTERRUPTED" && (
            <p>Round interrupted · wait for a new moment</p>
          )}
        </>
      )}
    </div>
  );
}
