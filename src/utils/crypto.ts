/**
 * 加密工具类
 * 使用 Web Crypto API 进行 AES-GCM 加密
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // GCM 推荐 12 字节

/**
 * 生成随机密码
 */
export function generatePassword(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * 从密码派生加密密钥
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  // 导入密码作为密钥材料
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  // 使用 PBKDF2 派生密钥
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * 加密数据
 */
export async function encrypt(plaintext: string, password: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    // 生成随机盐和 IV
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // 派生密钥
    const key = await deriveKey(password, salt);

    // 加密
    const encrypted = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      data
    );

    // 组合: salt(16) + iv(12) + encrypted
    const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    result.set(salt, 0);
    result.set(iv, salt.length);
    result.set(new Uint8Array(encrypted), salt.length + iv.length);

    // 转换为 Base64
    return btoa(String.fromCharCode(...result));
  } catch (error) {
    console.error('加密失败:', error);
    throw new Error('数据加密失败');
  }
}

/**
 * 解密数据
 */
export async function decrypt(ciphertext: string, password: string): Promise<string> {
  try {
    // 从 Base64 解码
    const data = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));

    // 提取 salt、iv 和加密数据
    const salt = data.slice(0, 16);
    const iv = data.slice(16, 16 + IV_LENGTH);
    const encrypted = data.slice(16 + IV_LENGTH);

    // 派生密钥
    const key = await deriveKey(password, salt);

    // 解密
    const decrypted = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      encrypted
    );

    // 转换为字符串
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('解密失败:', error);
    throw new Error('数据解密失败，请检查密码是否正确');
  }
}

/**
 * 哈希数据（用于验证）
 */
export async function hash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 验证数据完整性
 */
export async function verify(data: string, expectedHash: string): Promise<boolean> {
  const actualHash = await hash(data);
  return actualHash === expectedHash;
}
