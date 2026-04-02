import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { ClassDoc, TeacherDoc, ClassGoalDoc } from '../types'

export function useCreateTeacher() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { displayName: string; email: string; theme: 'dark' | 'light' }) =>
      apiFetch<TeacherDoc>('/api/teacher/me', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (data) => {
      qc.setQueryData(['teacher', 'me'], data)
    },
  })
}

export function useUpdateTeacher() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { displayName?: string; theme?: 'dark' | 'light' }) =>
      apiFetch<TeacherDoc>('/api/teacher/me', { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: (data) => {
      qc.setQueryData(['teacher', 'me'], data)
    },
  })
}

export function useCreateClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; gridConfig?: { rows: number; cols: number } }) =>
      apiFetch<ClassDoc>('/api/teacher/class', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher', 'me'] })
    },
  })
}

export function useUpdateClass(classId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      name?: string
      gridConfig?: { rows: number; cols: number }
      deskPositions?: Record<string, { col: number; row: number }>
    }) =>
      apiFetch<ClassDoc>(`/api/teacher/class/${classId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students', classId] })
    },
  })
}

export function useDeleteClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (classId: string) =>
      apiFetch(`/api/teacher/class/${classId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher', 'me'] })
    },
  })
}

export function useAddStudents(classId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (studentIds: string[]) =>
      apiFetch<ClassDoc>(`/api/teacher/class/${classId}/students`, {
        method: 'POST',
        body: JSON.stringify({ studentIds }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students', classId] })
    },
  })
}

export function useRemoveStudent(classId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch(`/api/teacher/class/${classId}/students/${userId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students', classId] })
    },
  })
}

export function useInviteStudent() {
  return useMutation({
    mutationFn: (data: { email: string; displayName?: string }) =>
      apiFetch<{ uid: string; email: string }>('/api/teacher/student/invite', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (email: string) =>
      apiFetch('/api/teacher/student/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
  })
}

export function useSetGoal(classId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      topics: Array<{ leitidee: string; thema: string; unterthema: string }>
      examDate: string | null
    }) =>
      apiFetch<ClassGoalDoc>(`/api/teacher/class/${classId}/goal`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['analytics', classId] })
    },
  })
}
