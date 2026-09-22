<script setup lang="ts">
/** 时间区间（统一日期范围选择器） */
import { ref } from 'vue';
import DateRangePicker from '../../components/DateRangePicker.vue';

const from = ref('');
const to = ref('');
</script>

<template>
  <DateRangePicker v-model:from="from" v-model:to="to" placeholder="请选择日期范围" />
</template>
