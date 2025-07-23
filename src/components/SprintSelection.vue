<template>
  <n-card title="Select Sprints" style="max-width: 500px; margin: 2rem auto;">
    <n-spin :show="loading">
      <div style="margin-bottom: 1rem;">
        <n-checkbox-group v-model:value="selectedSprints" :disabled="loading">
          <n-space vertical>
            <n-checkbox 
              v-for="s in sprints" 
              :key="s.id" 
              :value="s.id"
              :label="s.name"
              :disabled="loading"
            />
          </n-space>
        </n-checkbox-group>
      </div>
      <div style="display: flex; gap: 1rem;">
        <n-button @click="$emit('go-back')" style="flex: 1;" :disabled="loading">
          Back to Projects
        </n-button>
        <n-button 
          type="primary" 
          :disabled="!selectedSprints.length || loading" 
          @click="confirm"
          style="flex: 1;"
        >
          Continue
        </n-button>
      </div>
      <n-alert v-if="error" type="error" style="margin-top: 1rem;">
        {{ error }}
      </n-alert>
    </n-spin>
  </n-card>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { useMessage } from 'naive-ui'

const message = useMessage()
const fetchWithRefresh = inject('fetchWithRefresh')
const props = defineProps(['token', 'taigaUrl', 'projectId', 'projectSlug'])
const emit = defineEmits(['sprints-selected', 'go-back'])

const sprints = ref([])
const selectedSprints = ref([])
const error = ref('')
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    const res = await fetchWithRefresh(`${props.taigaUrl}/api/v1/milestones?project=${props.projectId}`)
    if (!res.ok) {
      throw new Error('Failed to fetch sprints')
    }
    sprints.value = await res.json()
  } catch (e) {
    error.value = e.message
    message.error(e.message)
  } finally {
    loading.value = false
  }
})

function confirm() {
  if (selectedSprints.value.length > 0) {
    emit('sprints-selected', selectedSprints.value)
  }
}
</script>