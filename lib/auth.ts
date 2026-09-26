import { StaffUser } from './types'

export type StaffAccount = StaffUser & {
  pin: string
}

export const STAFF_USERS: StaffAccount[] = [
  {
    id: 'viewer-01',
    name: 'Taylor Reed',
    role: 'viewer',
    pin: '1234',
  },
  {
    id: 'manager-north',
    name: 'Alex Rivera',
    role: 'manager',
    assignedWarehouseId: 'wh-north',
    pin: '1234',
  },
  {
    id: 'manager-south',
    name: 'Sam Chen',
    role: 'manager',
    assignedWarehouseId: 'wh-south',
    pin: '1234',
  },
  {
    id: 'admin-01',
    name: 'Morgan Vance',
    role: 'admin',
    pin: '1234',
  },
  {
    id: 'staff-01',
    name: 'Jordan Ruiz',
    role: 'staff',
    pin: '1234',
  },
]

// Stubbed auth helper. Every request defaults to this staff user when not authenticated.
export function getCurrentUser(): StaffUser {
  return { id: 'staff-01', name: 'Jordan Ruiz', role: 'staff' }
}

export function validateCredentials(
  staffId: string,
  pin: string,
): StaffUser | null {
  if (!staffId || !pin) return null
  const normalizedId = staffId.trim().toLowerCase()
  const normalizedPin = pin.trim()

  const user = STAFF_USERS.find(
    (u) => u.id.toLowerCase() === normalizedId && u.pin === normalizedPin,
  )

  if (!user) return null

  return {
    id: user.id,
    name: user.name,
    role: user.role,
    assignedWarehouseId: user.assignedWarehouseId,
  }
}