import { saveSeen } from "./storage";

export const alertsSupported = () => typeof Notification !== "undefined";

/** Ask for permission once; true when milestone alerts can fire. */
export async function enableAlerts(): Promise<boolean> {
  if (!alertsSupported()) return false;
  const perm = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
  if (perm !== "granted") return false;
  saveSeen(Date.now());
  return true;
}

export async function notify(title: string, body: string) {
  if (!alertsSupported() || Notification.permission !== "granted") return;
  const reg = await navigator.serviceWorker?.getRegistration();
  if (reg) await reg.showNotification(title, { body, icon: "icon.svg", tag: title });
  else new Notification(title, { body });
}
