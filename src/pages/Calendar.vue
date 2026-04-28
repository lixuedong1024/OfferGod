<template>
  <div class="calendar-page">
    <div class="page-header">
      <h2>面试日程</h2>
      <button class="btn-primary" @click="showAddDialog = true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        添加面试
      </button>
    </div>

    <!-- 统计信息 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">总计</div>
        <div class="stat-value">{{ stats.total }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">已安排</div>
        <div class="stat-value scheduled">{{ stats.scheduled }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">已完成</div>
        <div class="stat-value completed">{{ stats.completed }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">通过率</div>
        <div class="stat-value passed">{{ stats.passRate }}%</div>
      </div>
    </div>

    <!-- 今日面试 -->
    <div v-if="todayInterviews.length > 0" class="today-section">
      <h3>今日面试</h3>
      <div class="interview-list">
        <div
          v-for="interview in todayInterviews"
          :key="interview.id"
          class="interview-card today"
        >
          <InterviewCard
            :interview="interview"
            @edit="editInterview"
            @delete="confirmDelete"
            @update-status="updateStatus"
          />
        </div>
      </div>
    </div>

    <!-- 即将到来的面试 -->
    <div class="upcoming-section">
      <h3>即将到来（7天内）</h3>
      <div v-if="upcomingInterviews.length === 0" class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        <p>暂无即将到来的面试</p>
      </div>
      <div v-else class="interview-list">
        <div
          v-for="interview in upcomingInterviews"
          :key="interview.id"
          class="interview-card"
        >
          <InterviewCard
            :interview="interview"
            @edit="editInterview"
            @delete="confirmDelete"
            @update-status="updateStatus"
          />
        </div>
      </div>
    </div>

    <!-- 所有面试 -->
    <div class="all-section">
      <div class="section-header">
        <h3>所有面试</h3>
        <div class="filters">
          <select v-model="filterStatus" class="filter-select">
            <option value="">全部状态</option>
            <option value="scheduled">已安排</option>
            <option value="completed">已完成</option>
            <option value="cancelled">已取消</option>
          </select>
          <select v-model="filterType" class="filter-select">
            <option value="">全部类型</option>
            <option value="phone">电话面试</option>
            <option value="video">视频面试</option>
            <option value="onsite">现场面试</option>
            <option value="other">其他</option>
          </select>
        </div>
      </div>

      <div v-if="filteredInterviews.length === 0" class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <p>没有找到面试记录</p>
      </div>
      <div v-else class="interview-list">
        <div
          v-for="interview in paginatedInterviews"
          :key="interview.id"
          class="interview-card"
        >
          <InterviewCard
            :interview="interview"
            @edit="editInterview"
            @delete="confirmDelete"
            @update-status="updateStatus"
          />
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="totalPages > 1" class="pagination">
        <button
          class="btn-secondary"
          :disabled="currentPage === 1"
          @click="currentPage--"
        >
          上一页
        </button>
        <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
        <button
          class="btn-secondary"
          :disabled="currentPage === totalPages"
          @click="currentPage++"
        >
          下一页
        </button>
      </div>
    </div>

    <!-- 添加/编辑对话框 -->
    <div v-if="showAddDialog || showEditDialog" class="dialog-overlay" @click.self="closeDialog">
      <div class="dialog">
        <div class="dialog-header">
          <h3>{{ showEditDialog ? '编辑面试' : '添加面试' }}</h3>
          <button class="btn-icon" @click="closeDialog">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label>职位名称 *</label>
            <input v-model="formData.jobName" type="text" placeholder="请输入职位名称" />
          </div>
          <div class="form-group">
            <label>公司名称 *</label>
            <input v-model="formData.companyName" type="text" placeholder="请输入公司名称" />
          </div>
          <div class="form-group">
            <label>面试类型 *</label>
            <select v-model="formData.type">
              <option value="phone">电话面试</option>
              <option value="video">视频面试</option>
              <option value="onsite">现场面试</option>
              <option value="other">其他</option>
            </select>
          </div>
          <div class="form-group">
            <label>面试时间 *</label>
            <input v-model="formData.datetimeStr" type="datetime-local" />
          </div>
          <div class="form-group">
            <label>面试地点</label>
            <input v-model="formData.location" type="text" placeholder="现场面试请填写地址，视频面试请填写会议链接" />
          </div>
          <div class="form-group">
            <label>联系人</label>
            <input v-model="formData.contact" type="text" placeholder="HR 或面试官姓名" />
          </div>
          <div class="form-group">
            <label>联系电话</label>
            <input v-model="formData.contactPhone" type="text" placeholder="联系电话" />
          </div>
          <div class="form-group">
            <label>备注</label>
            <textarea v-model="formData.notes" rows="3" placeholder="面试要求、准备事项等"></textarea>
          </div>
          <div class="form-group checkbox-group">
            <label>
              <input v-model="formData.reminder" type="checkbox" />
              <span>启用提醒</span>
            </label>
          </div>
          <div v-if="formData.reminder" class="form-group">
            <label>提前提醒</label>
            <select v-model.number="formData.reminderTime">
              <option :value="15">提前 15 分钟</option>
              <option :value="30">提前 30 分钟</option>
              <option :value="60">提前 1 小时</option>
              <option :value="120">提前 2 小时</option>
              <option :value="1440">提前 1 天</option>
            </select>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn-secondary" @click="closeDialog">取消</button>
          <button class="btn-primary" @click="saveInterview">保存</button>
        </div>
      </div>
    </div>

    <!-- 删除确认对话框 -->
    <div v-if="showDeleteDialog" class="dialog-overlay" @click.self="showDeleteDialog = false">
      <div class="dialog dialog-small">
        <div class="dialog-header">
          <h3>确认删除</h3>
        </div>
        <div class="dialog-body">
          <p>确定要删除这条面试记录吗？此操作无法撤销。</p>
        </div>
        <div class="dialog-footer">
          <button class="btn-secondary" @click="showDeleteDialog = false">取消</button>
          <button class="btn-danger" @click="deleteInterview">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useInterview, type Interview } from '@/stores/interview';
import InterviewCard from '@/components/InterviewCard.vue';

const {
  interviews,
  loading,
  loadInterviews,
  addInterview,
  updateInterview,
  deleteInterview: deleteInterviewFn,
  getUpcomingInterviews,
  getTodayInterviews,
  getStatistics,
} = useInterview();

// 对话框状态
const showAddDialog = ref(false);
const showEditDialog = ref(false);
const showDeleteDialog = ref(false);
const editingId = ref<string | null>(null);
const deletingId = ref<string | null>(null);

// 表单数据
const formData = ref({
  jobId: '',
  jobName: '',
  companyName: '',
  type: 'video' as Interview['type'],
  datetimeStr: '',
  location: '',
  contact: '',
  contactPhone: '',
  notes: '',
  status: 'scheduled' as Interview['status'],
  reminder: true,
  reminderTime: 30,
});

// 筛选
const filterStatus = ref('');
const filterType = ref('');

// 分页
const currentPage = ref(1);
const pageSize = 10;

// 计算属性
const stats = computed(() => getStatistics());

const todayInterviews = computed(() => getTodayInterviews());

const upcomingInterviews = computed(() => {
  const upcoming = getUpcomingInterviews(7);
  // 排除今天的面试
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000;
  return upcoming.filter(i => i.datetime < startOfDay || i.datetime >= endOfDay);
});

const filteredInterviews = computed(() => {
  let result = [...interviews.value];

  if (filterStatus.value) {
    result = result.filter(i => i.status === filterStatus.value);
  }

  if (filterType.value) {
    result = result.filter(i => i.type === filterType.value);
  }

  return result.sort((a, b) => b.datetime - a.datetime);
});

const totalPages = computed(() => Math.ceil(filteredInterviews.value.length / pageSize));

const paginatedInterviews = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  const end = start + pageSize;
  return filteredInterviews.value.slice(start, end);
});

// 方法
function resetForm() {
  formData.value = {
    jobId: '',
    jobName: '',
    companyName: '',
    type: 'video',
    datetimeStr: '',
    location: '',
    contact: '',
    contactPhone: '',
    notes: '',
    status: 'scheduled',
    reminder: true,
    reminderTime: 30,
  };
}

function closeDialog() {
  showAddDialog.value = false;
  showEditDialog.value = false;
  editingId.value = null;
  resetForm();
}

function editInterview(interview: Interview) {
  editingId.value = interview.id;
  formData.value = {
    jobId: interview.jobId,
    jobName: interview.jobName,
    companyName: interview.companyName,
    type: interview.type,
    datetimeStr: new Date(interview.datetime).toISOString().slice(0, 16),
    location: interview.location || '',
    contact: interview.contact || '',
    contactPhone: interview.contactPhone || '',
    notes: interview.notes || '',
    status: interview.status,
    reminder: interview.reminder,
    reminderTime: interview.reminderTime,
  };
  showEditDialog.value = true;
}

async function saveInterview() {
  if (!formData.value.jobName || !formData.value.companyName || !formData.value.datetimeStr) {
    alert('请填写必填项');
    return;
  }

  const datetime = new Date(formData.value.datetimeStr).getTime();
  if (isNaN(datetime)) {
    alert('请选择有效的面试时间');
    return;
  }

  try {
    const data = {
      jobId: formData.value.jobId,
      jobName: formData.value.jobName,
      companyName: formData.value.companyName,
      type: formData.value.type,
      datetime,
      location: formData.value.location,
      contact: formData.value.contact,
      contactPhone: formData.value.contactPhone,
      notes: formData.value.notes,
      status: formData.value.status,
      reminder: formData.value.reminder,
      reminderTime: formData.value.reminderTime,
    };

    if (showEditDialog.value && editingId.value) {
      await updateInterview(editingId.value, data);
    } else {
      await addInterview(data);
    }

    closeDialog();
  } catch (error) {
    console.error('保存面试失败', error);
    alert('保存失败，请重试');
  }
}

function confirmDelete(interview: Interview) {
  deletingId.value = interview.id;
  showDeleteDialog.value = true;
}

async function deleteInterview() {
  if (!deletingId.value) return;

  try {
    await deleteInterviewFn(deletingId.value);
    showDeleteDialog.value = false;
    deletingId.value = null;
  } catch (error) {
    console.error('删除面试失败', error);
    alert('删除失败，请重试');
  }
}

async function updateStatus(interview: Interview, status: Interview['status']) {
  try {
    await updateInterview(interview.id, { status });
  } catch (error) {
    console.error('更新状态失败', error);
    alert('更新失败，请重试');
  }
}

onMounted(() => {
  loadInterviews();
});
</script>

<style scoped>
.calendar-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 32px;
  font-weight: 600;
  color: #111827;
}

.stat-value.scheduled {
  color: #3b82f6;
}

.stat-value.completed {
  color: #10b981;
}

.stat-value.passed {
  color: #8b5cf6;
}

.today-section,
.upcoming-section,
.all-section {
  margin-bottom: 32px;
}

.today-section h3,
.upcoming-section h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.filters {
  display: flex;
  gap: 12px;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;
}

.interview-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.interview-card.today {
  border-left: 4px solid #f59e0b;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #9ca3af;
}

.empty-state svg {
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
  font-size: 16px;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 24px;
}

.page-info {
  font-size: 14px;
  color: #6b7280;
}

/* 对话框样式 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dialog-small {
  max-width: 400px;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.dialog-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.dialog-body {
  padding: 24px;
  overflow-y: auto;
}

.dialog-body p {
  margin: 0;
  color: #6b7280;
  line-height: 1.6;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  color: #374151;
}

.form-group input[type="text"],
.form-group input[type="datetime-local"],
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
}

.form-group textarea {
  resize: vertical;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.checkbox-group input[type="checkbox"] {
  margin-right: 8px;
  cursor: pointer;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
}

/* 按钮样式 */
.btn-primary,
.btn-secondary,
.btn-danger,
.btn-icon {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
}

.btn-icon {
  padding: 8px;
  background: transparent;
}

.btn-icon:hover {
  background: #f3f4f6;
}
</style>
