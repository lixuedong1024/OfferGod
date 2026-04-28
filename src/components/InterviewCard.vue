<template>
  <div class="interview-card">
    <div class="card-header">
      <div class="interview-info">
        <h4 class="job-name">{{ interview.jobName }}</h4>
        <p class="company-name">{{ interview.companyName }}</p>
      </div>
      <div class="card-actions">
        <button class="btn-icon" @click="$emit('edit', interview)" title="编辑">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="btn-icon" @click="$emit('delete', interview)" title="删除">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>

    <div class="card-body">
      <div class="info-row">
        <div class="info-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span>{{ formatDateTime(interview.datetime) }}</span>
        </div>
        <div class="info-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
          <span>{{ getTypeText(interview.type) }}</span>
        </div>
      </div>

      <div v-if="interview.location" class="info-row">
        <div class="info-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <span>{{ interview.location }}</span>
        </div>
      </div>

      <div v-if="interview.contact" class="info-row">
        <div class="info-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>{{ interview.contact }}</span>
          <span v-if="interview.contactPhone" class="contact-phone">{{ interview.contactPhone }}</span>
        </div>
      </div>

      <div v-if="interview.notes" class="notes">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
        <span>{{ interview.notes }}</span>
      </div>

      <div class="card-footer">
        <div class="badges">
          <span :class="['badge', 'badge-' + interview.status]">
            {{ getStatusText(interview.status) }}
          </span>
          <span v-if="interview.reminder" class="badge badge-reminder">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            提前 {{ getReminderText(interview.reminderTime) }} 提醒
          </span>
          <span v-if="interview.result" :class="['badge', 'badge-result-' + interview.result]">
            {{ getResultText(interview.result) }}
          </span>
        </div>

        <div v-if="interview.status === 'scheduled'" class="status-actions">
          <button class="btn-sm btn-success" @click="$emit('update-status', interview, 'completed')">
            完成
          </button>
          <button class="btn-sm btn-cancel" @click="$emit('update-status', interview, 'cancelled')">
            取消
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Interview } from '@/stores/interview';

defineProps<{
  interview: Interview;
}>();

defineEmits<{
  edit: [interview: Interview];
  delete: [interview: Interview];
  'update-status': [interview: Interview, status: Interview['status']];
}>();

function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  const dateStr = date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  });

  const timeStr = date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (date >= today && date < tomorrow) {
    return `今天 ${timeStr}`;
  } else if (date >= tomorrow && date < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)) {
    return `明天 ${timeStr}`;
  } else {
    return `${dateStr} ${timeStr}`;
  }
}

function getTypeText(type: Interview['type']): string {
  const typeMap: Record<Interview['type'], string> = {
    phone: '电话面试',
    video: '视频面试',
    onsite: '现场面试',
    other: '其他',
  };
  return typeMap[type];
}

function getStatusText(status: Interview['status']): string {
  const statusMap: Record<Interview['status'], string> = {
    scheduled: '已安排',
    completed: '已完成',
    cancelled: '已取消',
  };
  return statusMap[status];
}

function getResultText(result: Interview['result']): string {
  const resultMap: Record<NonNullable<Interview['result']>, string> = {
    passed: '通过',
    failed: '未通过',
    pending: '待定',
  };
  return resultMap[result];
}

function getReminderText(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} 分钟`;
  } else if (minutes < 1440) {
    return `${Math.floor(minutes / 60)} 小时`;
  } else {
    return `${Math.floor(minutes / 1440)} 天`;
  }
}
</script>

<style scoped>
.interview-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s;
}

.interview-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  border-bottom: 1px solid #f3f4f6;
}

.interview-info {
  flex: 1;
}

.job-name {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.company-name {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
}

.card-actions {
  display: flex;
  gap: 4px;
}

.btn-icon {
  padding: 6px;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #f3f4f6;
  color: #111827;
}

.card-body {
  padding: 16px;
}

.info-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 12px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #6b7280;
}

.info-item svg {
  flex-shrink: 0;
}

.contact-phone {
  margin-left: 8px;
  padding-left: 8px;
  border-left: 1px solid #e5e7eb;
}

.notes {
  display: flex;
  gap: 6px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 6px;
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
  margin-bottom: 12px;
}

.notes svg {
  flex-shrink: 0;
  margin-top: 2px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #f3f4f6;
}

.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.badge-scheduled {
  background: #dbeafe;
  color: #1e40af;
}

.badge-completed {
  background: #d1fae5;
  color: #065f46;
}

.badge-cancelled {
  background: #fee2e2;
  color: #991b1b;
}

.badge-reminder {
  background: #fef3c7;
  color: #92400e;
}

.badge-result-passed {
  background: #e9d5ff;
  color: #6b21a8;
}

.badge-result-failed {
  background: #fecaca;
  color: #991b1b;
}

.badge-result-pending {
  background: #e5e7eb;
  color: #374151;
}

.status-actions {
  display: flex;
  gap: 8px;
}

.btn-sm {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-success {
  background: #10b981;
  color: white;
}

.btn-success:hover {
  background: #059669;
}

.btn-cancel {
  background: #f3f4f6;
  color: #6b7280;
}

.btn-cancel:hover {
  background: #e5e7eb;
  color: #374151;
}
</style>
