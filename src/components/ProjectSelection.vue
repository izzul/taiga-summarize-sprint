<template>
  <n-card title="Select Project" style="max-width: 500px; margin: 2rem auto;">
    <n-spin :show="loading">
      <div style="margin-bottom: 1rem;">
        <n-select
          v-model:value="selected"
          :options="projectOptions"
          placeholder="Choose a project"
          @update:value="select"
          style="width: 100%;"
          :disabled="loading"
        />
      </div>
      <div style="display: flex; gap: 1rem;">
        <n-button @click="$emit('go-back')" style="flex: 1;" :disabled="loading">
          Back to Login
        </n-button>
        <n-button 
          type="primary" 
          :disabled="!selected || loading" 
          @click="select"
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
import { ref, onMounted, inject, computed } from 'vue'
import { useMessage } from 'naive-ui'

const message = useMessage()
const fetchWithRefresh = inject('fetchWithRefresh')
const props = defineProps(['token', 'taigaUrl'])
const emit = defineEmits(['project-selected', 'go-back'])

const projects = ref([])
const selected = ref('')
const error = ref('')
const loading = ref(false)

const projectOptions = computed(() => 
  projects.value.map(p => ({
    label: p.name,
    value: p.id,
    slug: p.slug
  }))
)

onMounted(async () => {
  loading.value = true
  try {
    const res = await fetchWithRefresh(`${props.taigaUrl}/api/v1/projects`)
    if (!res.ok) {
      throw new Error('Failed to fetch projects')
    }
    projects.value = await res.json()
  } catch (e) {
    error.value = e.message
    message.error(e.message)
  } finally {
    loading.value = false
  }
})

function select() {
  if (selected.value) {
    const selectedProject = projects.value.find(p => p.id === selected.value)
    if (selectedProject) {
      emit('project-selected', { 
        id: selectedProject.id, 
        slug: selectedProject.slug 
      })
    }
  }
}
</script>