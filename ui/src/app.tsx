import { For, Show, createEffect, createSignal, on, onCleanup, onMount } from "solid-js";
import ConnectDialog from "./views/ConnectDialog";
import { ContextMenuRoot, closeContextMenu, openContextMenu } from "./components/contextmenu";
import { Dropdown, MenuItemButton } from "./components/dropdown";
import { Modal } from "./components/modal";
import { ModuleTree } from "./components/ModuleTree";
import { ConsoleView } from "./components/ConsoleView";
import { TopologyGraph } from "./components/TopologyGraph";
import { SessionsView } from "./views/SessionsView";
import { JobsView } from "./views/JobsView";
import { CredsView } from "./views/CredsView";
import { LootView } from "./views/LootView";
import { EventsView } from "./views/EventsView";
import { ServicesView } from "./views/ServicesView";
import { Inspector } from "./views/Inspector";
import { InteractView } from "./views/InteractView";
import { LaunchDialog } from "./views/LaunchDialog";
import { ScanDialog } from "./views/ScanDialog";
import { LoginDialog } from "./views/LoginDialog";
import { FindAttacksDialog } from "./views/FindAttacksDialog";
import { HailMaryDialog } from "./views/HailMaryDialog";
import { campaignState, protoMismatch, serverVersion, team as teamMode, wsStatus } from "./stores/store";
import { consoleBusy, consoleOutput, consolePrompt, tabs as consoleTabs, write } from "./stores/console";
import { attach } from "./stores/interact";
import { ws } from "./ws/singleton";
import { currentOperator } from "./ws/client";
import { forgetOperator, restoreOperator, saveOperator } from "./ws/operator";
import { flash } from "./statusflash";
import { HaydukMark } from "./components/mark";
import { switchWorkspaceAction } from "./appActions";
import { DEFAULT_PANELS, clamp, clampNotebook, clampPanels, type PanelSizes } from "./stores/panels";

const notebookTabs: [string, string, string][] = [
  ["console", "terminal-window", "控制台"],
  ["interact", "terminal", "交互"],
  ["sessions", "broadcast", "会话"],
  ["jobs", "gear", "任务"],
  ["creds", "key", "凭据"],
  ["loot", "archive", "战利品"],
  ["events", "pulse", "事件"],
];

function loadPanels(): PanelSizes {
  try {
    const raw = localStorage.getItem("hayduk.panels");
    if (raw) return clampPanels(JSON.parse(raw), window.innerHeight);
  } catch {
    // corrupt sizes fall back to defaults
  }
  return { ...DEFAULT_PANELS };
}

function Splitter(props: { area: "lsp" | "rsp" | "nsp"; onDelta: (dx: number, dy: number) => void; onEnd?: () => void }) {
  let el!: HTMLDivElement;
  const [active, setActive] = createSignal(false);
  let last: { x: number; y: number } | null = null;
  return (
    <div
      ref={el}
      class={`splitter ${props.area}`}
      classList={{ active: active() }}
      onPointerDown={(e) => {
        last = { x: e.clientX, y: e.clientY };
        el.setPointerCapture(e.pointerId);
        setActive(true);
      }}
      onPointerMove={(e) => {
        if (!last) return;
        props.onDelta(e.clientX - last.x, e.clientY - last.y);
        last = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={() => { last = null; setActive(false); props.onEnd?.(); }}
      onPointerCancel={() => { last = null; setActive(false); props.onEnd?.(); }}
    />
  );
}

export default function App() {
  const [tab, setTab] = createSignal("console");
  const [stage, setStage] = createSignal<"topo" | "svc">("topo");
  const [selectedHost, setSelectedHost] = createSignal<string | undefined>(undefined);
  const [launch, setLaunch] = createSignal<{ type: string; path: string; host?: string; port?: number } | null>(null);
  const [scan, setScan] = createSignal<"discovery" | "services" | null>(null);
  const [loginHost, setLoginHost] = createSignal<string | undefined>(undefined);
  const [findOpen, setFindOpen] = createSignal(false);
  const [hailOpen, setHailOpen] = createSignal(false);
  const [showAbout, setShowAbout] = createSignal(false);
  const [showKeys, setShowKeys] = createSignal(false);
  const [grid, setGrid] = createSignal(true);
  const [graphFocus, setGraphFocus] = createSignal(false);
  const [workspaces, setWorkspaces] = createSignal<string[]>([]);
  const [panels, setPanels] = createSignal(loadPanels());
  // a stored name must ride on commands again without re-prompting
  const [operatorName, setOperatorName] = createSignal(restoreOperator());
  const [operatorDraft, setOperatorDraft] = createSignal("");

  function savePanels() {
    localStorage.setItem("hayduk.panels", JSON.stringify(panels()));
  }
  function resizeLeft(dx: number) {
    setPanels(p => ({ ...p, left: clamp(p.left + dx, 200, 560) }));
  }
  function resizeRight(dx: number) {
    setPanels(p => ({ ...p, right: clamp(p.right - dx, 250, 640) }));
  }
  function resizeNotebook(_dx: number, dy: number) {
    setPanels(p => ({ ...p, nb: clampNotebook(p.nb - dy, window.innerHeight) }));
  }

  const conn = () => campaignState().connection;
  const liveCount = () => Object.keys(campaignState().sessions).length;
  const jobCount = () => Object.keys(campaignState().jobs).length;
  const totalModules = () => {
    const m = campaignState().modules;
    if (!m) return 0;
    return [m.exploits, m.auxiliary, m.post, m.payloads, m.encoders, m.nops, m.evasion]
      .reduce((a, v) => a + (v?.length ?? 0), 0);
  };

  function openInteract(sid: string) {
    // the tab switches only once the engine confirms the attach; otherwise
    // the operator lands on an empty console with no clue why
    attach(sid).then(
      () => { setGraphFocus(false); setTab("interact"); },
      (e: any) => flash(e?.message ?? `无法附加到会话 ${sid}`),
    );
  }

  function fit() {
    window.dispatchEvent(new CustomEvent("hayduk:fit"));
  }

  function zoom(dir: number) {
    window.dispatchEvent(new CustomEvent("hayduk:zoom", { detail: { k: dir > 0 ? 1.2 : 1 / 1.2 } }));
  }

  async function loadWorkspaces() {
    try {
      setWorkspaces(await ws.command<string[]>("workspace.list"));
    } catch {
      // workspace list needs a connected msf database; the chip stays empty
    }
  }

  // the list loads before the menu opens, or the menu renders empty and
  // whatever arrives later never shows
  async function openWorkspaceMenu(anchor: HTMLElement) {
    if (conn().status !== "connected") return;
    await loadWorkspaces();
    const rect = anchor.getBoundingClientRect();
    openContextMenu(rect.left, rect.bottom + 4, [
      { head: "工作区", sub: "切换当前 msf 工作区" },
      ...workspaces().map(w => ({
        label: w,
        icon: w === conn().workspace ? "check" : undefined,
        fn: () => void switchWorkspace(w),
      })),
    ]);
  }

  const switchWorkspace = switchWorkspaceAction({
    command: (method, params) => ws.command(method, params),
    onSwitched: () => setSelectedHost(undefined),
    flash,
  });

  // the old workspace's hosts do not exist in the new one, so the selection
  // must die with the workspace change itself - not with the command's
  // success: a switch whose reload then fails still changed the workspace
  createEffect(on(() => conn().workspace, () => setSelectedHost(undefined), { defer: true }));

  function commitOperator() {
    const name = operatorDraft().trim();
    if (!name) return;
    saveOperator(name);
    setOperatorName(name);
    // register presence at once instead of waiting for the next command
    void ws.command("operator.join").catch(() => {});
  }

  function disconnect() {
    void ws.command("disconnect").catch(() => {});
  }

  async function exportReport() {
    try {
      const { html } = await ws.command<{ html: string }>("report.html");
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hayduk-report-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.html`;
      a.click();
      URL.revokeObjectURL(url);
      flash("报告已导出");
    } catch (e: any) {
      flash(e.message ?? "报告导出失败");
    }
  }

  onMount(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeContextMenu();
        setShowAbout(false);
        setShowKeys(false);
        return;
      }
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "1") setStage("topo");
      else if (e.key === "2") setStage("svc");
      else if ((e.key === "f" || e.key === "F") && stage() === "topo") fit();
    };
    document.addEventListener("keydown", onKey);
    onCleanup(() => document.removeEventListener("keydown", onKey));
  });

  return (
    <>
      <div class="app" classList={{ "graph-focused": graphFocus() }} style={{
        "--w-left": `${panels().left}px`,
        "--w-right": `${panels().right}px`,
        "--h-nb": `${panels().nb}px`,
      }}>
      <header class="menubar card">
        <div class="brand">
          <HaydukMark size={21} />
          <span class="word">hayduk<span class="brand-dot">.</span></span>
          <span class="brand-caption">安全工作区</span>
        </div>

        <Dropdown id="m-file" label="文件">
          <MenuItemButton icon="plug" label="新建连接…" onClick={() => disconnect()} />
          <MenuItemButton icon="x" label="断开连接" disabled={conn().status === "disconnected"}
            onClick={() => disconnect()} />
          <div class="dsep"></div>
          <MenuItemButton icon="download-simple" label="导出报告…" onClick={() => void exportReport()} />
          <MenuItemButton icon="info" label="关于 hayduk" onClick={() => setShowAbout(true)} />
        </Dropdown>

        <Dropdown id="m-camp" label="行动">
          <MenuItemButton icon="crosshair" label="发现主机…" disabled={conn().status !== "connected"}
            onClick={() => setScan("discovery")} />
          <MenuItemButton icon="wifi-high" label="扫描服务…" disabled={conn().status !== "connected"}
            onClick={() => setScan("services")} />
          <MenuItemButton icon="key" label="爆破登录…" disabled={conn().status !== "connected"}
            onClick={() => flash("右键单击拓扑图中的主机，选择「以…登录」")} />
          <div class="dsep"></div>
          <MenuItemButton icon="lightning" label="查找攻击…" disabled={conn().status !== "connected"}
            onClick={() => setFindOpen(true)} />
          <div class="dsep"></div>
          <MenuItemButton icon="fire" label="万福玛丽…" disabled={conn().status !== "connected"}
            onClick={() => setHailOpen(true)} />
        </Dropdown>

        <Dropdown id="m-view" label="视图">
          <MenuItemButton icon="graph" label="拓扑" hint="1" onClick={() => setStage("topo")} />
          <MenuItemButton icon="table" label="服务" hint="2" onClick={() => setStage("svc")} />
          <div class="dsep"></div>
          <MenuItemButton icon="dots-nine" label={grid() ? "点阵网格：开" : "点阵网格：关"}
            onClick={() => setGrid(!grid())} />
          <MenuItemButton icon="arrows-out-simple" label="全屏" hint="F11"
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen();
              else void document.documentElement.requestFullscreen();
            }} />
        </Dropdown>

        <Dropdown id="m-help" label="帮助">
          <MenuItemButton icon="keyboard" label="键盘与鼠标" onClick={() => setShowKeys(true)} />
          <div class="dsep"></div>
          <MenuItemButton icon="info" label="关于 hayduk" onClick={() => setShowAbout(true)} />
        </Dropdown>

        <span class="spacer"></span>
        <Show when={teamMode()}>
          <span class="chip" title="团队会话：点击修改操作员名称"
            onClick={() => {
              const previous = currentOperator();
              forgetOperator(localStorage);
              setOperatorName("");
              setOperatorDraft(previous); // prefill the old name to edit
            }}>
            <i aria-hidden="true" class="ph ph-users-three"></i>
            <b>{operatorName() || "未命名"}</b> · {(campaignState().operators ?? []).length} live
          </span>
        </Show>
        <button class="chip workspace-chip" disabled={conn().status !== "connected"} title="当前工作区：点击切换"
          onClick={(e) => void openWorkspaceMenu(e.currentTarget as HTMLElement)}>
          <i aria-hidden="true" class="ph ph-stack"></i> 工作区 <b>{conn().workspace || "未连接"}</b><i aria-hidden="true" class="ph ph-caret-down"></i>
        </button>
      </header>

      <div class="toolbar">
        <div class="campaign-heading">
          <div class="eyebrow">METASPLOIT / 行动</div>
          <h1>行动概览<span class="heading-dot">.</span></h1>
          <p>发现主机、扫描服务、管理会话。</p>
        </div>
        <span class="spacer"></span>
        <button class="tbtn" disabled={conn().status !== "connected"} onClick={() => void exportReport()}>
          <i aria-hidden="true" class="ph ph-download-simple"></i>导出报告
        </button>
        <button class="tbtn" disabled={conn().status !== "connected"} onClick={() => setScan("services")}>
          <i aria-hidden="true" class="ph ph-wifi-high"></i>扫描服务
        </button>
        <button class="tbtn primary" disabled={conn().status !== "connected"} onClick={() => setScan("discovery")}>
          <i aria-hidden="true" class="ph ph-plus"></i>发现主机
        </button>
      </div>

      <section class="overview" aria-label="行动摘要">
        <button class="metric" onClick={() => setStage("topo")}>
          <span class="metric-icon"><i aria-hidden="true" class="ph ph-graph"></i></span>
          <span class="metric-label">已发现主机</span><strong>{campaignState().hosts.length}</strong>
        </button>
        <button class="metric" onClick={() => setStage("svc")}>
          <span class="metric-icon"><i aria-hidden="true" class="ph ph-stack"></i></span>
          <span class="metric-label">服务</span><strong>{campaignState().services.length}</strong>
        </button>
        <button class="metric" classList={{ live: liveCount() > 0 }} onClick={() => setTab("sessions")}>
          <span class="metric-icon"><i aria-hidden="true" class="ph ph-broadcast"></i></span>
          <span class="metric-label">活动会话</span><strong>{liveCount()}</strong>
        </button>
        <button class="metric" onClick={() => setTab("creds")}>
          <span class="metric-icon"><i aria-hidden="true" class="ph ph-key"></i></span>
          <span class="metric-label">凭据</span><strong>{campaignState().creds.length}</strong>
        </button>
      </section>

      <aside class="left card">
        <div class="panelhead"><i aria-hidden="true" class="ph ph-stack"></i><span class="pt">模块库</span>
          <span class="pc">{totalModules().toLocaleString()}</span>
        </div>
        <p class="panel-description">选择一个模块以配置其参数。</p>
        <ModuleTree onLaunch={(type, path) => setLaunch({ type, path, host: selectedHost() })} />
      </aside>

      <main class="stage card">
        <div class="stagehead">
          <span class="stage-title">网络地图</span>
          <div class="seg">
            <button aria-pressed={stage() === "topo"} classList={{ on: stage() === "topo" }} onClick={() => setStage("topo")}>
              <i aria-hidden="true" class="ph ph-graph"></i>拓扑
            </button>
            <button aria-pressed={stage() === "svc"} classList={{ on: stage() === "svc" }} onClick={() => setStage("svc")}>
              <i aria-hidden="true" class="ph ph-table"></i>服务
            </button>
          </div>
          <span class="spacer"></span>
          <Show when={stage() === "topo"}>
            <div class="zoomui">
              <button class="zbtn" aria-label="缩小" onClick={() => zoom(-1)}><i aria-hidden="true" class="ph ph-minus"></i></button>
              <button class="zbtn" aria-label="放大" onClick={() => zoom(1)}><i aria-hidden="true" class="ph ph-plus"></i></button>
              <button class="zbtn" aria-label="适应视图" onClick={fit} title="使拓扑图适应视图 (F)"><i aria-hidden="true" class="ph ph-corners-out"></i></button>
            </div>
          </Show>
          <button class="graph-focus" aria-pressed={graphFocus()} onClick={() => setGraphFocus(!graphFocus())} title={graphFocus() ? "返回行动概览" : "展开地图与检查器"}>
            <i aria-hidden="true" class="ph ph-arrows-out-simple"></i>{graphFocus() ? "退出专注模式" : "专注"}
          </button>
        </div>
        <div class="stagebody" classList={{ gridbg: stage() === "topo" && grid() }}>
          <div class="view" id="view-topo" hidden={stage() !== "topo"}>
            <TopologyGraph selected={selectedHost} onSelect={setSelectedHost}
              onInteract={openInteract}
              onLaunch={(host) => {
                setSelectedHost(host);
                flash(`已选择主机 ${host}；右键单击模块树中的模块即可对其发起攻击`);
              }}
              onLogin={(host) => { setSelectedHost(host); setLoginHost(host); }} />
            <Show when={campaignState().hosts.length === 0}>
              <div class="map-empty">
                <div class="empty-symbol"><i aria-hidden="true" class="ph ph-graph"></i></div>
                <h2>尚未发现主机</h2>
                <p>发现主机，以绘制服务、会话与路由。</p>
                <button class="tbtn primary" disabled={conn().status !== "connected"} onClick={() => setScan("discovery")}>
                  <i aria-hidden="true" class="ph ph-plus"></i>发现主机
                </button>
              </div>
            </Show>
            <div class="legend">
              <span><i class="sw neutral"></i>已发现</span>
              <span><i class="sw dot"></i>活动会话</span>
              <span><i class="sw sq"></i>可登录</span>
              <span><i class="sw dash"></i>跳板路由</span>
            </div>
          </div>
          <div class="view" hidden={stage() !== "svc"}>
            <ServicesView onInspect={(addr) => setSelectedHost(addr)} selected={selectedHost()} />
          </div>
        </div>
      </main>

      <aside class="right card">
        <div class="panelhead"><i aria-hidden="true" class="ph ph-target"></i><span class="pt">主机详情</span><span class="panel-kicker">检查器</span></div>
        <Inspector addr={selectedHost} onInteract={openInteract} onLogin={setLoginHost} />
      </aside>

      <section class="nb card">
        <div class="nbtabs">
          <For each={notebookTabs}>{([id, icon, label]) => (
            <button class="nbtab" aria-pressed={tab() === id} classList={{ on: tab() === id }} onClick={() => setTab(id)}>
              <i aria-hidden="true" class={`ph ph-${icon}`}></i>{label}
              <Show when={id === "sessions" && liveCount() > 0}>
                <span class="badge">{liveCount()}</span>
              </Show>
              <Show when={id === "jobs" && jobCount() > 0}>
                <span class="badge jobs">{jobCount()}</span>
              </Show>
            </button>
          )}</For>
        </div>
        <div class="nbbody">
          <div class="nbpane" hidden={tab() !== "console"}>
            <ConsoleView output={consoleOutput} prompt={consolePrompt()} busy={consoleBusy()}
              write={(cmd) => void write(cmd).catch((e: any) => flash(e?.message ?? "控制台写入失败"))}
              tabComplete={(line) => consoleTabs(line).catch(() => [])} />
          </div>
          <div class="nbpane" hidden={tab() !== "interact"}><InteractView /></div>
          <div class="nbpane" hidden={tab() !== "sessions"}>
            <SessionsView onInteract={openInteract} />
          </div>
          <div class="nbpane" hidden={tab() !== "jobs"}>
            <JobsView onOpenModule={(module) => {
              setTab("console");
              void write(`use ${module}`)
                .catch((e: any) => flash(e?.message ?? "控制台写入失败"));
            }} />
          </div>
          <div class="nbpane" hidden={tab() !== "creds"}><CredsView /></div>
          <div class="nbpane" hidden={tab() !== "loot"}><LootView /></div>
          <div class="nbpane" hidden={tab() !== "events"}><EventsView /></div>
        </div>
      </section>

      <footer class="status card">
        <i aria-hidden="true" class={`ph ${conn().status === "connected" ? "ph-wifi-high wifi" : "ph-wifi-slash"}`}
           title="与框架的 RPC 连接"></i>
        <span>
          {conn().status === "connected"
            ? `msfrpcd 已连接 · metasploit ${conn().msfVersion}`
            : conn().status === "reconnecting"
              ? "正在重连…"
              : "已断开"}
        </span>
        <Show when={conn().host}>
          <span class="addr">{conn().host}:{conn().port}</span>
        </Show>
        <span class="spacer"></span>
        <span id="statusflash" role="status"></span>
        <span class="spacer"></span>
        <span class="ver">HAYDUK {serverVersion() || "…"}</span>
      </footer>

      <Show when={hailOpen()}>
        <HailMaryDialog host={selectedHost()} onClose={() => setHailOpen(false)} />
      </Show>

      <Show when={findOpen()}>
        <FindAttacksDialog host={selectedHost()}
          onLaunch={(path, host, port) => {
            setFindOpen(false);
            setSelectedHost(host);
            setLaunch({ type: "exploit", path, host, port });
          }}
          onClose={() => setFindOpen(false)} />
      </Show>

      <Show when={loginHost()}>
        {(h) => <LoginDialog host={h()} onClose={() => setLoginHost(undefined)} />}
      </Show>

      <Show when={scan()}>
        {(mode) => (
          <ScanDialog mode={mode()} target={selectedHost()}
            onConfigure={(module, target) => {
              setScan(null);
              setLaunch({ type: "auxiliary", path: module, host: target });
            }}
            onClose={() => setScan(null)} />
        )}
      </Show>

      <Show when={launch()}>
        {(l) => <LaunchDialog type={l().type} path={l().path} prefillHost={l().host} prefillPort={l().port}
          onClose={() => setLaunch(null)} />}
      </Show>

      <Show when={conn().status === "disconnected" || conn().status === "connecting"}>
        <ConnectDialog conn={conn()} onConnect={(p) => ws.command("connect", p)} />
      </Show>

      <Show when={showAbout()}>
        <Modal title="关于 hayduk" onClose={() => setShowAbout(false)}>
          <div style="margin-top:10px; display:flex; align-items:center; gap:14px">
            <HaydukMark size={44} tile />
            <div>
              <p style="margin:2px 0 0; font:400 12px/1.55 var(--sans); color:var(--tx1)">
                Metasploit 图形化攻击管理控制台。以单个 Go 二进制运行，界面在浏览器中。仅限授权安全测试使用。
              </p>
            </div>
          </div>
          <p style="margin:14px 0 0; font:400 11px var(--mono); color:var(--tx2)">
            Hayduk {serverVersion() || ""} · jolovicdev · MIT · Assisted by: GLM 5.3
          </p>
          <div class="mbtns">
            <button class="abtn" onClick={() => setShowAbout(false)}>关闭</button>
          </div>
        </Modal>
      </Show>

      <Show when={showKeys()}>
        <Modal title="键盘与鼠标" onClose={() => setShowKeys(false)}>
          <div class="klist">
            <div class="krow"><span class="keys"><kbd>1</kbd><kbd>2</kbd></span>在拓扑与服务之间切换</div>
            <div class="krow"><span class="keys"><kbd>F</kbd></span>使拓扑图适应视图</div>
            <div class="krow"><span class="keys"><kbd>Esc</kbd></span>关闭菜单与对话框</div>
            <div class="krow"><span class="keys"><kbd>右键</kbd></span>对主机、模块与表格行的右键操作</div>
            <div class="krow"><span class="keys"><kbd>拖动</kbd></span>拖动节点，或拖拽画布空白处平移</div>
            <div class="krow"><span class="keys"><kbd>滚轮</kbd></span>缩放拓扑图</div>
            <div class="krow"><span class="keys"><kbd>Tab</kbd></span>补全控制台命令</div>
          </div>
          <div class="mbtns">
            <button class="abtn" onClick={() => setShowKeys(false)}>关闭</button>
          </div>
        </Modal>
      </Show>

      <Show when={teamMode() && !operatorName()}>
        <Modal title="谁在操作？" onClose={() => setOperatorDraft("")}>
          <p style="margin-top:4px; font:400 12px/1.55 var(--sans); color:var(--tx2)">
            此 Hayduk 以团队服务器模式运行。你的名字会随每条命令一并记录，
            并显示在共享事件日志中对应操作的旁边。
          </p>
          <input style="margin-top:14px" value={operatorDraft()} placeholder="操作员名称"
            onInput={(e) => setOperatorDraft(e.currentTarget.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && operatorDraft().trim()) commitOperator(); }}
            autocomplete="off" spellcheck={false} />
          <div class="mbtns">
            <button class="abtn" style="flex:none; padding:0 20px"
              disabled={!operatorDraft().trim()} onClick={commitOperator}>加入</button>
          </div>
        </Modal>
      </Show>

      <Show when={wsStatus() === "closed" && !protoMismatch()}>
        <div class="modalback show">
          <div class="modal" style="width:340px; text-align:center">
            <div class="mtitle" style="text-align:center">与 Hayduk 的连接已断开</div>
            <p>正在自动重连…</p>
          </div>
        </div>
      </Show>

      <Show when={protoMismatch()}>
        <div class="modalback show">
          <div class="modal" style="width:360px; text-align:center">
            <div class="mtitle" style="text-align:center">Hayduk 服务端版本不兼容</div>
            <p>此界面使用协议 v1，但服务端返回了不同版本。请用同一份构建重启前后端。</p>
          </div>
        </div>
      </Show>

      <Splitter area="lsp" onDelta={resizeLeft} onEnd={savePanels} />
      <Splitter area="rsp" onDelta={resizeRight} onEnd={savePanels} />
      <Splitter area="nsp" onDelta={resizeNotebook} onEnd={savePanels} />

      <ContextMenuRoot />
      </div>

    </>
  );
}
