/**
 * 数据备份和恢复工具
 */

import { ElMessage } from 'element-plus';
import { encrypt, decrypt, hash } from './crypto';

export interface BackupData {
  version: string;
  timestamp: number;
  data: {
    config?: any;
    models?: any;
    resume?: any;
    deliveryConfig?: any;
    statistics?: any;
    chat?: any;
  };
  encrypted: boolean;
  hash?: string;
}

const BACKUP_VERSION = '1.0.0';
const STORAGE_KEYS = [
  'offergod_config',
  'conf-model',
  'resume-data',
  'delivery-config',
  'statistics-data',
  'chat-history',
];

/**
 * 导出所有数据
 */
export async function exportAllData(password?: string): Promise<string> {
  try {
    // 从 storage 读取所有数据
    const storageData = await chrome.storage.local.get(STORAGE_KEYS);

    const backup: BackupData = {
      version: BACKUP_VERSION,
      timestamp: Date.now(),
      data: {
        config: storageData['offergod_config'],
        models: storageData['conf-model'],
        resume: storageData['resume-data'],
        deliveryConfig: storageData['delivery-config'],
        statistics: storageData['statistics-data'],
        chat: storageData['chat-history'],
      },
      encrypted: !!password,
    };

    let dataStr = JSON.stringify(backup.data, null, 2);

    // 如果提供密码，加密数据
    if (password) {
      dataStr = await encrypt(dataStr, password);
      backup.data = { encrypted: dataStr } as any;
    }

    // 计算哈希值
    backup.hash = await hash(JSON.stringify(backup.data));

    return JSON.stringify(backup, null, 2);
  } catch (error) {
    console.error('导出数据失败:', error);
    throw new Error('导出数据失败');
  }
}

/**
 * 导入数据
 */
export async function importAllData(
  backupStr: string,
  password?: string
): Promise<void> {
  try {
    const backup: BackupData = JSON.parse(backupStr);

    // 验证版本
    if (!backup.version || backup.version !== BACKUP_VERSION) {
      throw new Error('备份文件版本不兼容');
    }

    // 验证哈希
    if (backup.hash) {
      const dataHash = await hash(JSON.stringify(backup.data));
      if (dataHash !== backup.hash) {
        throw new Error('备份文件已损坏或被篡改');
      }
    }

    let data = backup.data;

    // 如果数据已加密，解密
    if (backup.encrypted) {
      if (!password) {
        throw new Error('此备份文件已加密，请提供密码');
      }
      const decryptedStr = await decrypt((data as any).encrypted, password);
      data = JSON.parse(decryptedStr);
    }

    // 恢复到 storage
    const storageData: Record<string, any> = {};
    if (data.config) storageData['offergod_config'] = data.config;
    if (data.models) storageData['conf-model'] = data.models;
    if (data.resume) storageData['resume-data'] = data.resume;
    if (data.deliveryConfig) storageData['delivery-config'] = data.deliveryConfig;
    if (data.statistics) storageData['statistics-data'] = data.statistics;
    if (data.chat) storageData['chat-history'] = data.chat;

    await chrome.storage.local.set(storageData);

    ElMessage.success('数据恢复成功，请刷新页面');
  } catch (error: any) {
    console.error('导入数据失败:', error);
    throw new Error(error.message || '导入数据失败');
  }
}

/**
 * 下载备份文件
 */
export function downloadBackup(data: string, encrypted: boolean = false): void {
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  link.download = `offergod_backup_${timestamp}${encrypted ? '_encrypted' : ''}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * 自动备份（定期备份到 storage）
 */
export async function autoBackup(): Promise<void> {
  try {
    const backupData = await exportAllData();
    const backups = await chrome.storage.local.get('auto_backups');
    const autoBackups = backups.auto_backups || [];

    // 添加新备份
    autoBackups.push({
      timestamp: Date.now(),
      data: backupData,
    });

    // 只保留最近 5 个备份
    if (autoBackups.length > 5) {
      autoBackups.shift();
    }

    await chrome.storage.local.set({ auto_backups: autoBackups });
    console.log('自动备份完成');
  } catch (error) {
    console.error('自动备份失败:', error);
  }
}

/**
 * 获取自动备份列表
 */
export async function getAutoBackups(): Promise<Array<{ timestamp: number; data: string }>> {
  const backups = await chrome.storage.local.get('auto_backups');
  return backups.auto_backups || [];
}

/**
 * 清除所有数据
 */
export async function clearAllData(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEYS);
  ElMessage.success('所有数据已清除');
}
