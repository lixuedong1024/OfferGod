/**
 * 安全存储工具
 * 用于加密存储敏感数据（如 API Key）
 */

import { encrypt, decrypt, generatePassword } from './crypto';

const ENCRYPTION_KEY_STORAGE = 'encryption_master_key';
const ENCRYPTED_FIELDS_PREFIX = '__encrypted__';

/**
 * 获取或生成主加密密钥
 */
async function getMasterKey(): Promise<string> {
  const stored = await chrome.storage.local.get(ENCRYPTION_KEY_STORAGE);

  if (stored[ENCRYPTION_KEY_STORAGE]) {
    return stored[ENCRYPTION_KEY_STORAGE];
  }

  // 生成新的主密钥
  const masterKey = generatePassword(32);
  await chrome.storage.local.set({ [ENCRYPTION_KEY_STORAGE]: masterKey });
  return masterKey;
}

/**
 * 加密对象中的敏感字段
 */
export async function encryptSensitiveFields<T extends Record<string, any>>(
  data: T,
  sensitiveFields: string[]
): Promise<T> {
  const masterKey = await getMasterKey();
  const result = { ...data };

  for (const field of sensitiveFields) {
    if (result[field] && typeof result[field] === 'string') {
      try {
        const encrypted = await encrypt(result[field], masterKey);
        result[field] = `${ENCRYPTED_FIELDS_PREFIX}${encrypted}` as any;
      } catch (error) {
        console.error(`加密字段 ${field} 失败:`, error);
      }
    }
  }

  return result;
}

/**
 * 解密对象中的敏感字段
 */
export async function decryptSensitiveFields<T extends Record<string, any>>(
  data: T,
  sensitiveFields: string[]
): Promise<T> {
  const masterKey = await getMasterKey();
  const result = { ...data };

  for (const field of sensitiveFields) {
    if (result[field] && typeof result[field] === 'string') {
      const value = result[field] as string;

      // 检查是否是加密数据
      if (value.startsWith(ENCRYPTED_FIELDS_PREFIX)) {
        try {
          const encryptedData = value.slice(ENCRYPTED_FIELDS_PREFIX.length);
          result[field] = await decrypt(encryptedData, masterKey) as any;
        } catch (error) {
          console.error(`解密字段 ${field} 失败:`, error);
          // 保持原值，可能是旧数据
        }
      }
    }
  }

  return result;
}

/**
 * 检查字段是否已加密
 */
export function isEncrypted(value: string): boolean {
  return typeof value === 'string' && value.startsWith(ENCRYPTED_FIELDS_PREFIX);
}

/**
 * 安全存储配置
 */
export async function secureSet<T extends Record<string, any>>(
  key: string,
  data: T,
  sensitiveFields: string[]
): Promise<void> {
  const encrypted = await encryptSensitiveFields(data, sensitiveFields);
  await chrome.storage.local.set({ [key]: encrypted });
}

/**
 * 安全读取配置
 */
export async function secureGet<T extends Record<string, any>>(
  key: string,
  sensitiveFields: string[]
): Promise<T | null> {
  const stored = await chrome.storage.local.get(key);

  if (!stored[key]) {
    return null;
  }

  return await decryptSensitiveFields(stored[key], sensitiveFields);
}

/**
 * 迁移旧数据到加密存储
 */
export async function migrateToEncrypted<T extends Record<string, any>>(
  key: string,
  sensitiveFields: string[]
): Promise<void> {
  const stored = await chrome.storage.local.get(key);

  if (!stored[key]) {
    return;
  }

  const data = stored[key];
  let needsMigration = false;

  // 检查是否有未加密的敏感字段
  for (const field of sensitiveFields) {
    if (data[field] && typeof data[field] === 'string' && !isEncrypted(data[field])) {
      needsMigration = true;
      break;
    }
  }

  if (needsMigration) {
    console.log(`迁移 ${key} 到加密存储...`);
    await secureSet(key, data, sensitiveFields);
  }
}
