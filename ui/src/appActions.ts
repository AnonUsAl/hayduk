// switchWorkspaceAction builds the workspace.set flow. The old workspace's
// hosts do not exist in the new one, so a successful switch must drop the
// host selection before anything can target a stale host.
export function switchWorkspaceAction(opts: {
  command: (method: string, params?: unknown) => Promise<unknown>;
  onSwitched: () => void;
  flash: (msg: string) => void;
}): (name: string) => Promise<void> {
  return async (name: string) => {
    try {
      await opts.command("workspace.set", { name });
      opts.onSwitched();
      opts.flash(`已切换到工作区 ${name}`);
    } catch (e: any) {
      opts.flash(e?.message ?? "工作区切换失败");
    }
  };
}
