const ADMIN_KEY = "p2v_admin_password";

export function getAdminPassword(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ADMIN_KEY);
}

export function setAdminPassword(password: string) {
  sessionStorage.setItem(ADMIN_KEY, password);
}

export function clearAdminPassword() {
  sessionStorage.removeItem(ADMIN_KEY);
}

export async function adminFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const password = getAdminPassword();
  const headers: Record<string, string> = {
    "X-Admin-Password": password || "",
  };

  // Only set Content-Type for non-FormData bodies
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  return fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers as Record<string, string>),
    },
  });
}

/**
 * Upload an image file to the server.
 * Uses multipart/form-data -- does NOT set Content-Type manually
 * so the browser can set the boundary.
 */
export async function adminUploadImage(
  file: File,
  stationId: string,
  stepId: string
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("stationId", stationId);
  formData.append("stepId", stepId);

  const password = getAdminPassword();
  const res = await fetch("/api/upload/image", {
    method: "POST",
    headers: {
      "X-Admin-Password": password || "",
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error al subir imagen: ${text}`);
  }

  return res.json();
}
