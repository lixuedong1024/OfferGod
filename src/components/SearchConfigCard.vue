<script setup lang="ts">
import { ref, computed } from 'vue';
import { useConfig } from '@/composables/useConfig';
import { ElInput, ElSelect, ElOption, ElSlider, ElTag } from 'element-plus';

const configStore = useConfig();
const searchConfig = computed(() => configStore.config.search);

const newKeyword = ref('');
const newExcludeKeyword = ref('');

// 区域字段的计算属性：数组 <-> 字符串转换
const districtsText = computed({
  get: () => searchConfig.value.districts.join(', '),
  set: (value: string) => {
    searchConfig.value.districts = value
      .split(',')
      .map(d => d.trim())
      .filter(d => d.length > 0);
  }
});

function addKeyword() {
  if (newKeyword.value.trim()) {
    searchConfig.value.keywords.push(newKeyword.value.trim());
    newKeyword.value = '';
  }
}

function removeKeyword(keyword: string) {
  const index = searchConfig.value.keywords.indexOf(keyword);
  if (index > -1) {
    searchConfig.value.keywords.splice(index, 1);
  }
}

function addExcludeKeyword() {
  if (newExcludeKeyword.value.trim()) {
    searchConfig.value.excludeKeywords.push(newExcludeKeyword.value.trim());
    newExcludeKeyword.value = '';
  }
}

function removeExcludeKeyword(keyword: string) {
  const index = searchConfig.value.excludeKeywords.indexOf(keyword);
  if (index > -1) {
    searchConfig.value.excludeKeywords.splice(index, 1);
  }
}

const salaryMarks = {
  0: '0',
  10: '10K',
  20: '20K',
  30: '30K',
  40: '40K',
};

const experienceOptions = [
  { label: '1-3 年', value: '1-3年' },
  { label: '3-5 年', value: '3-5年' },
  { label: '5-10 年', value: '5-10年' },
  { label: '10年以上', value: '10年以上' },
];

const educationOptions = [
  { label: '不限', value: '不限' },
  { label: '大专及以上', value: '大专及以上' },
  { label: '本科及以上', value: '本科及以上' },
  { label: '硕士及以上', value: '硕士及以上' },
];
</script>

<template>
  <div class="card">
    <div class="card-h">
      <h3>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        抓取规则
      </h3>
    </div>
    <div class="card-body" style="display: flex; flex-direction: column; gap: 14px">
      <!-- 职位关键词 -->
      <div>
        <label class="lbl">职位关键词</label>
        <div class="keyword-input">
          <div class="chips-container">
            <span
              v-for="keyword in searchConfig.keywords"
              :key="keyword"
              class="chip"
            >
              {{ keyword }}
              <span class="x" @click="removeKeyword(keyword)">×</span>
            </span>
            <input
              v-model="newKeyword"
              class="chip-input"
              placeholder="+ 添加..."
              @keyup.enter="addKeyword"
            />
          </div>
        </div>
      </div>

      <!-- 排除关键词 -->
      <div>
        <label class="lbl">排除关键词</label>
        <div class="keyword-input">
          <div class="chips-container">
            <span
              v-for="keyword in searchConfig.excludeKeywords"
              :key="keyword"
              class="chip danger"
            >
              {{ keyword }}
              <span class="x" @click="removeExcludeKeyword(keyword)">×</span>
            </span>
            <input
              v-model="newExcludeKeyword"
              class="chip-input"
              placeholder="+ 添加..."
              @keyup.enter="addExcludeKeyword"
            />
          </div>
        </div>
      </div>

      <!-- 城市和区域 -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px">
        <div>
          <label class="lbl">城市</label>
          <ElInput v-model="searchConfig.city" class="field" />
        </div>
        <div>
          <label class="lbl">区域（可多选）</label>
          <ElInput
            v-model="districtsText"
            class="field"
            placeholder="海淀, 朝阳, 望京"
          />
        </div>
        <div>
          <label class="lbl">经验</label>
          <ElSelect v-model="searchConfig.experience" class="field">
            <ElOption
              v-for="item in experienceOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>
        </div>
        <div>
          <label class="lbl">学历</label>
          <ElSelect v-model="searchConfig.education" class="field">
            <ElOption
              v-for="item in educationOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>
        </div>
      </div>

      <!-- 薪资范围 -->
      <div>
        <label class="lbl row-flex" style="justify-content: space-between">
          <span>薪资范围</span>
          <span class="mono" style="color: var(--accent)">
            {{ searchConfig.salaryRange[0] }}K – {{ searchConfig.salaryRange[1] }}K
          </span>
        </label>
        <div class="salary-slider">
          <ElSlider
            v-model="searchConfig.salaryRange"
            range
            :min="0"
            :max="40"
            :step="1"
            :marks="salaryMarks"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.keyword-input {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  padding: 8px 10px;
  background: var(--bg-0);
  border: 1px solid var(--line);
  border-radius: 6px;
  min-height: 38px;
}

.chips-container {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  width: 100%;
  align-items: center;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--accent-dim);
  color: var(--accent);
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
}

.chip.danger {
  background: var(--danger-dim);
  color: var(--danger);
}

.chip .x {
  cursor: pointer;
  font-weight: bold;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.chip .x:hover {
  opacity: 1;
}

.chip-input {
  flex: 1;
  background: transparent;
  border: 0;
  color: var(--fg-0);
  outline: none;
  font-size: 12px;
  min-width: 80px;
}

.chip-input::placeholder {
  color: var(--fg-3);
}

.salary-slider {
  background: var(--bg-0);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 20px 14px 12px;
}

.field {
  width: 100%;
}
</style>
