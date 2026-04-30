<script setup lang="ts">
import { ref, computed } from 'vue';
import { useConfig } from '@/composables/useConfig';
import { useModel } from '@/composables/useModel';
import { useResumeStore } from '@/stores/resume';
import { ElButton, ElMessage, ElMessageBox } from 'element-plus';
import { validatePDFFile, parseResumeWithAI } from '@/utils/resumeParser';
import { Logger } from '@/utils/logger';

const configStore = useConfig();
const modelStore = useModel();
const resumeStore = useResumeStore();
const resumeProfile = computed(() => configStore.config.resume);

const fileInput = ref<HTMLInputElement | null>(null);
const parsing = ref(false);

function triggerFileUpload() {
  fileInput.value?.click();
}

async function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) return;

  parsing.value = true;
  const loadingMsg = ElMessage.info({
    message: '正在使用 Claude AI 解析简历，请稍候...',
    duration: 0,
  });

  try {
    // 1. 验证 PDF 文件
    Logger.info('开始验证 PDF 文件', { fileName: file.name });
    validatePDFFile(file);

    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);

    // 2. 直接使用 Claude AI 解析 PDF 简历
    Logger.info('开始 Claude AI 解析简历');
    const parsedResume = await parseResumeWithAI(file, modelStore);
    Logger.info('AI 解析成功', {
      name: parsedResume.name,
      skills: parsedResume.skills.length,
      projects: parsedResume.projects.length
    });

    // 3. 保存到配置存储（用于简历画像卡片显示）
    configStore.updateResumeProfile({
      fileName: file.name,
      fileSize: `${sizeInMB} MB`,
      uploadDate: new Date().toLocaleDateString('zh-CN'),
      tags: parsedResume.skills,
      preferences: parsedResume.preferences,
      parsed: true,
    });

    // 4. 保存到简历存储（用于岗位匹配分析）
    await resumeStore.updateProfile({
      name: parsedResume.name,
      email: parsedResume.email,
      phone: parsedResume.phone,
      location: parsedResume.location,
      experience: parsedResume.experience,
      currentPosition: parsedResume.currentPosition,
      currentCompany: parsedResume.currentCompany,
      education: parsedResume.education,
      major: parsedResume.major,
      school: parsedResume.school,
      skills: parsedResume.skills,
      projects: parsedResume.projects,
      strengths: parsedResume.strengths,
      expectedSalary: parsedResume.expectedSalary,
      expectedLocation: parsedResume.expectedLocation,
      expectedPosition: parsedResume.expectedPosition,
    });

    // 5. 保存配置
    await configStore.saveConfig();

    loadingMsg.close();
    ElMessage.success({
      message: `简历解析成功！提取了 ${parsedResume.skills.length} 个技能标签`,
      duration: 3000,
    });

    Logger.info('简历上传和解析完成', {
      fileName: file.name,
      skills: parsedResume.skills.length,
      projects: parsedResume.projects.length,
    });
  } catch (error) {
    loadingMsg.close();

    // 改进错误日志
    const errorDetails = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : { error: JSON.stringify(error) };
    Logger.error('简历解析失败', errorDetails);

    let errorMessage = '简历解析失败';
    if (error instanceof Error) {
      errorMessage = error.message;

      // 针对常见错误提供更友好的提示
      if (errorMessage.includes('仅支持 Claude 模型')) {
        errorMessage = '简历解析功能需要配置 Claude 模型。请在设置中配置 Claude API。';
      } else if (errorMessage.includes('未配置 AI 模型')) {
        errorMessage = '请先在设置中配置 Claude AI 模型后再上传简历。';
      } else if (errorMessage.includes('Claude PDF 解析失败')) {
        // 提取具体的 API 错误信息
        errorMessage = `Claude API 调用失败: ${errorMessage}`;
      }
    } else {
      errorMessage = `简历解析失败: ${JSON.stringify(error)}`;
    }

    ElMessage.error({
      message: errorMessage,
      duration: 5000,
    });
  } finally {
    parsing.value = false;
    // 清空 input，允许重新上传同一文件
    if (target) {
      target.value = '';
    }
  }
}

async function editPreferences() {
  if (!resumeProfile.value) return;

  try {
    const { value } = await ElMessageBox.prompt('请输入您的求职偏好', '编辑求职偏好', {
      confirmButtonText: '保存',
      cancelButtonText: '取消',
      inputType: 'textarea',
      inputValue: resumeProfile.value.preferences,
      inputPlaceholder: '例如：偏好互联网行业，技术栈倾向 Java + 微服务，可接受适度加班...',
      inputValidator: (value) => {
        if (!value || value.trim().length < 10) {
          return '求职偏好至少需要 10 个字符';
        }
        return true;
      },
    });

    if (value) {
      configStore.updateResumeProfile({
        ...resumeProfile.value,
        preferences: value.trim(),
      });
      await configStore.saveConfig();
      ElMessage.success('求职偏好已更新');
    }
  } catch (error) {
    // 用户取消操作
    Logger.debug('用户取消编辑偏好');
  }
}
</script>

<template>
  <div class="card">
    <div class="card-h">
      <h3>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
        简历画像
      </h3>
      <span v-if="resumeProfile?.parsed" class="pill accent">已解析</span>
    </div>
    <div class="card-body">
      <div v-if="!resumeProfile" class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--fg-3); margin-bottom: 12px">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
        <div style="color: var(--fg-2); margin-bottom: 16px">暂未上传简历</div>
        <button class="btn btn-primary" @click="triggerFileUpload">上传简历</button>
      </div>

      <template v-else>
        <div class="row-flex" style="margin-bottom: 10px">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--accent)">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <div>
            <div style="font-weight: 600; font-size: 13px">{{ resumeProfile.fileName }}</div>
            <div class="muted" style="font-size: 11px">
              {{ resumeProfile.fileSize }} · 上传于 {{ resumeProfile.uploadDate }}
            </div>
          </div>
          <button class="btn sm" style="margin-left: auto" @click="triggerFileUpload">替换</button>
        </div>

        <div class="hr"></div>

        <div class="lbl">AI 提取的标签</div>
        <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 14px">
          <span
            v-for="tag in resumeProfile.tags"
            :key="tag"
            class="chip"
            style="background: var(--accent-dim); color: var(--accent)"
          >
            {{ tag }}
          </span>
        </div>

        <div class="hr"></div>

        <div class="lbl">求职偏好（用于 AI 评分）</div>
        <div style="font-size: 12.5px; line-height: 1.7; color: var(--fg-1); margin-bottom: 10px">
          <template v-if="resumeProfile.preferences && resumeProfile.preferences.trim()">
            {{ resumeProfile.preferences }}
          </template>
          <span v-else style="color: var(--fg-3); font-style: italic">
            暂未设置求职偏好，点击下方按钮添加
          </span>
        </div>
        <button class="btn sm" @click="editPreferences">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          编辑偏好
        </button>
      </template>
    </div>
  </div>

  <input
    ref="fileInput"
    type="file"
    accept=".pdf"
    style="display: none"
    @change="handleFileUpload"
  />
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11.5px;
  white-space: nowrap;
}

.hr {
  height: 1px;
  background: var(--line);
  margin: 12px 0;
}

.lbl {
  font-size: 11px;
  font-weight: 600;
  color: var(--fg-2);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}
</style>
