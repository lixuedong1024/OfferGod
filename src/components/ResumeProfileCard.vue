<script setup lang="ts">
import { ref, computed } from 'vue';
import { useConfig } from '@/composables/useConfig';
import { ElButton, ElMessage } from 'element-plus';

const configStore = useConfig();
const resumeProfile = computed(() => configStore.config.resume);

const fileInput = ref<HTMLInputElement | null>(null);

function triggerFileUpload() {
  fileInput.value?.click();
}

async function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) return;

  if (!file.name.endsWith('.pdf')) {
    ElMessage.error('仅支持 PDF 格式的简历');
    return;
  }

  const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);

  // 模拟简历解析
  const mockTags = [
    'ROS', 'ROS2', 'Linux', 'Python', 'Shell',
    '机器人运维', '现场调试', '远程支持', '客户对接',
    '英语 CET6', '5 年经验', '北京'
  ];

  const mockPreferences = '偏好机器人/AGV 行业，可接受 30% 出差但不接受长期驻场；倾向技术栈现代（含 Python/K8s/云端监控），抗拒纯硬件维修岗。';

  configStore.updateResumeProfile({
    fileName: file.name,
    fileSize: `${sizeInMB} MB`,
    uploadDate: new Date().toLocaleDateString('zh-CN'),
    tags: mockTags,
    preferences: mockPreferences,
    parsed: true,
  });

  ElMessage.success('简历上传成功');
}

function editPreferences() {
  ElMessage.info('编辑偏好功能开发中');
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
          {{ resumeProfile.preferences }}
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
