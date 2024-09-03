import Dexie, { Table } from 'dexie';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = 'your-secret-key'; // Store this securely, never expose it

interface EncryptedTodo {
  id?: number;
  encryptedData: string;
}

interface DecryptedTodo {
  id?: number;
  text: string;
  completed: boolean;
}

interface EncryptedAccount {
  id?: number;
  encryptedData: string;
}

interface DecryptedAccount {
  id?: number;
  email: string;
  username: string;
  // Add other account fields as needed
}

class AppDatabase extends Dexie {
  todos!: Table<EncryptedTodo>;
  accounts!: Table<EncryptedAccount>;

  constructor() {
    super('AppDatabase');
    this.version(1).stores({
      todos: '++id, encryptedData',
      accounts: '++id, encryptedData',
    });
  }

  // Todo methods
  async addTodo(todo: DecryptedTodo): Promise<number> {
    const encryptedData = CryptoJS.AES.encrypt(
      JSON.stringify(todo),
      ENCRYPTION_KEY
    ).toString();
    return await this.todos.add({ encryptedData });
  }

  async getTodos(): Promise<DecryptedTodo[]> {
    const encryptedTodos = await this.todos.toArray();
    return encryptedTodos.map((et) => {
      const decryptedBytes = CryptoJS.AES.decrypt(
        et.encryptedData,
        ENCRYPTION_KEY
      );
      const decryptedData = JSON.parse(
        decryptedBytes.toString(CryptoJS.enc.Utf8)
      );
      return { ...decryptedData, id: et.id };
    });
  }

  // Account methods
  async setAccount(account: DecryptedAccount): Promise<number> {
    const encryptedData = CryptoJS.AES.encrypt(
      JSON.stringify(account),
      ENCRYPTION_KEY
    ).toString();
    // Assuming one account per app instance, we'll always use id 1
    await this.accounts.put({ id: 1, encryptedData });
    return 1;
  }

  async getAccount(): Promise<DecryptedAccount | null> {
    const encryptedAccount = await this.accounts.get(1);
    if (!encryptedAccount) return null;
    const decryptedBytes = CryptoJS.AES.decrypt(
      encryptedAccount.encryptedData,
      ENCRYPTION_KEY
    );
    const decryptedData = JSON.parse(
      decryptedBytes.toString(CryptoJS.enc.Utf8)
    );
    return { ...decryptedData, id: encryptedAccount.id };
  }
}

export const db = new AppDatabase();
