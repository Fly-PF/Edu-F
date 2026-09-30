<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createManagedCategory, deleteManagedCategory, listAuthoringSubjects, listManagedCategories, setManagedCategoryStatus } from '@/api/problemSolving'

const subjects = ref([]); const categories = ref([]); const total = ref(0); const pagination = reactive({ pageNum: 1, pageSize: 10 }); const form = reactive({ subjectId: null, name: '', description: '', sortOrder: 0 })
async function loadData() { const data = await listManagedCategories(pagination); categories.value = data.records || []; total.value = Number(data.total) || 0 }
function subjectName(subjectId) { return subjects.value.find(item => item.id === subjectId)?.name || '-' }
async function submit() { if (!form.subjectId || !form.name.trim()) return ElMessage.warning('请填写科目和分类名称'); try { await createManagedCategory(form); ElMessage.success('分类已创建并上架'); Object.assign(form, { subjectId: null, name: '', description: '', sortOrder: 0 }); pagination.pageNum = 1; await loadData() } catch (error) { ElMessage.error(error.message || '创建失败') } }
async function toggle(row) { try { await setManagedCategoryStatus(row.id, row.status === 1 ? 0 : 1); await loadData() } catch (error) { ElMessage.error(error.message || '更新失败') } }
async function remove(row) { try { await ElMessageBox.confirm(`确定删除分类“${row.name}”吗？仅当该分类下没有题目时才能删除。`, '删除分类', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }); await deleteManagedCategory(row.id); ElMessage.success('分类已删除'); if (categories.value.length === 1 && pagination.pageNum > 1) pagination.pageNum -= 1; await loadData() } catch (error) { if (error !== 'cancel' && error !== 'close') ElMessage.error(error.message || '删除失败') } }
function changePage(pageNum) { pagination.pageNum = pageNum; loadData() }
function changeSize(pageSize) { pagination.pageSize = pageSize; pagination.pageNum = 1; loadData() }
onMounted(() => Promise.all([listAuthoringSubjects().then(data => { subjects.value = data }), loadData()]).catch(error => ElMessage.error(error.message || '加载失败')))
</script>

<template>
  <main class="manage-page">
    <header><p>ADMIN · PROBLEM SOLVING</p><h1>题目分类</h1><span>按科目维护一级知识点大类及上下架状态。</span></header>
    <section class="editor"><h2>新增分类</h2><el-form inline><el-form-item label="科目"><el-select v-model="form.subjectId"><el-option v-for="item in subjects.filter(item => item.status === 1)" :key="item.id" :label="item.name" :value="item.id"/></el-select></el-form-item><el-form-item label="知识点大类"><el-input v-model="form.name"/></el-form-item><el-form-item label="说明"><el-input v-model="form.description"/></el-form-item><el-button type="primary" @click="submit">创建并上架</el-button></el-form></section>
    <section class="table-panel"><h2>分类管理</h2><el-table :data="categories" border><el-table-column label="科目" width="140"><template #default="{ row }">{{ subjectName(row.subjectId) }}</template></el-table-column><el-table-column prop="name" label="知识点大类"/><el-table-column prop="description" label="说明"/><el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '上架' : '下架' }}</el-tag></template></el-table-column><el-table-column label="操作" width="160"><template #default="{ row }"><el-button link :type="row.status === 1 ? 'warning' : 'success'" @click="toggle(row)">{{ row.status === 1 ? '下架' : '上架' }}</el-button><el-button link type="danger" @click="remove(row)">删除</el-button></template></el-table-column></el-table><div v-if="total" class="pagination-bar"><el-pagination v-model:current-page="pagination.pageNum" v-model:page-size="pagination.pageSize" :page-sizes="[10, 20, 50]" :total="total" layout="total, sizes, prev, pager, next, jumper" background @size-change="changeSize" @current-change="changePage"/></div></section>
  </main>
</template>

<style scoped>
.manage-page { padding: 28px; color: #25334d; }.manage-page header { margin-bottom: 20px; }.manage-page header p { margin: 0; color: #66758d; font-size: 12px; font-weight: 700; }.manage-page h1 { margin: 5px 0; font-size: 28px; }.manage-page header span { color: #64748b; }.editor,.table-panel { margin-top: 18px; padding: 20px; border: 1px solid #dce4ef; border-radius: 8px; background: #fff; }.editor h2,.table-panel h2 { margin: 0 0 18px; font-size: 18px; }.pagination-bar { display:flex; justify-content:flex-end; margin-top:18px; }@media(max-width:760px){.manage-page{padding:18px}.editor :deep(.el-form--inline .el-form-item){display:flex;margin-right:0}.editor :deep(.el-form--inline .el-form-item__content){flex:1}.editor :deep(.el-input),.editor :deep(.el-select){width:100%}.pagination-bar{justify-content:center;overflow-x:auto}}
</style>
