import { defineStore } from 'pinia';
import { ref } from 'vue';
import { Logger } from '@/utils/logger';

export interface ResumeProfile {
  // 基本信息
  name?: string;
  email?: string;
  phone?: string;
  location?: string;

  // 工作经验
  experience: string; // 如 "5年"
  currentPosition?: string;
  currentCompany?: string;

  // 教育背景
  education: string; // 如 "本科"
  major?: string;
  school?: string;

  // 技能
  skills: string[];

  // 项目经验
  projects: string[];

  // 个人优势
  strengths: string[];

  // 期望
  expectedSalary?: string;
  expectedLocation?: string;
  expectedPosition?: string;

  // 元数据
  updatedAt?: number;
}

const STORAGE_KEY = 'resume_profile';

export const useResumeStore = defineStore('resume', () => {
  const profile = ref<ResumeProfile>({
    experience: '3-5年',
    education: '本科',
    skills: [],
    projects: [],
    strengths: [],
  });

  const loading = ref(false);

  /**
   * 加载简历信息
   */
  async function loadProfile() {
    loading.value = true;
    try {
      const data = await chrome.storage.local.get(STORAGE_KEY);
      if (data[STORAGE_KEY]) {
        profile.value = data[STORAGE_KEY];
        Logger.info('加载简历信息成功');
      } else {
        Logger.info('未找到简历信息，使用默认值');
      }
    } catch (error) {
      Logger.error('加载简历信息失败', { error: String(error) });
    } finally {
      loading.value = false;
    }
  }

  /**
   * 保存简历信息
   */
  async function saveProfile() {
    try {
      profile.value.updatedAt = Date.now();
      await chrome.storage.local.set({
        [STORAGE_KEY]: profile.value,
      });
      Logger.info('保存简历信息成功');
    } catch (error) {
      Logger.error('保存简历信息失败', { error: String(error) });
      throw error;
    }
  }

  /**
   * 更新简历信息
   */
  async function updateProfile(updates: Partial<ResumeProfile>) {
    profile.value = {
      ...profile.value,
      ...updates,
    };
    await saveProfile();
  }

  /**
   * 添加技能
   */
  async function addSkill(skill: string) {
    if (!profile.value.skills.includes(skill)) {
      profile.value.skills.push(skill);
      await saveProfile();
    }
  }

  /**
   * 删除技能
   */
  async function removeSkill(skill: string) {
    const index = profile.value.skills.indexOf(skill);
    if (index > -1) {
      profile.value.skills.splice(index, 1);
      await saveProfile();
    }
  }

  /**
   * 添加项目经验
   */
  async function addProject(project: string) {
    if (!profile.value.projects.includes(project)) {
      profile.value.projects.push(project);
      await saveProfile();
    }
  }

  /**
   * 删除项目经验
   */
  async function removeProject(project: string) {
    const index = profile.value.projects.indexOf(project);
    if (index > -1) {
      profile.value.projects.splice(index, 1);
      await saveProfile();
    }
  }

  /**
   * 添加个人优势
   */
  async function addStrength(strength: string) {
    if (!profile.value.strengths.includes(strength)) {
      profile.value.strengths.push(strength);
      await saveProfile();
    }
  }

  /**
   * 删除个人优势
   */
  async function removeStrength(strength: string) {
    const index = profile.value.strengths.indexOf(strength);
    if (index > -1) {
      profile.value.strengths.splice(index, 1);
      await saveProfile();
    }
  }

  /**
   * 清空简历信息
   */
  async function clearProfile() {
    profile.value = {
      experience: '3-5年',
      education: '本科',
      skills: [],
      projects: [],
      strengths: [],
    };
    await chrome.storage.local.remove(STORAGE_KEY);
    Logger.info('清空简历信息');
  }

  /**
   * 检查简历是否完整
   */
  function isProfileComplete(): boolean {
    return (
      profile.value.skills.length > 0 &&
      profile.value.experience !== '' &&
      profile.value.education !== ''
    );
  }

  /**
   * 获取简历完整度百分比
   */
  function getProfileCompleteness(): number {
    let score = 0;
    const weights = {
      skills: 30,
      experience: 20,
      education: 15,
      projects: 20,
      strengths: 15,
    };

    if (profile.value.skills.length > 0) score += weights.skills;
    if (profile.value.experience) score += weights.experience;
    if (profile.value.education) score += weights.education;
    if (profile.value.projects.length > 0) score += weights.projects;
    if (profile.value.strengths.length > 0) score += weights.strengths;

    return score;
  }

  return {
    profile,
    loading,
    loadProfile,
    saveProfile,
    updateProfile,
    addSkill,
    removeSkill,
    addProject,
    removeProject,
    addStrength,
    removeStrength,
    clearProfile,
    isProfileComplete,
    getProfileCompleteness,
  };
});
