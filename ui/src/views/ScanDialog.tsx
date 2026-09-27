import { For, Show, createMemo, createSignal } from "solid-js";
import { Modal } from "../components/modal";
import { campaignState } from "../stores/store";
import { DISCOVERY_MODULES, SERVICE_MODULES, pickModules } from "./scan";

export function ScanDialog(props: {
  mode: "discovery" | "services";
  target?: string;
  onConfigure: (module: string, target: string) => void;
  onClose: () => void;
}) {
  const discovery = () => props.mode === "discovery";
  const modules = createMemo(() =>
    pickModules(campaignState().modules?.auxiliary, discovery() ? DISCOVERY_MODULES : SERVICE_MODULES));
  const [target, setTarget] = createSignal(props.target ?? "");
  const [mod, setMod] = createSignal("");
  const chosen = () => mod() || modules()[0] || "";
  const valid = () => target().trim() !== "" && chosen() !== "";

  return (
    <Modal title={discovery() ? "发现主机" : "扫描服务"} onClose={props.onClose} width="480px">
      <p style="margin-top:4px; font:400 12px/1.55 var(--sans); color:var(--tx2)">
        {discovery()
          ? "扫描网段以发现存活主机。凡有响应的主机都会写入工作区数据库，并显示在拓扑图上。"
          : "对主机或网段进行端口扫描。发现的服务会填入服务表与主机检查器。"}
      </p>
      <label style="margin-top:14px; display:grid; gap:4px">
        <span style="font:500 11px var(--sans); color:var(--tx1)">
          目标 <span style="color:var(--tx2)">（主机或 CIDR 范围，作为 RHOSTS 发送）</span>
        </span>
        <input value={target()} placeholder="10.0.0.0/24"
          onInput={(e) => setTarget(e.currentTarget.value)} autocomplete="off" spellcheck={false} />
      </label>
      <label style="margin-top:10px; display:grid; gap:4px">
        <span style="font:500 11px var(--sans); color:var(--tx1)">扫描模块</span>
        <select value={chosen()} onChange={(e) => setMod(e.currentTarget.value)}>
          <For each={modules()}>{(m) => <option value={m}>{m}</option>}</For>
        </select>
      </label>
      <Show when={modules().length === 0}>
        <p style="color:var(--red-br); margin-top:10px">
          当前版本的模块库中没有扫描模块；请改从模块树中选择。
        </p>
      </Show>
      <div class="mbtns">
        <button class="abtn" style="flex:none; padding:0 20px" disabled={!valid()}
          onClick={() => props.onConfigure(chosen(), target().trim())}>
          启动…
        </button>
      </div>
    </Modal>
  );
}
