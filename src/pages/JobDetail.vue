<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useModel } from '@/composables/useModel';
import { useChatStore } from '@/stores/chat';
import { useResumeStore } from '@/stores/resume';
import { useWebSocket } from '@/composables/useWebSocket';
import { Logger } from '@/utils/logger';
import { ElMessage } from 'element-plus';
import type { JobData as JobDataType } from '@/types/job';
import { parseJobDescription } from '@/utils/jdParser';
import { matchJobWithResume, loadResumeData } from '@/utils/jobMatcher';

interface Props {
  jobId: string;
  onBack: () => void;
}

const props = defineProps<Props>();
const modelStore = useModel();
const chatStore = useChatStore();
const resumeStore = useResumeStore();
const wsClient = useWebSocket();

interface JobDetail {
  id: string;
  title: string;
  company: string;
  companyLogo: string;
  salary: string;
  location: string;
  experience: string;
  education: string;
  description: string;
  tags: string[];
  skills: string[];
  welfare: string[];
  hr: {
    name: string;
    title: string;
    avatar: string;
    active: string;
    responseRate: string;
    avgResponseTime: string;
    totalChats: number;
    recentPosts: number;
  };
  companyInfo: {
    industry: string;
    size: string;
    tag: string;
  };
  score: number;
  matched: string[];
  missing: string[];
  aiSuggestion: string;
}

const job = ref<JobDetail | null>(null);
const greeting = ref('');
const tone = ref<'professional' | 'friendly' | 'concise'>('professional');
const generating = ref(false);
const loading = ref(true);
const calculating = ref(false); // 匹配计算状态
const sending = ref(false);

// 投递岗位
const applyJob = async () => {
  if (!job.value || !greeting.value.trim()) {
    ElMessage.warning('请先生成打招呼语');
    return;
  }

  if (hasRiskWords.value) {
    ElMessage.warning('打招呼语包含风险词汇，请修改后再投递');
    return;
  }

  sending.value = true;

  try {
    // 获取用户信息
    const data = await chrome.storage.local.get(['userInfo', 'jobs']);
    const userInfo = data.userInfo;
    const jobs = data.jobs || [];
    const jobData = jobs.find((j: any) => j.encryptJobId === props.jobId);

    if (!userInfo || !userInfo.uid) {
      ElMessage.error('用户信息不存在，请刷新页面');
      return;
    }

    if (!jobData || !jobData.bossId || !jobData.encryptBossId) {
      ElMessage.error('岗位信息不完整，无法投递');
      return;
    }

    // 创建聊天会话
    const session = chatStore.getOrCreateSession({
      jobId: jobData.encryptJobId,
      bossUid: jobData.bossId,
      bossEncryptUid: jobData.encryptBossId,
      bossName: jobData.bossName || 'HR',
      bossAvatar: jobData.bossAvatar || '',
      companyName: jobData.brandName,
      jobTitle: jobData.jobName,
    });

    Logger.info('创建聊天会话', { sessionId: session.id });

    // 添加消息到本地
    await chatStore.sendMessage(session.id, greeting.value);

    // 通过 WebSocket 发送消息
    if (wsClient.isConnected.value) {
      const success = wsClient.sendMessage({
        fromUid: userInfo.uid,
        toUid: jobData.bossId,
        toName: jobData.encryptBossId,
        content: greeting.value,
      });

      if (success) {
        ElMessage.success('投递成功！打招呼语已发送');
        Logger.info('投递成功', { jobId: props.jobId, greeting: greeting.value });
      } else {
        ElMessage.warning('投递成功，但消息发送失败（WebSocket 未连接）');
        Logger.warn('WebSocket 发送失败');
      }
    } else {
      ElMessage.warning('投递成功，但消息仅保存在本地（WebSocket 未连接）');
      Logger.warn('WebSocket 未连接');
    }

    // 更新岗位状态为已投递
    const updatedJobs = jobs.map((j: any) => {
      if (j.encryptJobId === props.jobId) {
        return { ...j, status: 'sent', appliedAt: Date.now() };
      }
      return j;
    });
    await chrome.storage.local.set({ jobs: updatedJobs });

  } catch (error) {
    Logger.error('投递失败', { error: String(error) });
    ElMessage.error('投递失败，请重试');
  } finally {
    sending.value = false;
  }
};

// 加载岗位详情
const loadJobDetail = async () => {
  try {
    loading.value = true;
    const data = await chrome.storage.local.get('jobs');
    const jobs = data.jobs || [];
    const jobData = jobs.find((j: any) => j.encryptJobId === props.jobId);

    if (jobData) {
      // 如果没有岗位描述，尝试从当前页面获取
      if (!jobData.postDescription || jobData.postDescription.trim() === '') {
        Logger.info('岗位描述为空，尝试从页面获取');

        // 发送消息到 main-world 获取岗位描述
        window.postMessage({
          type: 'OFFERGOD_GET_JOB_DETAIL',
          jobId: props.jobId
        }, '*');

        // 等待一段时间后重新加载
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 重新读取数据
        const updatedData = await chrome.storage.local.get('jobs');
        const updatedJobs = updatedData.jobs || [];
        const updatedJobData = updatedJobs.find((j: any) => j.encryptJobId === props.jobId);

        if (updatedJobData && updatedJobData.postDescription) {
          Object.assign(jobData, updatedJobData);
          Logger.info('成功获取岗位描述', { length: updatedJobData.postDescription?.length || 0 });
        } else {
          Logger.warn('未能获取岗位描述');
        }
      }

      // 默认值
      let score = 75;
      let matched: string[] = [];
      let missing: string[] = [];
      let aiSuggestion = '正在分析匹配度...';

      // 计算真实匹配度
      const resume = await loadResumeData();
      if (resume && jobData.postDescription) {
        try {
          const jobDataTyped = jobData as JobDataType;

          // 检查是否有缓存的匹配结果
          if (jobDataTyped.matchResult && jobDataTyped.matchResult.calculatedAt > Date.now() - 24 * 60 * 60 * 1000) {
            // 使用缓存（24小时内有效）
            const matchResult = jobDataTyped.matchResult;
            score = matchResult.totalScore;
            matched = matchResult.matchedItems;
            missing = matchResult.missingItems;
            aiSuggestion = matchResult.aiSuggestion;
          } else {
            // 显示计算状态
            calculating.value = true;

            // 重新计算
            const requirement = await parseJobDescription(
              jobData.encryptJobId,
              jobData.jobName,
              jobData.postDescription,
              jobData.experienceName,
              jobData.degreeName || '不限',
              jobData.jobLabels || []
            );

            const matchResult = await matchJobWithResume(
              jobData.encryptJobId,
              jobData.jobName,
              requirement,
              resume
            );

            score = matchResult.totalScore;
            matched = matchResult.matchedItems;
            missing = matchResult.missingItems;
            aiSuggestion = matchResult.aiSuggestion;

            // 缓存结果
            jobDataTyped.matchResult = matchResult;
            jobDataTyped.requirement = requirement;

            // 保存到 storage
            const updatedJobs = jobs.map((j: any) =>
              j.encryptJobId === props.jobId ? jobDataTyped : j
            );
            await chrome.storage.local.set({ jobs: updatedJobs });

            // 隐藏计算状态
            calculating.value = false;
          }
        } catch (error) {
          calculating.value = false;
          Logger.warn('计算匹配度失败，使用默认值', { error: String(error) });
          matched = ['工作经验符合要求'];
          missing = ['建议补充相关项目经验'];
          aiSuggestion = '匹配度分析失败，建议查看岗位详情后决定是否投递。';
        }
      } else if (!resume) {
        matched = ['请先完善简历信息'];
        missing = ['需要填写工作经验、技能等信息'];
        aiSuggestion = '请先在设置中完善简历信息，以便进行精准匹配分析。';
      } else if (!jobData.postDescription) {
        matched = ['岗位信息不完整'];
        missing = ['缺少岗位描述'];
        aiSuggestion = '该岗位缺少详细描述，建议直接查看原页面或联系HR了解详情。';
      }

      job.value = {
        id: jobData.encryptJobId,
        title: jobData.jobName,
        company: jobData.brandName,
        companyLogo: jobData.brandLogo,
        salary: jobData.salaryDesc,
        location: jobData.cityName,
        experience: jobData.experienceName,
        education: jobData.degreeName || '不限',
        description: jobData.postDescription || '暂无描述',
        tags: jobData.jobLabels || [],
        skills: jobData.skills || [],
        welfare: jobData.welfareList || [],
        hr: {
          name: jobData.bossName || 'HR',
          title: jobData.bossTitle || '招聘者',
          avatar: jobData.bossAvatar || '',
          active: jobData.activeTimeDesc || '本周活跃',
          responseRate: '预估 70%+',
          avgResponseTime: '预估 1-2小时',
          totalChats: 0,
          recentPosts: 0,
        },
        companyInfo: {
          industry: jobData.brandIndustry || '互联网',
          size: jobData.brandScaleName || '100-500人',
          tag: jobData.financingDesc || '未融资',
        },
        score,
        matched,
        missing,
        aiSuggestion,
      };

      generateGreeting();
    }
  } catch (error) {
    console.error('加载岗位详情失败:', error);
  } finally {
    loading.value = false;
  }
};

// 生成打招呼语
const generateGreeting = () => {
  if (!job.value) return;

  const hrName = job.value.hr.name.split(' ')[0];
  const resume = resumeStore.resume;

  // 获取匹配的技能和经验
  const matchedSkills = job.value.matched
    .filter(m => m.includes('技能') || m.includes('熟悉') || m.includes('掌握'))
    .slice(0, 2);

  const matchedExp = job.value.matched
    .filter(m => m.includes('经验') || m.includes('年'))
    .slice(0, 1);

  // 获取简历中的关键信息
  const yearsOfExp = resume?.experience?.[0]?.duration || '多年';
  const topSkills = resume?.skills?.slice(0, 3).map(s => s.name).join('、') || job.value.skills.slice(0, 2).join('、');
  const recentProject = resume?.experience?.[0]?.projects?.[0]?.name || '';

  // 根据匹配度调整语气
  const matchScore = job.value.score;
  const isHighMatch = matchScore >= 85;

  const templates = {
    professional: isHighMatch
      ? `你好 ${hrName}，看到贵司在招聘${job.value.title}，我有${yearsOfExp}相关经验，${matchedSkills[0] || `在${topSkills}方面有完整项目落地经验`}。${matchedExp[0] || '工作经历与岗位要求高度匹配'}，方便聊一下吗？`
      : `你好 ${hrName}，看到贵司在招聘${job.value.title}，我有${yearsOfExp}相关经验，特别是在${topSkills}方面有实践经验${recentProject ? `，曾负责${recentProject}` : ''}。对这个岗位很感兴趣，方便了解一下吗？`,

    friendly: isHighMatch
      ? `${hrName} 你好！看到这个${job.value.title}的岗位很感兴趣～我有${yearsOfExp}相关经验，${matchedSkills[0] || `${topSkills}用得比较顺手`}。匹配度${matchScore}分，想了解下贵司这边的具体业务场景，有空聊聊吗？`
      : `${hrName} 你好！看到这个${job.value.title}的岗位很感兴趣～我目前有${yearsOfExp}相关经验，${topSkills}都有接触${recentProject ? `，最近在做${recentProject}` : ''}。想了解下贵司这边的具体情况，有空聊聊吗？`,

    concise: isHighMatch
      ? `你好。${job.value.title}岗位匹配度${matchScore}分：${matchedSkills[0] || `${yearsOfExp}经验`} + ${matchedSkills[1] || `${topSkills}技能栈`}。期待沟通。`
      : `你好。${job.value.title}岗位：${yearsOfExp}相关经验，${topSkills}技能栈${recentProject ? `，${recentProject}项目经验` : ''}。期待沟通。`,
  };

  greeting.value = templates[tone.value];
};

// 重新生成打招呼语
const regenerateGreeting = async () => {
  generating.value = true;

  try {
    // 使用AI模型生成
    if (modelStore.currentModel.value) {
      const resume = resumeStore.resume;
      const matchInfo = job.value ? {
        score: job.value.score,
        matched: job.value.matched.slice(0, 3).join('；'),
        missing: job.value.missing.slice(0, 2).join('；'),
      } : null;

      const prompt = `请为以下岗位生成一条${tone.value === 'professional' ? '正式' : tone.value === 'friendly' ? '友好' : '简洁'}的打招呼语：

岗位信息：
- 岗位：${job.value?.title}
- 公司：${job.value?.company}
- HR：${job.value?.hr.name}
- 技能要求：${job.value?.skills.join('、')}
- 经验要求：${job.value?.experience}

我的简历：
- 工作经验：${resume?.experience || '多年相关经验'}
- 核心技能：${resume?.skills?.slice(0, 5).map((s: any) => s.name || s).join('、') || '相关技能'}
- 最近项目：${resume?.experience?.[0]?.projects?.[0]?.name || '相关项目经验'}

匹配分析：
- 匹配度：${matchInfo?.score || 75}分
- 匹配项：${matchInfo?.matched || '工作经验符合要求'}
- 待补充：${matchInfo?.missing || '无'}

要求：
1. 字数控制在80-120字
2. 突出我的匹配优势（基于上述匹配项）
3. 语气${tone.value === 'professional' ? '专业正式，体现专业性' : tone.value === 'friendly' ? '友好亲切，但不失专业' : '简洁直接，突出关键信息'}
4. 不要使用过于夸张的词汇（如"最好"、"第一"、"保证"等）
5. 自然提及1-2个匹配的技能或经验
6. 以询问或期待沟通结尾

只返回打招呼语内容，不要其他说明。`;

      const result = await modelStore.chat(prompt);
      greeting.value = result.trim();
    } else {
      generateGreeting();
    }
  } catch (error) {
    console.error('生成失败:', error);
    generateGreeting();
  } finally {
    generating.value = false;
  }
};

// 监听语气变化
const handleToneChange = (newTone: 'professional' | 'friendly' | 'concise') => {
  tone.value = newTone;
  generateGreeting();
};

// 字数统计
const greetingLength = computed(() => greeting.value.length);

// 风险词检测
const hasRiskWords = computed(() => {
  const riskWords = ['保证', '一定', '绝对', '最好', '第一'];
  return riskWords.some(word => greeting.value.includes(word));
});

onMounted(() => {
  loadJobDetail();
});
</script>

<template>
  <div v-if="loading" style="padding: 40px; text-align: center;">
    <div class="loading-spinner"></div>
    <p style="margin-top: 10px; color: var(--fg-2);">加载中...</p>
  </div>

  <div v-else-if="job">
    <div class="page-h">
      <div>
        <button class="btn btn-ghost" style="margin-bottom: 8px;" @click="onBack">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transform: rotate(180deg);">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
          返回岗位列表
        </button>
        <h1>{{ job.title }}</h1>
        <div class="sub">
          <span style="color: var(--fg-1); font-weight: 500;">{{ job.company }}</span>
          <span style="margin: 0 6px; color: var(--fg-3);">·</span>
          <span class="mono" style="color: var(--accent);">{{ job.salary }}</span>
          <span style="margin: 0 6px; color: var(--fg-3);">·</span>
          <span>{{ job.location }} · {{ job.experience }} · {{ job.education }}</span>
        </div>
      </div>
      <div class="actions">
        <button class="btn btn-ghost">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          查看原帖
        </button>
        <button class="btn">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          跳过
        </button>
        <button class="btn btn-primary" @click="applyJob" :disabled="sending || !greeting.trim()">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
          {{ sending ? '投递中...' : '立即投递' }}
        </button>
      </div>
    </div>

    <div class="detail-grid">
      <div class="col-flex" style="gap: 14px;">
        <!-- AI 匹配分析 -->
        <div class="card">
          <div class="card-h">
            <h3>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--accent);">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              AI 匹配分析
              <span v-if="calculating" style="margin-left: 8px; font-size: 12px; color: var(--primary); font-weight: normal;">
                (计算中...)
              </span>
            </h3>
            <div class="score-badge">{{ job.score }}</div>
          </div>
          <div class="card-body">
            <div style="margin-bottom: 14px;">
              <div class="lbl" style="display: flex; align-items: center; gap: 6px;">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--accent);">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                匹配项 ({{ job.matched.length }})
              </div>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                <div v-for="(m, i) in job.matched" :key="i" style="display: flex; gap: 8px; align-items: flex-start; font-size: 12.5px;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--accent); margin-top: 3px; flex-shrink: 0;">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>{{ m }}</span>
                </div>
              </div>
            </div>

            <div v-if="job.missing.length > 0">
              <div class="lbl" style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 6px; height: 6px; border-radius: 50%; background: var(--warn);"></span>
                需要补充说明 ({{ job.missing.length }})
              </div>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                <div v-for="(m, i) in job.missing" :key="i" style="display: flex; gap: 8px; align-items: flex-start; font-size: 12.5px;">
                  <span style="width: 6px; height: 6px; border-radius: 50%; background: var(--warn); margin-top: 6px; flex-shrink: 0;"></span>
                  <span>{{ m }}</span>
                </div>
              </div>
            </div>

            <div class="hr"></div>

            <div style="background: var(--bg-0); border: 1px solid var(--accent-line); border-radius: 6px; padding: 10px 12px; display: flex; gap: 10px;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--accent); margin-top: 2px; flex-shrink: 0;">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              <div style="font-size: 12.5px; line-height: 1.6;">
                <span style="color: var(--accent); font-weight: 600;">{{ job.aiSuggestion.split('。')[0] }}。</span>
                {{ job.aiSuggestion.split('。').slice(1).join('。') }}
              </div>
            </div>
          </div>
        </div>

        <!-- 打招呼语 -->
        <div class="card">
          <div class="card-h">
            <h3>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              打招呼语
            </h3>
            <div class="row-flex">
              <div class="toggle">
                <button :class="{ on: tone === 'professional' }" @click="handleToneChange('professional')">正式</button>
                <button :class="{ on: tone === 'friendly' }" @click="handleToneChange('friendly')">友好</button>
                <button :class="{ on: tone === 'concise' }" @click="handleToneChange('concise')">极简</button>
              </div>
              <button class="btn sm" @click="regenerateGreeting" :disabled="generating">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
                {{ generating ? '生成中…' : '重新生成' }}
              </button>
            </div>
          </div>
          <div class="card-body">
            <div class="editor" contenteditable @input="(e) => greeting = (e.target as HTMLElement).textContent || ''">
              {{ greeting }}
            </div>
            <div class="row-flex" style="margin-top: 10px; justify-content: space-between;">
              <div class="muted mono" style="font-size: 11px;">
                <svg v-if="!hasRiskWords" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--accent); margin-right: 4px;">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <svg v-else width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--warn); margin-right: 4px;">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                风险词扫描 {{ hasRiskWords ? '发现风险' : '通过' }} · {{ greetingLength }} 字
              </div>
              <button class="btn btn-primary sm">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
                投递并发送
              </button>
            </div>
          </div>
        </div>

        <!-- 岗位描述 -->
        <div class="card">
          <div class="card-h">
            <h3>岗位描述</h3>
            <span class="meta">原文摘录</span>
          </div>
          <div class="card-body" style="font-size: 13px; line-height: 1.7; color: var(--fg-1);">
            {{ job.description }}
            <div style="margin-top: 10px; display: flex; gap: 6px; flex-wrap: wrap;">
              <span v-for="t in job.tags" :key="t" class="chip">{{ t }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="col-flex" style="gap: 14px;">
        <!-- HR 信息 -->
        <div class="card">
          <div class="card-h">
            <h3>HR 信息</h3>
            <span class="pill accent">{{ job.hr.active }}</span>
          </div>
          <div class="card-body">
            <div class="row-flex" style="gap: 12px;">
              <div class="avatar" style="width: 40px; height: 40px; font-size: 14px;">{{ job.hr.name[0] }}</div>
              <div>
                <div style="font-weight: 600;">{{ job.hr.name }}</div>
                <div class="muted" style="font-size: 11.5px;">{{ job.hr.title }} · {{ job.company }}</div>
              </div>
            </div>
            <div class="hr"></div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px;">
              <div>
                <div class="muted mono" style="font-size: 10px; text-transform: uppercase;">响应率</div>
                <div style="font-weight: 600; margin-top: 2px;">{{ job.hr.responseRate }}</div>
              </div>
              <div>
                <div class="muted mono" style="font-size: 10px; text-transform: uppercase;">平均响应</div>
                <div style="font-weight: 600; margin-top: 2px;">{{ job.hr.avgResponseTime }}</div>
              </div>
              <div>
                <div class="muted mono" style="font-size: 10px; text-transform: uppercase;">累计沟通</div>
                <div style="font-weight: 600; margin-top: 2px;">{{ job.hr.totalChats }} 人</div>
              </div>
              <div>
                <div class="muted mono" style="font-size: 10px; text-transform: uppercase;">近期发布</div>
                <div style="font-weight: 600; margin-top: 2px;">{{ job.hr.recentPosts }} 个岗位</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 公司信息 -->
        <div class="card">
          <div class="card-h">
            <h3>公司</h3>
            <span class="pill">{{ job.companyInfo.tag }}</span>
          </div>
          <div class="card-body">
            <div class="row-flex" style="gap: 12px;">
              <div class="job-logo" style="width: 44px; height: 44px;">{{ job.company[0] }}</div>
              <div>
                <div style="font-weight: 600;">{{ job.company }}</div>
                <div class="muted" style="font-size: 11.5px;">{{ job.companyInfo.industry }} · {{ job.companyInfo.size }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 投递时机 -->
        <div class="card">
          <div class="card-h">
            <h3>投递时机</h3>
            <span class="pill accent">最佳</span>
          </div>
          <div class="card-body" style="font-size: 12.5px;">
            <div class="row-flex" style="margin-bottom: 8px;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--accent);">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>建议 <span style="color: var(--accent); font-weight: 600;">{{ new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}</span> 投递（HR 在线 + 拟人化间隔）</span>
            </div>
            <div class="muted" style="font-size: 11.5px; line-height: 1.6;">
              按当前「平衡」策略，建议在HR活跃时段投递，提高响应率。
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div v-else style="padding: 40px; text-align: center; color: var(--fg-2);">
    <p>岗位不存在</p>
  </div>
</template>

<style scoped>
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 20px;
  margin-top: 20px;
}

.col-flex {
  display: flex;
  flex-direction: column;
}

.score-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--accent);
  color: white;
  font-weight: 700;
  font-size: 14px;
}

.toggle {
  display: inline-flex;
  background: var(--bg-1);
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
}

.toggle button {
  padding: 4px 10px;
  border: none;
  background: transparent;
  color: var(--fg-2);
  font-size: 11.5px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}

.toggle button.on {
  background: var(--accent);
  color: white;
}

.editor {
  min-height: 80px;
  padding: 10px 12px;
  background: var(--bg-0);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.6;
  outline: none;
  cursor: text;
}

.editor:focus {
  border-color: var(--accent);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--bg-2);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 1200px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
