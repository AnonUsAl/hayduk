import { Show, createSignal } from "solid-js";
import { Modal } from "../components/modal";
import { ws } from "../ws/singleton";
import { CommandError } from "../ws/client";

export function UpgradeDialog(props: { sid: string; onClose: () => void }) {
  const [lhost, setLhost] = createSignal("");
  const [lport, setLport] = createSignal("4444");
  const [error, setError] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const valid = () => lhost().trim() !== "" && Number(lport()) > 0;

  async function upgrade() {
    setBusy(true);
    setError("");
    try {
      await ws.command("session.upgrade", {
        sid: props.sid, lhost: lhost().trim(), lport: Number(lport()),
      });
      props.onClose();
    } catch (e) {
      setError(e instanceof CommandError ? `${e.code}: ${e.message}` : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`将会话 ${props.sid} 升级为 meterpreter`} onClose={props.onClose} width="440px">
      <p style="margin-top:4px; font:400 12px/1.55 var(--sans); color:var(--tx2)">
        框架会在该回连地址上启动 meterpreter 监听，并把 shell 迁移过去。新会话上线后会出现在列表中。
      </p>
      <div style="margin-top:14px; display:grid; grid-template-columns:1.4fr 1fr; gap:10px">
        <label style="display:grid; gap:4px">
          <span style="font:500 11px var(--sans); color:var(--tx1)">LHOST</span>
          <input value={lhost()} placeholder="10.0.0.99"
            onInput={(e) => setLhost(e.currentTarget.value)} autocomplete="off" spellcheck={false} />
        </label>
        <label style="display:grid; gap:4px">
          <span style="font:500 11px var(--sans); color:var(--tx1)">LPORT</span>
          <input value={lport()} inputmode="numeric"
            onInput={(e) => setLport(e.currentTarget.value)} autocomplete="off" />
        </label>
      </div>
      <Show when={error()}><p style="color:var(--red-br); margin-top:12px">{error()}</p></Show>
      <div class="mbtns">
        <button class="abtn" style="flex:none; padding:0 20px" disabled={busy() || !valid()}
          onClick={() => void upgrade()}>
          {busy() ? "升级中…" : "升级"}
        </button>
      </div>
    </Modal>
  );
}
