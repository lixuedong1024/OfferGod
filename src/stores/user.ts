import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { Logger } from '@/utils/logger';

export interface UserInfo {
  uid: string;
  name: string;
  avatar?: string;
  token?: string;
}

export const useUserStore = defineStore('user', () => {
  const userInfo = ref<UserInfo | null>(null);

  const isLoggedIn = computed(() => !!userInfo.value?.uid);

  // 加载用户信息
  async function loadUserInfo() {
    try {
      const data = await chrome.storage.local.get('userInfo');
      if (data.userInfo) {
        userInfo.value = data.userInfo;
        Logger.info('加载用户信息成功', { uid: userInfo.value.uid, name: userInfo.value.name });
      } else {
        Logger.warn('用户信息不存在');
      }
    } catch (error) {
      Logger.error('加载用户信息失败', { error: String(error) });
    }
  }

  // 保存用户信息
  async function saveUserInfo(info: UserInfo) {
    try {
      userInfo.value = info;
      await chrome.storage.local.set({ userInfo: info });
      Logger.info('保存用户信息成功', { uid: info.uid, name: info.name });
    } catch (error) {
      Logger.error('保存用户信息失败', { error: String(error) });
    }
  }

  // 清除用户信息
  async function clearUserInfo() {
    try {
      userInfo.value = null;
      await chrome.storage.local.remove('userInfo');
      Logger.info('清除用户信息成功');
    } catch (error) {
      Logger.error('清除用户信息失败', { error: String(error) });
    }
  }

  return {
    userInfo,
    isLoggedIn,
    loadUserInfo,
    saveUserInfo,
    clearUserInfo,
  };
});
