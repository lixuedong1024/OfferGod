<script setup lang="ts">
import { ref } from 'vue';

const keywords = ref('');
const cities = ref<string[]>([]);
const salaryMin = ref(15);
const salaryMax = ref(30);

const cityOptions = ['北京', '上海', '深圳', '杭州', '广州', '成都'];

function saveConfig() {
  console.log('保存搜索配置');
}
</script>

<template>
  <div>
    <div class="page-h">
      <div>
        <h1>搜索条件</h1>
        <div class="sub">配置自动搜索的岗位筛选条件</div>
      </div>
      <div class="actions">
        <button class="btn btn-primary" @click="saveConfig">保存配置</button>
      </div>
    </div>

    <div class="card">
      <div class="card-h">
        <h3>基础条件</h3>
      </div>
      <div class="card-body">
        <div class="form-group">
          <label>关键词</label>
          <input v-model="keywords" type="text" placeholder="例如：机器人运维工程师" />
        </div>

        <div class="form-group">
          <label>城市</label>
          <div class="checkbox-group">
            <label v-for="city in cityOptions" :key="city">
              <input type="checkbox" :value="city" v-model="cities" />
              {{ city }}
            </label>
          </div>
        </div>

        <div class="form-group">
          <label>薪资范围（K）</label>
          <div style="display: flex; gap: 10px; align-items: center">
            <input v-model.number="salaryMin" type="number" style="width: 100px" />
            <span>-</span>
            <input v-model.number="salaryMax" type="number" style="width: 100px" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-h {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.page-h h1 {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.page-h .sub {
  font-size: 13px;
  color: var(--fg-2);
}

.btn {
  padding: 8px 16px;
  font-size: 12px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--bg-1);
  cursor: pointer;
}

.btn-primary {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}

.card {
  background: var(--bg-1);
  border: 1px solid var(--line);
  border-radius: 8px;
}

.card-h {
  padding: 14px 16px;
  border-bottom: 1px solid var(--line);
}

.card-h h3 {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
}

.card-body {
  padding: 16px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 8px;
}

.form-group input {
  width: 100%;
  padding: 8px 12px;
  font-size: 13px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--bg-0);
}

.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: normal;
  margin: 0;
  cursor: pointer;
}
</style>
