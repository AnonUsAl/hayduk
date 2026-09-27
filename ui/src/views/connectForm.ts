// Connect-dialog form state, pure so the port edge cases stay tested.

export const CONNECT_DEFAULTS = { host: "127.0.0.1", port: 55553, ssl: false, username: "msf" };

export function parsePort(text: string): number | undefined {
  if (!/^\d+$/.test(text.trim())) return undefined;
  const n = Number(text.trim());
  return n >= 1 && n <= 65535 ? n : undefined;
}

export function loadConnectDefaults(
  storage: Pick<Storage, "getItem"> = localStorage,
): typeof CONNECT_DEFAULTS {
  const d = { ...CONNECT_DEFAULTS };
  for (const k of Object.keys(CONNECT_DEFAULTS) as (keyof typeof CONNECT_DEFAULTS)[]) {
    const v = storage.getItem("hayduk." + k);
    if (v === null) continue;
    if (k === "port") {
      const p = parsePort(v);
      if (p !== undefined) (d as any)[k] = p;
    } else if (k === "ssl") {
      (d as any)[k] = v === "true";
    } else {
      (d as any)[k] = v;
    }
  }
  return d;
}

// Preserve the original error as detail when a known error has user guidance.
export function friendlyConnectError(raw: string): { primary: string; detail: string } {
  const text = raw.trim();
  const lower = text.toLowerCase();
  if (lower.includes("login failed")) {
    return { primary: "登录失败——msfrpcd 拒绝了该用户名或密码。", detail: text };
  }
  if (/connection refused|no connection could be made/.test(lower)) {
    return { primary: "连接被拒绝——该主机端口无人应答，msfrpcd 是否已启动？", detail: text };
  }
  if (/timeout|timed out|deadline exceeded/.test(lower)) {
    return { primary: "连接 msfrpcd 超时——请检查主机、端口与 SSL 设置。", detail: text };
  }
  if (/tls|ssl|handshake|http response to https/.test(lower)) {
    return { primary: "协议不匹配——请切换 SSL 选项，使其与 msfrpcd 的运行方式一致。", detail: text };
  }
  return { primary: text, detail: "" };
}
