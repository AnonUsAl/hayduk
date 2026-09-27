import { DataTable } from "../components/DataTable";
import { openContextMenuFor } from "../components/contextmenu";
import { copyWithFeedback } from "../clipboard";
import { campaignState } from "../stores/store";
import { createNowSignal } from "../stores/now";
import { ageOf } from "./format";
import { jobRows } from "./jobs";

export function JobsView(props: { onOpenModule?: (module: string) => void }) {
  // job ages must tick even while the jobs map itself is quiet
  const now = createNowSignal(10_000);
  const rows = () => jobRows(campaignState().jobs);

  return (
    <DataTable
      rows={rows()}
      rowKey={(r) => r.id}
      emptyTitle="暂无任务"
      emptyIcon="gear"
      empty="没有正在运行的任务。msf 一启动漏洞监听或长时间运行的模块，就会立即显示在这里。"
      onRowContextMenu={(r, e) => {
        openContextMenuFor(e, [
          { head: `任务 ${r.id}`, sub: r.module },
          { icon: "copy", label: "复制模块路径", fn: () => copyWithFeedback(r.module) },
          { sep: true },
          { icon: "terminal-window", label: "在控制台中打开模块", hint: "use",
            fn: () => props.onOpenModule?.(r.module) },
        ]);
      }}
      columns={[
        { key: "id", label: "ID", mono: true, width: "56px" },
        { key: "kind", label: "KIND", width: "90px", render: (r) => <span class="dim">{r.kind || "-"}</span> },
        { key: "module", label: "MODULE", mono: true },
        { key: "startedAt", label: "RUNNING", mono: true, width: "90px", render: (r) => ageOf(r.startedAt, now()) },
      ]}
    />
  );
}
