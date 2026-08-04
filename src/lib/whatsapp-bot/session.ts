export type Session = {
  step: string;
  serviceId?: string;
  serviceName?: string;
  doctorId?: string;
  doctorName?: string;
  date?: string;
  time?: string;
  patientName?: string;
  patientPhone?: string;
};

const sessions = new Map<string, Session>();

export function getSession(contactId: string): Session | undefined {
  return sessions.get(contactId);
}

export function setSession(contactId: string, session: Session): void {
  sessions.set(contactId, session);
}

export function clearSession(contactId: string): void {
  sessions.delete(contactId);
}
