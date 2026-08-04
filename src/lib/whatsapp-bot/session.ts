type Session = {
  step: string;
  serviceId?: string;
  serviceName?: string;
  doctorId?: string;
  doctorName?: string;
  date?: string;
  time?: string;
};

const sessions = new Map<string, Session>();

export function getSession(contactId: string): Session | undefined {
  return sessions.get(contactId);
}

export function setSession(contactId: string, session: Session) {
  sessions.set(contactId, session);
}

export function clearSession(contactId: string) {
  sessions.delete(contactId);
}
