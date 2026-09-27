import { For, Show } from "solid-js";
import { eventGap, events } from "../stores/events";

export function EventsView() {
  return (
    <div class="events">
      <Show when={eventGap()}>
        <div class="evline">
          <time></time>
          <p style="color:var(--red-br)">检测到事件间隙：重连前事件可能不完整</p>
        </div>
      </Show>
      <For each={events().slice().reverse()}>{(ev) => (
        <div class="evline">
          <time>{ev.time ? new Date(ev.time).toLocaleTimeString() : ""}</time>
          <p style={
            ev.level === "success" ? "color:var(--grn-tx)"
            : ev.level === "error" ? "color:var(--red-br)"
            : ev.level === "warn" ? "color:var(--amb)"
            : undefined
          }>
            {ev.text}
            <Show when={ev.operator}><span class="opchip" title={`操作员 ${ev.operator}`}>{ev.operator}</span></Show>
          </p>
        </div>
      )}</For>
    </div>
  );
}
