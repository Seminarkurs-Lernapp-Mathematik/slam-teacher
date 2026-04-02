import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'
import type {
  TeacherDoc,
  ClassDoc,
  StudentSummary,
  AnalyticsResponse,
  FeedResponse,
} from '../types'

export function useTeacher() {
  return useQuery({
    queryKey: ['teacher', 'me'],
    queryFn: () => apiFetch<TeacherDoc>('/api/teacher/me'),
    retry: false,
  })
}

export function useClasses(classIds: string[]) {
  return useQuery({
    queryKey: ['classes', classIds],
    queryFn: async () => {
      const results = await Promise.all(
        classIds.map((id) => apiFetch<ClassDoc>(`/api/teacher/class/${id}`))
      )
      return results
    },
    enabled: classIds.length > 0,
  })
}

export function useStudents(classId: string | null, refetchInterval = 30_000) {
  return useQuery({
    queryKey: ['students', classId],
    queryFn: () => apiFetch<StudentSummary[]>(`/api/teacher/class/${classId}/students`),
    enabled: !!classId,
    refetchInterval,
  })
}

export function useAnalytics(classId: string | null) {
  return useQuery({
    queryKey: ['analytics', classId],
    queryFn: () => apiFetch<AnalyticsResponse>(`/api/teacher/class/${classId}/analytics`),
    enabled: !!classId,
    staleTime: 60_000,
  })
}

export function useClassFeed(classId: string | null) {
  return useQuery({
    queryKey: ['feed', classId],
    queryFn: () => apiFetch<FeedResponse>(`/api/teacher/class/${classId}/feed`),
    enabled: !!classId,
  })
}

export function useAiAssessment(userId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['ai-assessment', userId],
    queryFn: () =>
      apiFetch<{ assessment: string; generatedAt: string }>(
        `/api/teacher/student/${userId}/ai-assessment`,
        { method: 'POST' }
      ),
    enabled: !!userId && enabled,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
