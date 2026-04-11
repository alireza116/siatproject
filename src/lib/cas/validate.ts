import { XMLParser } from "fast-xml-parser";

const CAS_VALIDATE = "https://cas.sfu.ca/cas/serviceValidate";

export type CasSuccess = { username: string; rawXml: string };

export async function validateCasTicket(
  ticket: string,
  serviceUrl: string
): Promise<{ ok: true; user: CasSuccess } | { ok: false; message: string }> {
  const url = new URL(CAS_VALIDATE);
  url.searchParams.set("ticket", ticket);
  url.searchParams.set("service", serviceUrl);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const rawXml = await res.text();

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    isArray: (name) => name === "authenticationSuccess" || name === "authenticationFailure",
  });

  const data = parser.parse(rawXml) as Record<string, unknown>;
  const serviceResponse = (data["cas:serviceResponse"] ?? data.serviceResponse) as
    | Record<string, unknown>
    | undefined;
  if (!serviceResponse) {
    const m = rawXml.match(/<cas:user>\s*([^<]+)\s*<\/cas:user>/);
    if (m?.[1]) {
      return { ok: true, user: { username: m[1].trim(), rawXml } };
    }
    return { ok: false, message: "Invalid CAS response" };
  }

  const success = (serviceResponse["cas:authenticationSuccess"] ?? serviceResponse.authenticationSuccess) as
    | Record<string, unknown>
    | Record<string, unknown>[]
    | undefined;
  const failure = (serviceResponse["cas:authenticationFailure"] ?? serviceResponse.authenticationFailure) as
    | Record<string, unknown>
    | string
    | undefined;

  if (failure) {
    const msg =
      typeof failure === "string"
        ? failure
        : String((failure as Record<string, unknown>)["@_code"] ?? "CAS authentication failed");
    return { ok: false, message: msg };
  }

  const block = Array.isArray(success) ? success[0] : success;
  if (!block) {
    return { ok: false, message: "CAS authentication failed" };
  }

  const user = block["cas:user"];
  const username = typeof user === "string" ? user : String(user ?? "");
  if (!username) {
    return { ok: false, message: "No CAS user in response" };
  }

  return { ok: true, user: { username, rawXml } };
}
