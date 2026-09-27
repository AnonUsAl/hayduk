import { DataTable } from "../components/DataTable";
import { openContextMenuFor } from "../components/contextmenu";
import { copyWithFeedback } from "../clipboard";
import { campaignState } from "../stores/store";
import type { CredState } from "../protocol/types";

export function CredsView() {
  const rows = () => campaignState().creds.filter((c): c is CredState => !!c);

  return (
    <DataTable
      rows={rows()}
      rowKey={(r) => `${r.host}:${r.port}:${r.user}:${r.pass}`}
      emptyTitle="暂无凭据"
      emptyIcon="key"
      empty="已获取的密码与哈希会显示在这里。"
      onRowContextMenu={(r, e) => {
        openContextMenuFor(e, [
          { head: r.user || "（无用户）", sub: `在 ${r.host} 上恢复的凭据` },
          { sep: true },
          { icon: "copy", label: "复制值", fn: () => copyWithFeedback(r.pass) },
          { icon: "copy", label: "复制用户名", fn: () => copyWithFeedback(r.user) },
        ]);
      }}
      columns={[
        { key: "host", label: "HOST", mono: true },
        { key: "user", label: "USER", render: (r) => <b>{r.user}</b> },
        { key: "type", label: "TYPE", mono: true, render: (r) => <span class="dim">{r.type || "password"}</span> },
        { key: "pass", label: "VALUE", mono: true },
        { key: "service", label: "SERVICE", render: (r) => <span class="dim">{r.service || ""}</span> },
      ]}
    />
  );
}
