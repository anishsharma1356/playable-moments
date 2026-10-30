import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";
import type {
  Manifest,
  Unlock,
  Result,
  MomentDto,
  WorkspaceDto,
  EditDto,
} from "../../../packages/contracts/src/index.js";
import { api, setOwnerCsrf, upload } from "./api";
import "./style.css";
import { RealStudio, LiveMoment, Overlay } from "./live";
import {
  EraseMoment,
  ClearChoices,
  StorageStatus,
  Modal,
} from "./data-controls";

const RuntimeMode = createContext<"DEMO" | "REAL_TWITCH" | null>(null);
function Runtime({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<"DEMO" | "REAL_TWITCH" | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    void api<{ mode: "DEMO" | "REAL_TWITCH" }>("/api/config")
      .then((value) => setMode(value.mode))
      .catch(() =>
        setError(
          "Cannot reach the app. Start the server and reload this page.",
        ),
      );
  }, []);
  return (
    <RuntimeMode.Provider value={mode}>
      {error ? (
        <main id="main-content" tabIndex={-1}>
          <ErrorBox message={error} />
        </main>
      ) : mode ? (
        children
      ) : (
        <main id="main-content" tabIndex={-1}>
          Connecting to Playable Moments…
        </main>
      )}
    </RuntimeMode.Provider>
  );
}

function Brand() {
  return (
    <Link className="brand" to="/">
      <span className="brand-icon">▶</span>
      <span>
        Playable<span className="brand-light"> Moments</span>
      </span>
    </Link>
  );
}
function Shell({ children }: { children: React.ReactNode }) {
  const mode = useContext(RuntimeMode),
    location = useLocation();
  const previousPath = useRef(location.pathname);
  useEffect(() => {
    if (previousPath.current !== location.pathname)
      document.getElementById("main-content")?.focus({ preventScroll: true });
    previousPath.current = location.pathname;
  }, [location.pathname]);
  if (location.pathname.startsWith("/overlay/")) return <>{children}</>;
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header>
        <Brand />
        <nav aria-label="Main navigation">
          <Link to="/studio">
            Creator studio <span aria-hidden="true">↗</span>
          </Link>
          <span className="demo-pill">
            <i /> {mode === "REAL_TWITCH" ? "TWITCH MODE" : "LOCAL DEMO"}
          </span>
        </nav>
      </header>
      {children}
      <footer>
        <span>One moment. Your own decision.</span>
        <Link to="/privacy">Privacy & data</Link>
        <span>Made for the moments you missed.</span>
      </footer>
    </>
  );
}
function ErrorBox({ message }: { message: string }) {
  return message ? (
    <div className="error" role="alert">
      {message}
    </div>
  ) : null;
}
function Home() {
  const mode = useContext(RuntimeMode);
  return (
    <main id="main-content" tabIndex={-1} className="home">
      <div className="eyebrow">
        <span className="little-line" /> THE STREAM ENDED. THE CHOICE DIDN’T.
      </div>
      <h1>
        You missed the live.
        <br />
        You still get <em>the moment.</em>
      </h1>
      <p className="lede">
        Watch what led up to a decision. Make your own choice.
        <br />
        Then see what actually happened.
      </p>
      <div className="hero-actions">
        <Link className="button primary" to="/studio">
          Open creator studio <span>↗</span>
        </Link>
        <span className="quiet">
          {mode === "REAL_TWITCH"
            ? "Capture real chat · Publish a reviewed replay"
            : "Local demo · No Twitch connection"}
        </span>
      </div>
      <div
        className="hero-art"
        role="group"
        aria-label="The replay sequence: watch the setup, choose, then see the actual outcome"
      >
        <div className="film">
          <div className="film-top">
            <span>01 / THE SETUP</span>
            <span>● RECORDED</span>
          </div>
          <div className="doors">
            <div className="door red">
              <b>A</b>
              <span>Red door</span>
              <i />
            </div>
            <div className="door blue">
              <b>B</b>
              <span>Blue door</span>
              <i />
            </div>
          </div>
          <div className="film-bottom">
            Two doors. One decision.<span>Which would you choose?</span>
          </div>
        </div>
        <div className="sequence">
          <div>
            <span>01</span>
            <strong>Watch the setup</strong>
            <p>Get the context, without the outcome.</p>
          </div>
          <div>
            <span>02</span>
            <strong>Make your choice</strong>
            <p>A or B. A decision that is yours.</p>
          </div>
          <div>
            <span>03</span>
            <strong>See what happened</strong>
            <p>The real recording. The original result.</p>
          </div>
        </div>
      </div>
      <p className="honesty">
        Your replay choice never changes the recording or the original
        responses.
      </p>
    </main>
  );
}
function Studio() {
  const mode = useContext(RuntimeMode);
  const location = useLocation();
  return (
    <>
      {location.search === "?deleted=1" && (
        <p role="status" className="notice">
          Moment deleted. Recording files are removed in the background.
        </p>
      )}
      {mode === "REAL_TWITCH" ? <RealStudio /> : <DemoStudio />}
      <StorageStatus />
    </>
  );
}
function DemoStudio() {
  const [ready, setReady] = useState(false),
    [moments, setMoments] = useState<MomentDto[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [custom, setCustom] = useState(false);
  const navigate = useNavigate();
  const refresh = async () =>
    setMoments(await api<MomentDto[]>("/api/owner/library"));
  useEffect(() => {
    api<{ csrfToken: string }>("/api/owner/me")
      .then((v) => {
        setOwnerCsrf(v.csrfToken);
        setReady(true);
        return refresh();
      })
      .catch(() => {});
  }, []);
  async function enter() {
    setBusy(true);
    setError("");
    try {
      const v = await api<{ csrfToken: string }>("/auth/demo", {});
      setOwnerCsrf(v.csrfToken);
      setReady(true);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function create() {
    setBusy(true);
    setError("");
    try {
      const m = await api<MomentDto>("/api/owner/demo/moments", {});
      navigate(`/studio/moments/${m.id}/review`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function customMoment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const session = await api<{ id: string }>("/api/owner/sessions", {
        label: "Local recorded moment · DEMO",
      });
      let m = await api<MomentDto>(
        `/api/owner/sessions/${session.id}/moments`,
        {
          title: f.get("title"),
          question: f.get("question"),
          optionA: f.get("optionA"),
          optionB: f.get("optionB"),
          durationSeconds: 45,
        },
      );
      m = await api<MomentDto>(`/api/owner/moments/${m.id}/open`, {
        expectedVersion: m.version,
      });
      m = await api<MomentDto>(`/api/owner/moments/${m.id}/lock`, {
        expectedVersion: m.version,
      });
      m = await api<MomentDto>(`/api/owner/moments/${m.id}/outcome`, {
        expectedVersion: m.version,
        creatorChoice: f.get("choice"),
        outcomeSummary: f.get("outcome"),
      });
      navigate(`/studio/moments/${m.id}/review`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main-content" tabIndex={-1}>
      <div className="page-title">
        <div>
          <div className="eyebrow">THE CREATOR SIDE</div>
          <h1>
            Your moments, <em>ready for replay.</em>
          </h1>
          <p className="muted">
            Capture once. Review carefully. Let the next viewer decide.
          </p>
        </div>
        {ready && (
          <button disabled={busy} className="primary" onClick={create}>
            ＋ New demo moment
          </button>
        )}
      </div>
      <ErrorBox message={error} />
      {!ready ? (
        <section className="login panel">
          <span className="large-symbol">↗</span>
          <h2>Enter your local studio</h2>
          <p>
            Review a recording and publish a playable moment on this computer.
          </p>
          <button className="primary" disabled={busy} onClick={enter}>
            Enter local studio
          </button>
          <p className="fine">
            SIMULATED DEMO · Available on loopback only.
            <br />
            Use start-twitch.cmd after Twitch setup for real chat capture.
          </p>
        </section>
      ) : (
        <>
          <div className="connection">
            <span className="connection-icon">◉</span>
            <div>
              <strong>Local demo workspace</strong>
              <p>
                Original fixture media and clearly marked simulated history.
              </p>
            </div>
            <span className="status">Twitch disconnected</span>
          </div>
          <div className="section-heading">
            <h2>
              Moment library <span className="count">{moments.length}</span>
            </h2>
            <button className="text-button" onClick={() => setCustom(!custom)}>
              Use my own recording {custom ? "−" : "＋"}
            </button>
          </div>
          {custom && (
            <form className="panel custom-form" onSubmit={customMoment}>
              <h2>Create a recorded moment</h2>
              <p className="muted">
                No live responses will be invented. This local moment starts
                with a zero-response DEMO snapshot.
              </p>
              {[
                ["title", "Neutral title"],
                ["question", "Question"],
                ["optionA", "Option A"],
                ["optionB", "Option B"],
              ].map(([name, label]) => (
                <label key={name}>
                  {label}
                  <input
                    name={name}
                    required
                    maxLength={name === "question" ? 180 : 80}
                  />
                </label>
              ))}
              <label>
                Creator’s actual choice
                <select name="choice" required defaultValue="">
                  <option value="" disabled>
                    Select the recorded choice
                  </option>
                  <option>A</option>
                  <option>B</option>
                </select>
              </label>
              <label>
                What actually happened?
                <textarea name="outcome" required maxLength={500} />
              </label>
              <button className="primary" disabled={busy}>
                Create & review recording
              </button>
            </form>
          )}
          {moments.length === 0 ? (
            <section className="empty panel">
              <div className="empty-icon">▷</div>
              <h2>Every replay starts with a moment.</h2>
              <p>
                Create the original door-scene demo, then upload and review its
                recording.
              </p>
              <button className="primary" onClick={create} disabled={busy}>
                Create your first demo moment
              </button>
            </section>
          ) : (
            <div className="library">
              {moments.map((m, i) => (
                <Link
                  key={m.id}
                  className="moment-card"
                  to={`/studio/moments/${m.id}/review`}
                >
                  <div className="card-art">
                    <span className="tiny-badge">SIMULATED DEMO</span>
                    <div className="mini-doors">
                      <span>A</span>
                      <span>B</span>
                    </div>
                    <span className="card-number">
                      {String(moments.length - i).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="card-content">
                    <span className="eyebrow">
                      {m.captureState.replaceAll("_", " ")}
                    </span>
                    <h3>{m.title}</h3>
                    <p>{m.question}</p>
                    <div className="card-bottom">
                      <span>
                        {m.historical?.total ?? 0} synthetic responses
                      </span>
                      <strong>Review moment ↗</strong>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
          <div className="note">
            <span>ⓘ</span>
            <p>
              The demo illustrates the complete replay workflow. It does not
              represent a connected Twitch stream or real audience
              participation.
            </p>
          </div>
        </>
      )}
    </main>
  );
}
const checks = [
  [
    "watchedSetup",
    "I watched the processed setup. It contains no result or spoiler.",
  ],
  [
    "watchedReveal",
    "I watched the processed reveal. It shows the actual outcome.",
  ],
  ["audioChecked", "I checked the audio at both cut boundaries."],
  ["rightsConfirmed", "I own or have permission to use this recording."],
  [
    "metadataChecked",
    "The title is neutral and the edit preserves the meaning.",
  ],
] as const;
function Review() {
  const { id } = useParams();
  const [data, setData] = useState<WorkspaceDto | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState<number | null>(null),
    [bounds, setBounds] = useState([0, 5, 6, 12]),
    [alternatives, setAlternatives] = useState({
      setupCaptions: "",
      revealCaptions: "",
      setupTranscript: "",
      revealTranscript: "",
    }),
    [confirmed, setConfirmed] = useState<Record<string, boolean>>({}),
    [publishDialog, setPublishDialog] = useState(false),
    [file, setFile] = useState<File | null>(null);
  const source = useRef<HTMLVideoElement>(null);
  const refresh = async () => {
    const next = await api<WorkspaceDto>(`/api/owner/moments/${id}/workspace`);
    setData(next);
    return next;
  };
  useEffect(() => {
    let stopped = false;
    api<{ csrfToken: string }>("/api/owner/me")
      .then((me) => {
        setOwnerCsrf(me.csrfToken);
        return refresh();
      })
      .then((next) => {
        if (stopped) return;
        if (next.edits[0]) {
          const e = next.edits[0];
          setBounds(
            [e.setupStartMs, e.setupEndMs, e.revealStartMs, e.revealEndMs].map(
              (v) => v / 1000,
            ),
          );
        }
        const events = new EventSource(
          `/api/owner/sessions/${next.moment.sessionId}/events`,
        );
        events.addEventListener("snapshot", (event) => {
          const list = JSON.parse(
            (event as MessageEvent<string>).data,
          ) as WorkspaceDto[];
          const current = list.find((w) => w.moment.id === id);
          if (current && !stopped) setData(current);
        });
        stopEvents = () => events.close();
      })
      .catch((e) => setError((e as Error).message));
    let stopEvents = () => {};
    return () => {
      stopped = true;
      stopEvents();
    };
  }, [id]);
  const edit = data?.edits[0];
  useEffect(() => {
    if (edit)
      setAlternatives({
        setupCaptions: edit.setupCaptions,
        revealCaptions: edit.revealCaptions,
        setupTranscript: edit.setupTranscript,
        revealTranscript: edit.revealTranscript,
      });
  }, [edit?.id]);
  useEffect(() => {
    setConfirmed({});
  }, [edit?.id, edit?.reviewHash]);
  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!data)
    return (
      <main id="main-content" tabIndex={-1}>
        <Link className="back" to="/studio">
          ← Studio
        </Link>
        <ErrorBox message={error} />
        <p>
          {error ? "Enter the local studio first." : "Loading your moment…"}
        </p>
      </main>
    );
  const m = data.moment,
    master = data.assets
      .filter((a) => a.kind === "MASTER" && a.status === "READY")
      .at(-1),
    job = data.jobs.find(
      (j) => j.status === "QUEUED" || j.status === "RUNNING",
    );
  const published = Boolean(data.release),
    disabled = busy || Boolean(job) || published;
  const changed = edit
    ? bounds.some(
        (v, i) =>
          Math.round(v * 1000) !==
          [
            edit.setupStartMs,
            edit.setupEndMs,
            edit.revealStartMs,
            edit.revealEndMs,
          ][i],
      ) ||
      (Object.keys(alternatives) as (keyof typeof alternatives)[]).some(
        (key) =>
          alternatives[key].replace(/\r\n?/g, "\n").trim() !== edit[key].trim(),
      )
    : false;
  async function sendFile() {
    if (!file) return;
    setProgress(0);
    await act(async () => {
      try {
        await upload(
          `/api/owner/moments/${id}/media`,
          file!,
          m.version,
          setProgress,
        );
      } finally {
        setProgress(null);
      }
    });
  }
  function nudge(i: number, delta: number) {
    setBounds((old) =>
      old.map((v, k) =>
        k === i ? Math.max(0, Math.round((v + delta) * 10) / 10) : v,
      ),
    );
    setConfirmed({});
  }
  async function render() {
    if (!master) return;
    await act(() =>
      api(`/api/owner/moments/${id}/edits`, {
        expectedVersion: m.version,
        masterAssetId: master.id,
        setupStartMs: Math.round(bounds[0] * 1000),
        setupEndMs: Math.round(bounds[1] * 1000),
        revealStartMs: Math.round(bounds[2] * 1000),
        revealEndMs: Math.round(bounds[3] * 1000),
        ...alternatives,
      }),
    );
  }
  async function approve(e: EditDto) {
    await act(() =>
      api(`/api/owner/edits/${e.id}/approve`, {
        editVersion: e.version,
        reviewHash: e.reviewHash,
        ...Object.fromEntries(
          checks.map(([key]) => [key, confirmed[key] === true]),
        ),
      }),
    );
  }
  return (
    <main id="main-content" tabIndex={-1}>
      <Link className="back" to="/studio">
        ← Moment library
      </Link>
      <div className="page-title">
        <div>
          <div className="eyebrow">
            CREATOR REVIEW{" "}
            <span className="inline-demo">
              {m.mode === "DEMO" ? "SIMULATED DEMO" : "REAL TWITCH"}
            </span>
          </div>
          <h1 className="review-title">{m.title}</h1>
          <p className="muted">
            Make the cut. Check the details. Publish with confidence.
          </p>
        </div>
        <span className="status">
          {published
            ? "Published"
            : edit?.status === "APPROVED"
              ? "Approved"
              : job
                ? "Processing"
                : "Private draft"}
        </span>
      </div>
      <ol className="steps">
        {[
          "Upload recording",
          "Set boundaries",
          "Review outputs",
          "Publish moment",
        ].map((step, i) => (
          <li
            className={
              (i === 0 && master) ||
              (i === 1 && edit) ||
              (i === 2 && edit?.status === "APPROVED") ||
              published
                ? "done"
                : ""
            }
            key={step}
          >
            <span>{String(i + 1).padStart(2, "0")}</span>
            {step}
          </li>
        ))}
      </ol>
      <ErrorBox message={error} />
      {data.release && (
        <div className="published">
          <div>
            <strong>Your playable moment is ready.</strong>
            <p>
              Open it in a second browser session to make a personal choice.
            </p>
            <a href={data.release.url} target="_blank" rel="noreferrer">
              {window.location.origin}
              {data.release.url} ↗
            </a>
          </div>
          <div className="published-actions">
            <Link className="button primary" to={data.release.url}>
              Open replay ↗
            </Link>
            <button
              disabled={busy}
              onClick={() =>
                act(() =>
                  api(`/api/owner/moments/${id}/unpublish`, {
                    expectedVersion: m.version,
                  }),
                )
              }
            >
              Unpublish & revise
            </button>
          </div>
        </div>
      )}
      <div className="review-grid">
        <div className="review-main">
          <section className="panel">
            <div className="panel-heading">
              <span className="step-num">01</span>
              <div>
                <h2>Your source recording</h2>
                <p>
                  Private to this studio. The full recording is never shared
                  with replay viewers.
                </p>
              </div>
            </div>
            {master ? (
              <video
                ref={source}
                aria-label="Private master recording"
                controls
                playsInline
                preload="metadata"
                src={master.url}
              />
            ) : (
              <div className="upload-zone">
                <span>↥</span>
                <h3>A moment worth replaying.</h3>
                <p>Choose an original or authorised MP4 recording.</p>
              </div>
            )}
            <div className="upload-controls">
              <label className="file-label">
                Select recording
                <input
                  type="file"
                  accept="video/mp4,.mp4"
                  aria-label="Select MP4 recording"
                  disabled={disabled}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <button disabled={disabled || !file} onClick={sendFile}>
                {busy && progress !== null
                  ? `Uploading ${progress}%`
                  : "Upload recording"}
              </button>
            </div>
            <p className="fine">
              H.264 MP4 · AAC or no audio · Up to 500 MiB / 20 min / 1080p
            </p>
            {progress !== null && (
              <progress
                aria-label="Upload progress"
                value={progress}
                max={100}
              />
            )}
            <p className="fine">
              Upload your own authorized recording. For the original door demo,
              select <code>data/fixtures/doors-demo.mp4</code>, created by{" "}
              <code>npm.cmd run demo:seed</code>. Real Twitch moments require
              the recording of that actual round.
            </p>
          </section>
          {master && (
            <section className="panel">
              <div className="panel-heading">
                <span className="step-num">02</span>
                <div>
                  <h2>Find the decision boundary</h2>
                  <p>
                    Set offsets in the processed master. Leave the actual
                    outcome for the reveal.
                  </p>
                </div>
              </div>
              <div className="timeline">
                <div className="setup-bar">SETUP</div>
                <span>CHOICE</span>
                <div className="reveal-bar">REVEAL</div>
              </div>
              <div className="boundaries">
                {["Setup start", "Setup end", "Reveal start", "Reveal end"].map(
                  (label, i) => (
                    <div className="boundary" key={label}>
                      <label>
                        {label}
                        <div className="time-input">
                          <input
                            aria-label={label}
                            type="number"
                            step="0.1"
                            min="0"
                            max={master.durationMs! / 1000}
                            value={bounds[i]}
                            disabled={disabled}
                            onChange={(e) => {
                              setBounds((old) =>
                                old.map((v, k) =>
                                  k === i ? Number(e.target.value) : v,
                                ),
                              );
                              setConfirmed({});
                            }}
                          />
                          <span>sec</span>
                        </div>
                      </label>
                      <div className="nudges">
                        {[-1, -0.1, 0.1, 1].map((n) => (
                          <button
                            key={n}
                            aria-label={`${label} ${n > 0 ? "+" : ""}${n} seconds`}
                            disabled={disabled}
                            onClick={() => nudge(i, n)}
                          >
                            {n > 0 ? "+" : ""}
                            {n}
                          </button>
                        ))}
                      </div>
                      <button
                        className="text-button"
                        onClick={() => {
                          if (source.current) {
                            source.current.currentTime = bounds[i];
                            void source.current.play().catch(() => {});
                          }
                        }}
                      >
                        Preview here ↗
                      </button>
                    </div>
                  ),
                )}
              </div>
              <details className="media-alternatives">
                <summary>Captions and text alternatives</summary>
                <p>
                  Keep setup and reveal separate. Describe speech, meaningful
                  sounds and essential visuals. Review these with both processed
                  clips before publishing.
                </p>
                <p className="fine">
                  English captions: paste plain-text WebVTT. Times start at zero
                  in each processed clip. Example: WEBVTT, blank line,
                  00:00:00.000 --&gt; 00:00:02.000, then caption text on the
                  next line.
                </p>
                {(
                  [
                    ["setupCaptions", "Setup captions (WebVTT)", 20000],
                    ["revealCaptions", "Reveal captions (WebVTT)", 20000],
                    ["setupTranscript", "Setup text alternative", 6000],
                    ["revealTranscript", "Reveal text alternative", 6000],
                  ] as const
                ).map(([key, label, limit]) => (
                  <label key={key}>
                    {label}
                    <textarea
                      aria-label={label}
                      rows={4}
                      maxLength={limit}
                      readOnly={disabled}
                      value={alternatives[key]}
                      onChange={(e) => {
                        setAlternatives((old) => ({
                          ...old,
                          [key]: e.target.value,
                        }));
                        setConfirmed({});
                      }}
                    />
                  </label>
                ))}
                <p className="fine">
                  Saving changes creates a new revision and requires review
                  again. These fields do not add a separate spoken
                  audio-description track.
                </p>
              </details>
              <div className="panel-bottom">
                <p className="fine">
                  Master duration: {(master.durationMs! / 1000).toFixed(2)}s ·
                  Each segment: up to 120s.
                  <br />A gap omits recording time between setup and reveal.
                </p>
                <button
                  className="primary"
                  disabled={disabled}
                  onClick={render}
                >
                  {job
                    ? "Rendering…"
                    : edit
                      ? "Render new revision"
                      : "Render preview"}
                </button>
              </div>
            </section>
          )}
          {job && (
            <div className="processing" role="status">
              <span className="spinner" />
              <div>
                <strong>
                  {job.progressPercent < 10
                    ? "Preparing media"
                    : "Encoding and checking outputs"}
                </strong>
                <p>You can leave this page; the job is saved.</p>
              </div>
              <span>{job.progressPercent}%</span>
            </div>
          )}
          {data.jobs
            .filter((j) => j.status === "FAILED")
            .slice(0, 1)
            .map((j) => (
              <div className="error" key={j.id}>
                <strong>Processing failed: {j.errorCode}</strong>
                <p>No failed output can be published.</p>
                <button
                  disabled={busy || published}
                  onClick={() =>
                    act(() => api(`/api/owner/jobs/${j.id}/retry`, {}))
                  }
                >
                  Retry processing
                </button>
              </div>
            ))}
          {edit?.setupPreviewUrl && edit.revealPreviewUrl && (
            <section className="panel">
              <div className="panel-heading">
                <span className="step-num">03</span>
                <div>
                  <h2>Review what viewers will see</h2>
                  <p>
                    These are the actual encoded outputs · Revision{" "}
                    {edit.version}
                  </p>
                </div>
              </div>
              <div className="output-grid">
                <div>
                  <div className="video-label">
                    <span>SETUP</span>
                    <small>Before the choice</small>
                  </div>
                  <video
                    key={edit.setupPreviewUrl}
                    aria-label="Processed setup preview"
                    src={edit.setupPreviewUrl}
                    controls
                    playsInline
                    preload="metadata"
                  >
                    {edit.setupCaptions && (
                      <track
                        kind="captions"
                        src={`/api/owner/edits/${edit.id}/setup/captions`}
                        srcLang="en"
                        label="English"
                        default
                      />
                    )}
                  </video>
                  {edit.setupTranscript && (
                    <details className="media-alternative-text">
                      <summary>Setup text alternative</summary>
                      <p>{edit.setupTranscript}</p>
                    </details>
                  )}
                  <p className="fine">
                    Check the last frames and audio for spoilers.
                  </p>
                </div>
                <div>
                  <div className="video-label">
                    <span>REVEAL</span>
                    <small>After the choice</small>
                  </div>
                  <video
                    key={edit.revealPreviewUrl}
                    aria-label="Processed reveal preview"
                    src={edit.revealPreviewUrl}
                    controls
                    playsInline
                    preload="metadata"
                  >
                    {edit.revealCaptions && (
                      <track
                        kind="captions"
                        src={`/api/owner/edits/${edit.id}/reveal/captions`}
                        srcLang="en"
                        label="English"
                        default
                      />
                    )}
                  </video>
                  {edit.revealTranscript && (
                    <details className="media-alternative-text">
                      <summary>Reveal text alternative</summary>
                      <p>{edit.revealTranscript}</p>
                    </details>
                  )}
                  <p className="fine">
                    Check the first frames and the complete outcome.
                  </p>
                </div>
              </div>
              {changed && (
                <div className="note">
                  Boundaries or text alternatives changed. Render a new revision
                  before approval or publication.
                </div>
              )}
              <fieldset
                disabled={disabled || changed || edit.status === "APPROVED"}
                className="checklist"
              >
                <legend>Before you approve</legend>
                {checks.map(([key, label]) => (
                  <label key={key}>
                    <input
                      type="checkbox"
                      checked={
                        edit.status === "APPROVED" || Boolean(confirmed[key])
                      }
                      onChange={(e) =>
                        setConfirmed((old) => ({
                          ...old,
                          [key]: e.target.checked,
                        }))
                      }
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </fieldset>
              <div className="panel-bottom">
                <span className="fine">
                  Approval applies only to this content and these files.
                </span>
                <button
                  className="primary"
                  disabled={
                    disabled ||
                    changed ||
                    !checks.every(([key]) => confirmed[key]) ||
                    edit.status !== "NEEDS_REVIEW"
                  }
                  onClick={() => approve(edit)}
                >
                  {edit.status === "APPROVED"
                    ? "✓ Outputs approved"
                    : "Approve reviewed outputs"}
                </button>
              </div>
            </section>
          )}
        </div>
        <aside>
          <section className="panel moment-summary">
            <div className="eyebrow">THE RECORDED MOMENT</div>
            <h2>{m.question}</h2>
            <div className="summary-option">
              <span>A</span>
              {m.optionA}
            </div>
            <div className="summary-option">
              <span>B</span>
              {m.optionB}
            </div>
            <hr />
            <div className="eyebrow">PRIVATE CREATOR DETAILS</div>
            <dl>
              <dt>Actual choice</dt>
              <dd>
                {m.creatorChoice} ·{" "}
                {m.creatorChoice === "A" ? m.optionA : m.optionB}
              </dd>
              <dt>Recorded outcome</dt>
              <dd>{m.outcomeSummary}</dd>
              <dt>
                Frozen history · {m.mode === "DEMO" ? "DEMO" : "REAL TWITCH"}
              </dt>
              <dd>
                A {m.historical?.countA} / B {m.historical?.countB}
                <small>
                  {m.historical?.total}{" "}
                  {m.mode === "DEMO"
                    ? "synthetic responses"
                    : "participating Twitch accounts"}
                </small>
              </dd>
            </dl>
            <p className="fine">
              These details stay private until a replay viewer commits a choice.
            </p>
          </section>
          <section className="panel publish-card">
            <div className="eyebrow">04 / READY TO SHARE</div>
            <h2>Let someone else choose.</h2>
            <p className="muted">
              Publish the reviewed setup and a choice-gated reveal.
            </p>
            <button
              className="primary"
              disabled={disabled || changed || edit?.status !== "APPROVED"}
              onClick={() => setPublishDialog(true)}
            >
              {published ? "✓ Moment published" : "Publish moment ↗"}
            </button>
            <p className="fine">
              {published
                ? "This release is published. Use Unpublish & revise to make changes."
                : "Review and approve both outputs first."}
            </p>
          </section>
        </aside>
      </div>
      <EraseMoment moment={m} disabled={busy || Boolean(job)} />
      {publishDialog && (
        <Modal
          titleId="publish-title"
          close={() => {
            if (!busy) setPublishDialog(false);
          }}
        >
          <div className="eyebrow">PUBLISH THIS REVISION</div>
          <h2 id="publish-title">Ready for someone else’s choice?</h2>
          <p>
            The title, question, options and setup become accessible through the
            replay link. The actual reveal and comparison require a committed
            personal choice.
          </p>
          <p className="fine">
            The source of the responses remains labeled. The original master
            stays private.
          </p>
          <div className="hero-actions">
            <button onClick={() => setPublishDialog(false)}>
              Keep reviewing
            </button>
            <button
              className="primary"
              disabled={busy}
              onClick={() =>
                act(async () => {
                  await api(`/api/owner/moments/${id}/publish`, {
                    expectedVersion: m.version,
                    editId: edit!.id,
                    reviewHash: edit!.reviewHash,
                  });
                  setPublishDialog(false);
                })
              }
            >
              Confirm publication
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
function Replay() {
  const { slug } = useParams(),
    [manifest, setManifest] = useState<Manifest | null>(null),
    [attempt, setAttempt] = useState<Unlock | null>(null),
    [result, setResult] = useState<Result | null>(null),
    [phase, setPhase] = useState<
      "setup" | "choice" | "ready" | "reveal" | "result"
    >("setup"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [pending, setPending] = useState<"A" | "B" | null>(null);
  const firstChoice = useRef<HTMLButtonElement>(null);
  const revealButton = useRef<HTMLButtonElement>(null);
  const revealVideo = useRef<HTMLVideoElement>(null);
  const comparisonHeading = useRef<HTMLHeadingElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    let cancelled = false;
    api<Manifest>(`/api/replay/${slug}`)
      .then(async (m) => {
        if (cancelled) return;
        setManifest(m);
        const a = await api<Unlock | null>(`/api/replay/${slug}/attempt`);
        if (a && !cancelled) {
          setAttempt(a);
          setPhase("ready");
        }
      })
      .catch((e) => setError((e as Error).message));
    return () => {
      cancelled = true;
    };
  }, [slug]);
  useEffect(() => {
    if (phase === "choice") firstChoice.current?.focus();
    if (phase === "ready") revealButton.current?.focus();
    if (phase === "reveal") revealVideo.current?.focus();
    if (phase === "result") comparisonHeading.current?.focus();
  }, [phase]);
  async function choose(option: "A" | "B") {
    if (!manifest) return;
    setBusy(true);
    setPending(option);
    setError("");
    try {
      const a = await api<Unlock>(
        `/api/replay/${slug}/attempts`,
        { releaseId: manifest.releaseId, optionId: option },
        manifest.csrfToken,
      );
      setAttempt(a);
      setPhase("ready");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function finish() {
    if (!attempt) return;
    try {
      setResult(
        await api<Result>(`/api/replay/attempts/${attempt.attemptId}/result`),
      );
      setPhase("result");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const label = (id: "A" | "B") =>
    manifest?.options.find((o) => o.id === id)?.label;
  return (
    <main id="main-content" tabIndex={-1} className="replay">
      <div className="replay-heading">
        <div className="eyebrow">A MOMENT YOU CAN STILL BE PART OF</div>
        <h1>{manifest?.title ?? "Your moment is loading…"}</h1>
        <p>Make your choice before the reveal.</p>
        <span className="demo-pill">
          {manifest
            ? manifest.mode === "DEMO"
              ? "SIMULATED DEMO · NO LIVE TWITCH CONNECTION"
              : "RECORDED TWITCH MOMENT · ORIGINAL LIVE RESPONSES"
            : "LOADING MOMENT"}
        </span>
      </div>
      <ErrorBox message={error} />
      {manifest && (
        <>
          <div
            className="replay-progress"
            role="list"
            aria-label="Replay progress"
          >
            <span
              role="listitem"
              aria-current={phase === "setup" ? "step" : undefined}
              className="active"
            >
              01 Watch
            </span>
            <i />
            <span
              role="listitem"
              aria-current={phase === "choice" ? "step" : undefined}
              className={phase !== "setup" ? "active" : ""}
            >
              02 Choose
            </span>
            <i />
            <span
              role="listitem"
              aria-current={
                ["ready", "reveal", "result"].includes(phase)
                  ? "step"
                  : undefined
              }
              className={
                ["ready", "reveal", "result"].includes(phase) ? "active" : ""
              }
            >
              03 Reveal
            </span>
          </div>
          <div className="replay-player">
            {(phase === "setup" || phase === "choice") && (
              <>
                <video
                  ref={video}
                  aria-label="Setup recording"
                  controls
                  playsInline
                  preload="metadata"
                  src={manifest.setup.url}
                  onEnded={() => setPhase("choice")}
                  onError={() =>
                    setError("This video could not be played. Reload to retry.")
                  }
                >
                  {manifest.setup.captionsUrl && (
                    <track
                      kind="captions"
                      src={manifest.setup.captionsUrl}
                      srcLang="en"
                      label="English"
                      default
                    />
                  )}
                </video>
                {manifest.setup.transcript && (
                  <details className="media-alternative-text">
                    <summary>Read setup text alternative</summary>
                    <p>{manifest.setup.transcript}</p>
                  </details>
                )}
                <div className="player-caption">
                  <span>THE SETUP</span>
                  <span>
                    Original recording ·{" "}
                    {(manifest.setup.durationMs / 1000).toFixed(1)} sec
                  </span>
                </div>
              </>
            )}
            {phase === "ready" && (
              <div className="reveal-ready">
                <span className="choice-seal">{attempt?.optionId}</span>
                <div className="eyebrow">YOUR CHOICE IS SAVED</div>
                <h2>You chose {label(attempt!.optionId)}.</h2>
                <p>Now see the creator’s actual recorded decision.</p>
                <button
                  ref={revealButton}
                  className="primary"
                  onClick={() => {
                    setError("");
                    setPhase("reveal");
                  }}
                >
                  ▶ Watch the actual outcome
                </button>
              </div>
            )}
            {(phase === "reveal" || phase === "result") && attempt && (
              <>
                <video
                  ref={revealVideo}
                  key={attempt.revealUrl}
                  aria-label="Actual outcome recording"
                  src={attempt.revealUrl}
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                  onEnded={finish}
                  onError={() =>
                    setError(
                      "The outcome could not be played. Reload to retry. Your choice is saved.",
                    )
                  }
                >
                  {attempt.revealCaptionsUrl && (
                    <track
                      kind="captions"
                      src={attempt.revealCaptionsUrl}
                      srcLang="en"
                      label="English"
                      default
                    />
                  )}
                </video>
                {attempt.revealTranscript && (
                  <details className="media-alternative-text">
                    <summary>Read reveal text alternative</summary>
                    <p>{attempt.revealTranscript}</p>
                  </details>
                )}
                <div className="player-caption">
                  <span>THE ACTUAL OUTCOME</span>
                  <span>Use play if playback has not started.</span>
                </div>
              </>
            )}
          </div>
          {(phase === "setup" || phase === "choice") && (
            <section className="decision">
              <div className="eyebrow">YOUR TURN TO DECIDE</div>
              <h2>{manifest.question}</h2>
              {phase === "setup" ? (
                <>
                  <p className="muted">Watch the setup, then make your pick.</p>
                  <button
                    className="text-button"
                    onClick={() => {
                      video.current?.pause();
                      setPhase("choice");
                    }}
                  >
                    I understand — choose now →
                  </button>
                </>
              ) : (
                <>
                  <p className="muted">
                    No result is loaded yet. What would you do?
                  </p>
                  <div className="choices">
                    {manifest.options.map((o, i) => (
                      <button
                        ref={i === 0 ? firstChoice : undefined}
                        key={o.id}
                        disabled={busy}
                        onClick={() => choose(o.id)}
                        className={pending === o.id ? "pending" : ""}
                      >
                        <span>{o.id}</span>
                        <strong>{o.label}</strong>
                        <i>{busy && pending === o.id ? "Saving…" : "↗"}</i>
                      </button>
                    ))}
                  </div>
                  {error && pending && (
                    <button onClick={() => choose(pending)} disabled={busy}>
                      Retry saving {pending}
                    </button>
                  )}
                </>
              )}
            </section>
          )}
          {phase === "reveal" && error && (
            <button onClick={finish}>Retry comparison after playback</button>
          )}
          {result && phase === "result" && (
            <section className="comparison">
              <div className="eyebrow">THE MOMENT, IN PERSPECTIVE</div>
              <h2 ref={comparisonHeading} tabIndex={-1}>
                {result.yourChoice === result.creatorChoice
                  ? "Same choice. One real outcome."
                  : "Different choices. One real outcome."}
              </h2>
              <div className="comparison-picks">
                <div>
                  <span>Your personal choice</span>
                  <strong>
                    {result.yourChoice}{" "}
                    <small>{label(result.yourChoice)}</small>
                  </strong>
                </div>
                <div>
                  <span>Creator’s actual choice</span>
                  <strong>
                    {result.creatorChoice}{" "}
                    <small>{label(result.creatorChoice)}</small>
                  </strong>
                </div>
              </div>
              <div className="outcome">
                <span>WHAT HAPPENED</span>
                <p>{result.outcomeSummary}</p>
              </div>
              <div className="section-heading">
                <h3>Original responses</h3>
                <span className="tiny-badge">
                  {result.historical.mode === "DEMO"
                    ? "SYNTHETIC DEMO"
                    : "REAL TWITCH"}
                </span>
              </div>
              {result.historical.total === 0 ? (
                <p>No live responses.</p>
              ) : (
                <>
                  <div className="vote-bar">
                    <span
                      style={{
                        width: `${(result.historical.countA / result.historical.total) * 100}%`,
                      }}
                    />
                    <span style={{ flex: 1 }} />
                  </div>
                  <div className="vote-labels">
                    <span>
                      A · {label("A")} <b>{result.historical.countA}</b>
                    </span>
                    <span>
                      B · {label("B")} <b>{result.historical.countB}</b>
                    </span>
                  </div>
                  <p className="fine">
                    {result.historical.total}{" "}
                    {result.historical.mode === "DEMO"
                      ? "synthetic responses"
                      : "participating Twitch accounts"}{" "}
                    · frozen before the outcome
                  </p>
                </>
              )}
              <div className="note">
                Your personal choice did not change the recording or the
                original responses.
              </div>
            </section>
          )}
          <div className="replay-foot">
            <span>◈</span> A personal choice, not an alternate ending.
          </div>
        </>
      )}
    </main>
  );
}
function Privacy() {
  return (
    <main id="main-content" tabIndex={-1} className="privacy panel">
      <div className="eyebrow">APPLICATION DATA</div>
      <h1>Privacy & your moment</h1>
      <p>
        This application stores recordings, frozen responses and anonymous
        browser choices on the application server. Demo responses are labeled
        synthetic. In real mode, Twitch supplies authorized channel messages;
        only accepted A/B commands are persisted, with account identifiers
        hashed per moment. Ordinary chat and display names are not stored. There
        is no third-party analytics.
      </p>
      <p>
        Twitch access and refresh tokens are encrypted on disk. Disconnect
        Twitch in the studio to stop intake and revoke creator sessions. Later
        chat-message deletion does not remove a previously accepted vote. These
        are participating accounts, not a count of distinct people.
      </p>
      <p>
        A first-party, HttpOnly cookie keeps your choice for seven days.
        Clearing cookies creates another browser session; this is not a count of
        unique people. Expired sessions and their replay choices are removed on
        server startup and within one minute while the server is running.
      </p>
      <p>
        Original recordings and editing masters are creator-only. Published
        setup media is accessible through its replay link. Reveal and comparison
        access requires a choice in the same browser session.
      </p>
      <p>
        The creator can unpublish to stop future access. Bytes already
        downloaded cannot be recalled. Use Delete moment in creator review to
        remove a moment, its votes, review history and replay choices.
        Recordings are removed in the background, with retries after restart.
        This does not erase external copies, backups, or securely overwrite
        storage hardware.
      </p>
      <ClearChoices />
      <Link className="button" to="/">
        Back to Playable Moments
      </Link>
    </main>
  );
}
const root = createRoot(document.getElementById("root")!);
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Runtime>
        <Shell>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/studio" element={<Studio />} />
            <Route path="/studio/moments/:id/live" element={<LiveMoment />} />
            <Route path="/overlay/:key" element={<Overlay />} />
            <Route path="/studio/moments/:id/review" element={<Review />} />
            <Route path="/m/:slug" element={<Replay />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route
              path="*"
              element={
                <main id="main-content" tabIndex={-1}>
                  <h1>Moment not found.</h1>
                  <Link to="/">Return home</Link>
                </main>
              }
            />
          </Routes>
        </Shell>
      </Runtime>
    </BrowserRouter>
  </React.StrictMode>,
);
