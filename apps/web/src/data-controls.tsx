import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { MomentDto } from "../../../packages/contracts/src/index.js";
import { api } from "./api";

export function Modal({
  titleId,
  close,
  children,
}: {
  titleId: string;
  close: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal panel"
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
          ),
        ).filter(
          (element) =>
            element.tabIndex >= 0 && element.getClientRects().length > 0,
        );
        const first = controls[0],
          last = controls.at(-1);
        if (!first || !last) {
          event.preventDefault();
          return;
        }
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      {children}
    </dialog>
  );
}

export function EraseMoment({
  moment,
  disabled = false,
}: {
  moment: MomentDto;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [confirmation, setConfirmation] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const navigate = useNavigate();
  return (
    <section className="data-controls">
      <button
        disabled={disabled || moment.captureState === "OPEN"}
        onClick={() => {
          setConfirmation("");
          setError("");
          setOpen(true);
        }}
      >
        Delete moment…
      </button>
      {open && (
        <Modal
          titleId="erase-title"
          close={() => {
            if (!busy) setOpen(false);
          }}
        >
          <h2 id="erase-title">Permanently delete this moment?</h2>
          <p>
            This removes its replay link, recordings, live votes, saved replay
            choices and review history. This cannot be undone. Copies already
            downloaded or backed up remain outside this deletion.
          </p>
          <p>
            Type <strong>{moment.title}</strong> to confirm.
          </p>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);
              setError("");
              try {
                await api("/api/owner/erase-moment", {
                  momentId: moment.id,
                  expectedVersion: moment.version,
                  confirmation,
                });
                navigate("/studio?deleted=1");
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Confirm moment title
              <input
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                disabled={busy}
                maxLength={80}
                autoComplete="off"
              />
            </label>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <div className="hero-actions">
              <button
                type="button"
                disabled={busy}
                onClick={() => setOpen(false)}
              >
                Keep moment
              </button>
              <button
                type="submit"
                disabled={busy || confirmation !== moment.title}
              >
                {busy ? "Deleting…" : "Permanently delete"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}

export function StorageStatus() {
  const [status, setStatus] = useState<{
    pendingFiles: number;
    retryingFiles: number;
  } | null>(null);
  useEffect(() => {
    let stopped = false;
    const check = () =>
      void api<{ pendingFiles: number; retryingFiles: number }>(
        "/api/owner/storage-status",
      )
        .then((s) => {
          if (!stopped) setStatus(s);
        })
        .catch(() => {});
    check();
    const timer = setInterval(check, 5000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, []);
  if (!status) return null;
  return (
    <p className="fine" role="status">
      {status.pendingFiles
        ? `${status.pendingFiles} recording file(s) awaiting deletion. ${status.retryingFiles ? "Some files are locked or unavailable; cleanup will retry automatically." : "Cleanup continues in the background."}`
        : "Recording cleanup is up to date."}
    </p>
  );
}

export function ClearChoices() {
  const [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <section className="data-controls">
      <h2>Your saved replay choices</h2>
      <p>
        Remove choices associated with this browser session. Live responses and
        other viewers’ choices stay unchanged.
      </p>
      <button onClick={() => setConfirm(true)}>Clear my replay choices…</button>
      {message && <p role="status">{message}</p>}
      {confirm && (
        <Modal
          titleId="clear-title"
          close={() => {
            if (!busy) setConfirm(false);
          }}
        >
          <h2 id="clear-title">Clear your replay choices?</h2>
          <p>
            This permanently removes this browser session’s saved choices and
            access to previously unlocked reveals.
          </p>
          <div className="hero-actions">
            <button disabled={busy} onClick={() => setConfirm(false)}>
              Keep choices
            </button>
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const auth = await api<{ csrfToken: string }>(
                    "/api/privacy/session",
                  );
                  await api("/api/privacy/clear-choices", {}, auth.csrfToken);
                  setMessage("Your replay choices have been cleared.");
                  setConfirm(false);
                } catch (e) {
                  setMessage((e as Error).message);
                  setConfirm(false);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Confirm clear choices
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
