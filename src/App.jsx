import './index.css';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import Home from './home';
import { db } from '../db';

// Encryption helper functions
const generateKey = async () => {
  return await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
};

const encryptData = async (data, key) => {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedData = new TextEncoder().encode(JSON.stringify(data));
  const encryptedData = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encodedData
  );
  return { encryptedData, iv };
};

const decryptData = async (encryptedData, iv, key) => {
  const decryptedData = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encryptedData
  );
  return JSON.parse(new TextDecoder().decode(decryptedData));
};

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function App() {
  const [session, setSession] = useState(null);
  const [dbInitialized, setDbInitialized] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState(null);

  useEffect(() => {
    // Initialize Dexie database and generate encryption key
    Promise.all([db.open(), generateKey()])
      .then(([, key]) => {
        console.log('Dexie database initialized and encryption key generated');
        setDbInitialized(true);
        setEncryptionKey(key);
      })
      .catch((error) => {
        console.error(
          'Error initializing Dexie database or generating key:',
          error
        );
      });

    const handleSessionChange = async (session) => {
      setSession(session);
      if (session && encryptionKey) {
        const { user } = session;
        const accountData = {
          id: user.id,
          email: user.email,
          lastSignIn: new Date().toISOString(),
          // Add any other relevant user information
        };

        try {
          const { encryptedData, iv } = await encryptData(
            accountData,
            encryptionKey
          );
          await db.accounts.put({
            id: user.id,
            encryptedData: Array.from(new Uint8Array(encryptedData)),
            iv: Array.from(iv),
          });
          console.log('Encrypted account information stored in Dexie');
        } catch (error) {
          console.error(
            'Error storing encrypted account information in Dexie:',
            error
          );
        }
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSessionChange(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSessionChange(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!session) {
    return <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} />;
  } else if (!dbInitialized) {
    return <div>Loading...</div>;
  } else {
    return (
      <div>
        <Home session={session} />
      </div>
    );
  }
}
