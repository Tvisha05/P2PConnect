"use client";

import { useState, useEffect, useCallback } from "react";
import {
  initCrypto,
  generateKeyPair,
} from "@/lib/crypto";
import {
  savePrivateKey,
  getPrivateKey,
  savePublicKey,
  getPublicKey,
  hasKeys,
} from "@/lib/keystore";

export function useE2EKeys() {
  const [ready, setReady] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const init = useCallback(async () => {
    try {
      await initCrypto();
      const serverRes = await fetch("/api/keys");
      const serverData = await serverRes.json();
      const serverPublicKey: string | null = serverData.publicKey ?? null;
      const localHasKeys = await hasKeys();
      const localPrivate = localHasKeys ? await getPrivateKey() : null;
      const localPublic = localHasKeys ? await getPublicKey() : null;

      // Trust a complete local keypair, and sync server pubkey to it if needed.
      if (localPrivate && localPublic) {
        if (serverPublicKey !== localPublic) {
          await fetch("/api/keys", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ publicKey: localPublic }),
          });
        }
        setPrivateKey(localPrivate);
        setPublicKey(localPublic);
        setReady(true);
        return;
      }

      const kp = generateKeyPair();

      await savePrivateKey(kp.privateKey);
      await savePublicKey(kp.publicKey);

      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKey: kp.publicKey }),
      });

      if (!res.ok) {
        throw new Error("Failed to register public key with server");
      }

      setPrivateKey(kp.privateKey);
      setPublicKey(kp.publicKey);
      setReady(true);
    } catch (err) {
      console.error("E2E key init error:", err);
      setError(err instanceof Error ? err.message : "Key setup failed");
    }
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  return { ready, publicKey, privateKey, error };
}
