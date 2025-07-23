<template>
  <n-config-provider>
    <n-message-provider>
      <div>
        <LoginPage v-if="!token" @login-success="onLogin" />
        <ProjectSelection 
          v-else-if="!projectId" 
          :token="token" 
          :taigaUrl="taigaUrl" 
          @project-selected="onProject"
          @go-back="goBackToLogin" 
        />
        <SprintSelection 
          v-else-if="!sprintIds.length" 
          :token="token" 
          :taigaUrl="taigaUrl" 
          :projectId="projectId"
          :projectSlug="projectSlug"
          @sprints-selected="onSprints"
          @go-back="goBackToProject" 
        />
        <UserStoriesTable 
          v-else 
          :token="token" 
          :taigaUrl="taigaUrl" 
          :projectId="projectId"
          :projectSlug="projectSlug" 
          :sprintIds="sprintIds"
          @go-back="goBackToSprints" 
        />
      </div>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup>
import { ref, onMounted, provide } from 'vue'
import LoginPage from './components/LoginPage.vue'
import ProjectSelection from './components/ProjectSelection.vue'
import SprintSelection from './components/SprintSelection.vue'
import UserStoriesTable from './components/UserStoriesTable.vue'

const token = ref('')
const taigaUrl = ref('')
const projectId = ref('')
const projectSlug = ref('')
const sprintIds = ref([])

// Check for stored tokens on app load
onMounted(() => {
  const storedToken = localStorage.getItem('taiga_access_token')
  const storedUrl = localStorage.getItem('taiga_url')
  
  if (storedToken && storedUrl) {
    token.value = storedToken
    taigaUrl.value = storedUrl
  }
})

// Refresh token function
async function refreshToken() {
  const refreshToken = localStorage.getItem('taiga_refresh_token')
  if (!refreshToken || refreshToken === '') {
    throw new Error('No refresh token available')
  }
  
  try {
    const res = await fetch(`${taigaUrl.value}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken })
    })
    
    if (!res.ok) {
      throw new Error('Token refresh failed')
    }
    
    const data = await res.json()
    localStorage.setItem('taiga_access_token', data.auth_token)
    token.value = data.auth_token
    
    return data.auth_token
  } catch (error) {
    // Clear stored tokens on refresh failure
    localStorage.removeItem('taiga_access_token')
    localStorage.removeItem('taiga_refresh_token')
    localStorage.removeItem('taiga_url')
    localStorage.removeItem('taiga_username')
    
    token.value = ''
    taigaUrl.value = ''
    projectId.value = ''
    projectSlug.value = ''
    sprintIds.value = []
    
    throw error
  }
}

// Enhanced fetch function with token refresh
async function fetchWithRefresh(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token.value}`,
        ...options.headers
      }
    })
    
    if (response.status === 401) {
      // Token expired, try to refresh
      const newToken = await refreshToken()
      
      // Retry with new token
      return await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${newToken}`,
          ...options.headers
        }
      })
    }
    
    return response
  } catch (error) {
    throw error
  }
}

function onLogin({ token: t, taigaUrl: url }) {
  token.value = t
  taigaUrl.value = url
}

function onProject({ id, slug }) {
  projectId.value = id
  projectSlug.value = slug
}

function onSprints(ids) {
  sprintIds.value = ids
}

// Back navigation functions
function goBackToLogin() {
  token.value = ''
  taigaUrl.value = ''
  localStorage.removeItem('taiga_access_token')
  localStorage.removeItem('taiga_refresh_token')
  localStorage.removeItem('taiga_url')
  localStorage.removeItem('taiga_username')
}

function goBackToProject() {
  projectId.value = ''
  projectSlug.value = ''
  sprintIds.value = []
}

function goBackToSprints() {
  sprintIds.value = []
}

// Expose fetchWithRefresh to child components
provide('fetchWithRefresh', fetchWithRefresh)
</script>