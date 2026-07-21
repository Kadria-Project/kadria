export function isAppointmentQuickCreate(value: string | null) {
  return value === 'appointment'
}

// The shell command is intentionally consumed after one use. Keeping it in
// the URL would make the dialog controlled by a stale navigation command.
export function consumeAppointmentQuickCreateRoute() {
  return '/dashboard-v2/agenda'
}
