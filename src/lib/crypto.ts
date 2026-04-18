import _sodium from "libsodium-wrappers";

let sodium: typeof _sodium;

export async function initCrypto() {
  await _sodium.ready;
  sodium = _sodium;
}

export function generateKeyPair() {
  const kp = sodium.crypto_box_keypair();
  return {
    publicKey: sodium.to_base64(kp.publicKey),
    privateKey: sodium.to_base64(kp.privateKey),
  };
}

export function generateGroupKey(): string {
  return sodium.to_base64(sodium.crypto_secretbox_keygen());
}

export function sealGroupKey(
  groupKeyB64: string,
  recipientPubKeyB64: string
): string {
  return sodium.to_base64(
    sodium.crypto_box_seal(
      sodium.from_base64(groupKeyB64),
      sodium.from_base64(recipientPubKeyB64)
    )
  );
}

export function openGroupKey(
  sealedB64: string,
  pubKeyB64: string,
  privKeyB64: string
): string {
  return sodium.to_base64(
    sodium.crypto_box_seal_open(
      sodium.from_base64(sealedB64),
      sodium.from_base64(pubKeyB64),
      sodium.from_base64(privKeyB64)
    )
  );
}

export function encryptMessage(
  plaintext: string,
  groupKeyB64: string
): { ciphertext: string; nonce: string } {
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const ciphertext = sodium.crypto_secretbox_easy(
    sodium.from_string(plaintext),
    nonce,
    sodium.from_base64(groupKeyB64)
  );
  return {
    ciphertext: sodium.to_base64(ciphertext),
    nonce: sodium.to_base64(nonce),
  };
}

export function decryptMessage(
  ciphertextB64: string,
  nonceB64: string,
  groupKeyB64: string
): string {
  const plaintext = sodium.crypto_secretbox_open_easy(
    sodium.from_base64(ciphertextB64),
    sodium.from_base64(nonceB64),
    sodium.from_base64(groupKeyB64)
  );
  return sodium.to_string(plaintext);
}
