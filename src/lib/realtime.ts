import { getAdminDb } from "./firebase-admin";

export interface RtdbMessage {
  id: string;
  senderId: string;
  ciphertext: string;
  nonce: string;
  createdAt: string;
}

export async function pushGroupMessage(
  groupId: string,
  msg: RtdbMessage
) {
  const db = getAdminDb();
  await db.ref(`groups/${groupId}/messages/${msg.id}`).set({
    senderId: msg.senderId,
    ciphertext: msg.ciphertext,
    nonce: msg.nonce,
    createdAt: msg.createdAt,
  });
}

/** Server: poke signal so clients know to re-fetch pending proposals. */
export async function pushProposalSignal(userId: string, proposalId: string) {
  const db = getAdminDb();
  await db.ref(`users/${userId}/signals/proposal`).set({ proposalId, t: Date.now() });
}

/** Server: poke signal so clients know to re-fetch notifications. */
export async function pushNotificationSignal(userId: string) {
  const db = getAdminDb();
  await db.ref(`users/${userId}/signals/notification`).set({ t: Date.now() });
}
