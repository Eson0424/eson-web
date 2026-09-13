<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t } = useI18n()
</script>

<template>
  <AdminPlaceholder :title="t('admin.nav.messages')" />
</template>
