import { ref, computed } from 'vue';
import { Logger } from '@/utils/logger';

export interface BatchOperationOptions {
  onSuccess?: (count: number) => void;
  onError?: (error: Error) => void;
  onProgress?: (current: number, total: number) => void;
}

export function useBatchOperation() {
  const selectedIds = ref<Set<string>>(new Set());
  const isProcessing = ref(false);
  const progress = ref({ current: 0, total: 0 });

  // 选择/取消选择单个项目
  const toggleSelection = (id: string) => {
    if (selectedIds.value.has(id)) {
      selectedIds.value.delete(id);
    } else {
      selectedIds.value.add(id);
    }
    // 触发响应式更新
    selectedIds.value = new Set(selectedIds.value);
  };

  // 全选
  const selectAll = (ids: string[]) => {
    selectedIds.value = new Set(ids);
  };

  // 取消全选
  const clearSelection = () => {
    selectedIds.value.clear();
    selectedIds.value = new Set(selectedIds.value);
  };

  // 反选
  const invertSelection = (allIds: string[]) => {
    const newSelection = new Set<string>();
    allIds.forEach(id => {
      if (!selectedIds.value.has(id)) {
        newSelection.add(id);
      }
    });
    selectedIds.value = newSelection;
  };

  // 是否选中
  const isSelected = (id: string) => {
    return selectedIds.value.has(id);
  };

  // 选中数量
  const selectedCount = computed(() => selectedIds.value.size);

  // 是否全选
  const isAllSelected = (totalCount: number) => {
    return selectedIds.value.size === totalCount && totalCount > 0;
  };

  // 是否部分选中
  const isIndeterminate = (totalCount: number) => {
    return selectedIds.value.size > 0 && selectedIds.value.size < totalCount;
  };

  // 批量执行操作
  async function executeBatch<T>(
    items: T[],
    operation: (item: T) => Promise<void>,
    options: BatchOperationOptions = {}
  ) {
    if (isProcessing.value) {
      Logger.warn('批量操作正在进行中');
      return;
    }

    isProcessing.value = true;
    progress.value = { current: 0, total: items.length };

    let successCount = 0;
    let errorCount = 0;

    try {
      for (let i = 0; i < items.length; i++) {
        try {
          await operation(items[i]);
          successCount++;
        } catch (error) {
          errorCount++;
          Logger.error('批量操作失败', { index: i, error });
        }

        progress.value.current = i + 1;
        options.onProgress?.(i + 1, items.length);

        // 添加延迟，避免请求过快
        if (i < items.length - 1) {
          await delay(randomDelay(500, 1500));
        }
      }

      if (successCount > 0) {
        options.onSuccess?.(successCount);
      }

      Logger.info('批量操作完成', { successCount, errorCount, total: items.length });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      options.onError?.(err);
      Logger.error('批量操作异常', error);
    } finally {
      isProcessing.value = false;
      progress.value = { current: 0, total: 0 };
    }
  }

  // 随机延迟
  function randomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // 延迟函数
  function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  return {
    selectedIds,
    selectedCount,
    isProcessing,
    progress,
    toggleSelection,
    selectAll,
    clearSelection,
    invertSelection,
    isSelected,
    isAllSelected,
    isIndeterminate,
    executeBatch,
  };
}
