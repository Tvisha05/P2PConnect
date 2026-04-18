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
