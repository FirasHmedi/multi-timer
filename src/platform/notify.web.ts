// Web preview only: no notifications.
export async function setupNotifications(): Promise<void> {}
export async function ensurePermission(): Promise<boolean> {
  return true;
}
export async function scheduleEnd(_id: string, _label: string, _endAt: number): Promise<void> {}
export async function cancelEnd(_id: string): Promise<void> {}
