const YT_HOSTS = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)/i;

export function extractYoutubeVideoIds(input: string[]): string[] {
  const ids: string[] = [];
  for (const raw of input) {
    const s = raw.trim();
    if (!s) continue;
    try {
      const u = new URL(s.startsWith("http") ? s : `https://${s}`);
      if (u.hostname.includes("youtu.be")) {
        const id = u.pathname.replace(/^\//, "").split("/")[0];
        if (id) ids.push(id);
        continue;
      }
      if (u.hostname.includes("youtube.com")) {
        const v = u.searchParams.get("v");
        if (v) {
          ids.push(v);
          continue;
        }
        const parts = u.pathname.split("/").filter(Boolean);
        const embedIdx = parts.indexOf("embed");
        if (embedIdx >= 0 && parts[embedIdx + 1]) {
          ids.push(parts[embedIdx + 1]);
        }
      }
    } catch {
      if (/^[a-zA-Z0-9_-]{11}$/.test(s)) ids.push(s);
    }
  }
  return [...new Set(ids)];
}

export function isAllowedProjectUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function isYoutubeUrl(url: string): boolean {
  try {
    const u = new URL(url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`);
    return YT_HOSTS.test(u.hostname);
  } catch {
    return false;
  }
}
