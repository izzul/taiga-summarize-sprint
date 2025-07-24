<template>
  <n-card title="User Stories" style="margin: 2rem auto;">
    <n-spin :show="loading">
      <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem; flex-wrap: wrap;">
        <n-input 
          v-model:value="search" 
          placeholder="Search..." 
          style="flex: 1 1 200px; min-width: 150px;" 
          :disabled="loading"
        />
        <n-button @click="exportCSV" :disabled="loading">Export CSV</n-button>
        <n-button @click="exportXLSX" :disabled="loading">Export XLSX</n-button>
      </div>
      
      <n-data-table
        class="custom-user-stories-table"
        :columns="tableColumns"
        :data="filteredStories"
        :pagination="pagination"
        :bordered="true"
        striped
        :loading="loading"
      />
      
      <div style="margin-top: 1rem;">
        <n-button @click="$emit('go-back')" :disabled="loading">
          Back to Sprints
        </n-button>
      </div>
    </n-spin>
  </n-card>
</template>

<script setup>
import { ref, computed, watch, inject, h } from 'vue'
import { useMessage } from 'naive-ui'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

const message = useMessage()
const fetchWithRefresh = inject('fetchWithRefresh')
const props = defineProps(['token', 'taigaUrl', 'projectId', 'projectSlug', 'sprintIds'])
const emit = defineEmits(['go-back'])

const columns = [
  { key: 'title', label: 'User Story Title' },
  { key: 'url', label: 'URL' },
  { key: 'assignees', label: 'Assignees' },
  { key: 'story_points', label: 'Total Points' },
  { key: 'point_sharing', label: 'Point Sharing' },
  { key: 'sprint', label: 'Sprint' },
  { key: 'month', label: 'Month' }
]

const stories = ref([])
const search = ref('')
const sortKey = ref('title')
const sortAsc = ref(true)
const error = ref('')
const loading = ref(false)

const pagination = {
  pageSize: 20
}

const tableColumns = computed(() => 
  columns.map(col => ({
    title: col.label,
    key: col.key,
    sorter: (a, b) => {
      if (a[col.key] < b[col.key]) return sortAsc.value ? -1 : 1
      if (a[col.key] > b[col.key]) return sortAsc.value ? 1 : -1
      return 0
    },
    render: (row) => {
      if (col.key === 'url') {
        return h('a', { href: row[col.key], target: '_blank' }, 'Link')
      }
      return row[col.key]
    }
  }))
)

watch(() => props.sprintIds, fetchStories, { immediate: true })

async function fetchStories() {
  if (!props.sprintIds.length) return
  loading.value = true
  try {
    let allStories = []
    const userCache = new Map() // Cache for fetched users
    
    // Function to fetch user by ID with caching
    async function fetchUserById(userId) {
      if (userCache.has(userId)) {
        return userCache.get(userId)
      }
      
      try {
        const userRes = await fetchWithRefresh(`${props.taigaUrl}/api/v1/users/${userId}`)
        if (userRes.ok) {
          const user = await userRes.json()
          userCache.set(userId, user)
          return user
        }
      } catch (error) {
        console.warn(`Failed to fetch user ${userId}:`, error)
      }
      
      // Return null if user not found
      userCache.set(userId, null)
      return null
    }
    
    for (const sprintId of props.sprintIds) {
      // Get sprint info for month
      const sprintRes = await fetchWithRefresh(`${props.taigaUrl}/api/v1/milestones/${sprintId}`)
      if (!sprintRes.ok) {
        throw new Error('Failed to fetch sprint info')
      }
      const sprintInfo = await sprintRes.json()
      const sprintName = sprintInfo.name
      const sprintMonth = sprintInfo.estimated_start ? (new Date(sprintInfo.estimated_start)).getMonth() + 1 : ''

      // Get user stories using project ID
      const res = await fetchWithRefresh(`${props.taigaUrl}/api/v1/userstories?project=${props.projectId}&milestone=${sprintId}`)
      if (!res.ok) {
        throw new Error('Failed to fetch user stories')
      }
      const data = await res.json()
      
      // Process stories and fetch assignees
      const processedStories = await Promise.all(data.map(async (story) => {
        // Fetch full story details to get the description
        let fullStory = story;
        try {
          const detailRes = await fetchWithRefresh(`${props.taigaUrl}/api/v1/userstories/${story.id}`);
          if (detailRes.ok) {
            fullStory = await detailRes.json();
          }
        } catch (e) {
          // If detail fetch fails, fallback to summary
        }
        // Handle multiple assignees using assigned_users array
        let assignees = [];
        if (fullStory.assigned_users && Array.isArray(fullStory.assigned_users)) {
          // Fetch all assignees in parallel
          const assigneePromises = fullStory.assigned_users.map(async (userId) => {
            const user = await fetchUserById(userId);
            if (user) {
              return {
                display: user.full_name_display || user.full_name || user.username || `User ${userId}`,
                username: user.username
              };
            }
            return { display: `User ${userId}`, username: `user${userId}` };
          });
          assignees = await Promise.all(assigneePromises);
        }
        
        const description = fullStory.description || "";
        let totalPoints = fullStory.total_points || 0;
        if (totalPoints > 0) {
            totalPoints = Math.round(totalPoints * 100) / 100;
        }
        // Pass both display and username to the distribution function
        const pointValues = parsePointDistribution(description, assignees, totalPoints);
        // Sort by points descending
        pointValues.sort((a, b) => b.points - a.points);
        const taigaDirectUrl = typeof __TAIGA_URL__ !== 'undefined' ? __TAIGA_URL__ : props.taigaUrl
        return {
            id: fullStory.id,
            title: fullStory.subject,
            // Use project slug for generating the URL
            url: `${taigaDirectUrl}/project/${props.projectSlug}/us/${fullStory.ref}`,
            assignees: pointValues.map(p => p.display).join(', '),
            story_points: totalPoints,
            point_sharing: pointValues.map(p => p.points.toFixed(2)).join(","),
            sprint: extractSprintNumber(sprintName),
            month: sprintMonth
        };
      }));
      
      allStories = allStories.concat(processedStories);
    }
    stories.value = allStories
  } catch (e) {
    error.value = e.message
    message.error(e.message)
  } finally {
    loading.value = false
  }
}

const filteredStories = computed(() => {
  let result = stories.value
  if (search.value) {
    result = result.filter(story =>
      Object.values(story).some(val =>
        String(val).toLowerCase().includes(search.value.toLowerCase())
      )
    )
  }
  result = result.sort((a, b) => {
    if (a[sortKey.value] < b[sortKey.value]) return sortAsc.value ? -1 : 1
    if (a[sortKey.value] > b[sortKey.value]) return sortAsc.value ? 1 : -1
    return 0
  })
  return result
})

function sort(key) {
  if (sortKey.value === key) sortAsc.value = !sortAsc.value
  else {
    sortKey.value = key
    sortAsc.value = true
  }
}

function exportCSV() {
  const rows = [columns.map(c => c.label)]
  filteredStories.value.forEach(story => {
    rows.push(columns.map(c => story[c.key]))
  })
  const csv = rows.map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  saveAs(blob, 'user_stories.csv')
  message.success('CSV exported successfully!')
}

function exportXLSX() {
  const ws = XLSX.utils.json_to_sheet(filteredStories.value)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'UserStories')
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'user_stories.xlsx')
  message.success('XLSX exported successfully!')
}

function parsePointDistribution(description, assignees, totalPoints) {
  if (!assignees || assignees.length === 0) return [];

  // Find all @mentions with points (e.g., @username 2.5)
  const pointPattern = /@(\w+)\s*(\d+(?:\.\d+)?)/gi;
  const mentions = [];
  let match;
  while ((match = pointPattern.exec(description || "")) !== null) {
      mentions.push([match[1].toLowerCase().trim(), parseFloat(match[2])]);
  }
  const mentionedUsers = {};
  mentions.forEach(([username, points]) => {
      mentionedUsers[username] = points;
  });

  const pointDistribution = {};
  // Try to match mentioned usernames with assignees
  assignees.forEach(assignee => {
      let matched = false;
      const assigneeUsername = assignee.username.toLowerCase().trim();
      // Try exact match first
      if (mentionedUsers[assigneeUsername] !== undefined) {
          pointDistribution[assignee.display] = mentionedUsers[assigneeUsername];
          matched = true;
      } else {
          // Try partial match
          for (const mentioned in mentionedUsers) {
              if (assigneeUsername.includes(mentioned)) {
                  pointDistribution[assignee.display] = mentionedUsers[mentioned];
                  matched = true;
                  break;
              }
          }
      }
      if (!matched) pointDistribution[assignee.display] = null;
  });

  // Calculate remaining points for unmatched assignees
  const assignedPoints = Object.values(pointDistribution)
      .filter(p => p !== null)
      .reduce((a, b) => a + b, 0);
  const unassignedUsers = Object.entries(pointDistribution)
      .filter(([_, p]) => p === null)
      .map(([u]) => u);

  if (unassignedUsers.length && assignedPoints < totalPoints) {
      const remainingPoints = totalPoints - assignedPoints;
      const pointsPerRemaining = remainingPoints / unassignedUsers.length;
      unassignedUsers.forEach(user => {
          pointDistribution[user] = Math.round(pointsPerRemaining * 100) / 100;
      });
  } else if (unassignedUsers.length) {
      unassignedUsers.forEach(user => {
          pointDistribution[user] = 0.0;
      });
  }

  // If no specific distribution, divide equally
  if (!mentions.length) {
      const pointsPerAssignee = totalPoints / assignees.length;
      assignees.forEach(a => (pointDistribution[a.display] = Math.round(pointsPerAssignee * 100) / 100));
  }

  // Return array of {display, points} for sorting
  return assignees.map(a => ({ display: a.display, points: Math.round((pointDistribution[a.display] || 0) * 100) / 100 }));
}

function extractSprintNumber(sprintName) {
  const match = sprintName.match(/#(\d+)/);
  return match ? match[1] : '';
}
</script>

<style scoped>
.custom-user-stories-table .n-data-table-th {
  background: #2563eb !important; /* blue-600 */
  color: #fff !important;
  font-weight: bold;
}
.custom-user-stories-table .n-data-table-tr:nth-child(even) {
  background: #e0e7ff !important; /* blue-100 */
}
.custom-user-stories-table .n-data-table-tr:nth-child(odd) {
  background: #f8fafc !important; /* fallback for odd rows */
}
</style>