<template>
  <n-card title="Login to Taiga" style="max-width: 400px; margin: 2rem auto;">
    <n-form ref="formRef" :model="formValue" :rules="rules">
      <n-form-item label="Taiga URL" path="taigaUrl">
        <n-input v-model:value="formValue.taigaUrl" placeholder="https://taiga.yourdomain.com" />
      </n-form-item>
      <n-form-item label="Username" path="username">
        <n-input v-model:value="formValue.username" placeholder="Your username" />
      </n-form-item>
      <n-form-item label="Password" path="password">
        <n-input v-model:value="formValue.password" type="password" placeholder="Your password" />
      </n-form-item>
      <n-button type="primary" block @click="login" :loading="loading">
        Login
      </n-button>
    </n-form>
    <n-alert v-if="error" type="error" style="margin-top: 1rem;">
      {{ error }}
    </n-alert>
  </n-card>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useMessage } from 'naive-ui'

const message = useMessage()
const formRef = ref(null)
const loading = ref(false)
const error = ref('')
const emit = defineEmits(['login-success'])

const formValue = reactive({
  taigaUrl: 'https://taigageoseismal.ddns.net',
  username: '',
  password: ''
})

const rules = {
  taigaUrl: {
    required: true,
    message: 'Please enter Taiga URL',
    trigger: 'blur'
  },
  username: {
    required: true,
    message: 'Please enter username',
    trigger: 'blur'
  },
  password: {
    required: true,
    message: 'Please enter password',
    trigger: 'blur'
  }
}

async function login() {
  error.value = ''
  loading.value = true
  
  try {
    await formRef.value?.validate()
    
    const res = await fetch(`${formValue.taigaUrl}/api/v1/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: formValue.username, 
        password: formValue.password, 
        type: 'normal' 
      })
    })
    
    if (!res.ok) {
      throw new Error('Login failed. Please check your credentials.')
    }
    
    const data = await res.json()
    
    // Store tokens in localStorage
    localStorage.setItem('taiga_access_token', data.auth_token)
    // Some Taiga instances might not provide refresh tokens
    if (data.refresh_token) {
      localStorage.setItem('taiga_refresh_token', data.refresh_token)
    } else {
      localStorage.setItem('taiga_refresh_token', '')
    }
    localStorage.setItem('taiga_url', formValue.taigaUrl)
    localStorage.setItem('taiga_username', formValue.username)
    
    message.success('Login successful!')
    emit('login-success', { 
      token: data.auth_token, 
      taigaUrl: formValue.taigaUrl 
    })
  } catch (e) {
    error.value = e.message
    message.error(e.message)
  } finally {
    loading.value = false
  }
}
</script>
