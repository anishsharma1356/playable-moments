let ownerCsrf = "";
const retries = new Map<string, string>();
export function setOwnerCsrf(value: string) {
  ownerCsrf = value;
}
export async function api<T>(
  url: string,
  body?: unknown,
  csrf = ownerCsrf,
  method = body === undefined ? "GET" : "POST",
): Promise<T> {
  const serialized = body === undefined ? undefined : JSON.stringify(body),
    signature = method + url + serialized;
  if (body !== undefined && !retries.has(signature))
    retries.set(signature, crypto.randomUUID());
  const response = await fetch(url, {
    method,
    credentials: "same-origin",
    headers:
      body === undefined
        ? {}
        : {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrf,
            "Idempotency-Key": retries.get(signature)!,
          },
    body: serialized,
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      error?: { message?: string; code?: string };
    } | null;
    if (response.status === 404 && data?.error?.code === "ATTEMPT_NOT_FOUND")
      return null as T;
    throw new Error(
      data?.error?.message ?? "The request failed. Please retry.",
    );
  }
  retries.delete(signature);
  return response.status === 204 ? (null as T) : ((await response.json()) as T);
}
export async function upload(
  url: string,
  file: File,
  version: number,
  onProgress: (n: number) => void,
) {
  const hash = Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", await file.arrayBuffer()),
    ),
    (n) => n.toString(16).padStart(2, "0"),
  ).join("");
  const signature = `${url}:${version}:${hash}`;
  if (!retries.has(signature)) retries.set(signature, crypto.randomUUID());
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("X-CSRF-Token", ownerCsrf);
    xhr.setRequestHeader("Idempotency-Key", retries.get(signature)!);
    xhr.setRequestHeader("X-Moment-Version", String(version));
    xhr.setRequestHeader("X-Content-SHA256", hash);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onerror = () =>
      reject(new Error("Upload interrupted. Select the same file to retry."));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        retries.delete(signature);
        resolve();
      } else {
        let message = "Upload failed. Please retry.";
        try {
          message = JSON.parse(xhr.responseText).error.message;
        } catch {
          /* retain safe fallback */
        }
        reject(new Error(message));
      }
    };
    const data = new FormData();
    data.append("file", file);
    xhr.send(data);
  });
}
