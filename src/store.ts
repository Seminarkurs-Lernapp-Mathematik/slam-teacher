import { create } from 'zustand'

interface AppState {
  selectedClassId: string | null
  beamerMode: boolean
  theme: 'dark' | 'light'
  activePanelStudentId: string | null
  editMode: boolean
  setSelectedClassId: (id: string | null) => void
  setBeamerMode: (v: boolean) => void
  setTheme: (v: 'dark' | 'light') => void
  setActivePanelStudentId: (id: string | null) => void
  setEditMode: (v: boolean) => void
}

export const useStore = create<AppState>((set) => ({
  selectedClassId: null,
  beamerMode: false,
  theme: 'dark',
  activePanelStudentId: null,
  editMode: false,
  setSelectedClassId: (id) => set({ selectedClassId: id }),
  setBeamerMode: (v) => set({ beamerMode: v }),
  setTheme: (v) => set({ theme: v }),
  setActivePanelStudentId: (id) => set({ activePanelStudentId: id }),
  setEditMode: (v) => set({ editMode: v }),
}))
