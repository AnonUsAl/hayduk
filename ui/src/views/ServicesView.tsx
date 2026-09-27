import { DataTable } from "../components/DataTable";
import { campaignState } from "../stores/store";
import { openContextMenuFor } from "../components/contextmenu";
import { copyWithFeedback } from "../clipboard";
import type { ServiceState } from "../protocol/types";

export function ServicesView(props: { onInspect: (addr: string) => void; selected?: string }) {
  const rows = () => campaignState().services.filter((s): s is ServiceState => !!s);

  return (
    <div class="svcwrap">
      <DataTable
        rows={rows()}
        rowKey={(r) => r.host}
        selectedKey={() => props.selected}
        emptyTitle="暂无服务"
        emptyIcon="stack"
        empty="尚未发现服务；请执行服务扫描，或在检查器中打开主机。"
        onRowClick={(r) => props.onInspect(r.host)}
        onRowContextMenu={(r, e) => {
          openContextMenuFor(e, [
            { head: `${r.host}:${r.port}`, sub: `${r.proto} ${r.name}` },
            { icon: "info", label: "查看主机", fn: () => props.onInspect(r.host) },
            { icon: "copy", label: "复制地址", hint: r.host, fn: () => copyWithFeedback(r.host) },
          ]);
        }}
        columns={[
          { key: "host", label: "HOST", render: (r) => <b>{r.host}</b> },
          { key: "port", label: "PORT", mono: true },
          { key: "proto", label: "PROTO", mono: true },
          { key: "name", label: "SERVICE" },
          { key: "state", label: "STATE", render: (r) => <span class="st">{r.state}</span> },
          { key: "info", label: "INFO", render: (r) => <span class="dim">{r.info}</span> },
        ]}
      />
    </div>
  );
}
