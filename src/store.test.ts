import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from './store'

describe('useStore', () => {
  beforeEach(() => {
    useStore.setState({
      selectedClassId: null,
      beamerMode: false,
      theme: 'dark',
      activePanelStudentId: null,
      editMode: false,
    })
  })

  it('starts with no selected class', () => {
    expect(useStore.getState().selectedClassId).toBeNull()
  })

  it('setSelectedClassId updates selectedClassId', () => {
    useStore.getState().setSelectedClassId('class-abc')
    expect(useStore.getState().selectedClassId).toBe('class-abc')
  })

  it('setBeamerMode enables beamer mode', () => {
    useStore.getState().setBeamerMode(true)
    expect(useStore.getState().beamerMode).toBe(true)
  })

  it('setTheme switches to light', () => {
    useStore.getState().setTheme('light')
    expect(useStore.getState().theme).toBe('light')
  })

  it('setActivePanelStudentId sets the active student', () => {
    useStore.getState().setActivePanelStudentId('student-xyz')
    expect(useStore.getState().activePanelStudentId).toBe('student-xyz')
  })

  it('setEditMode activates edit mode', () => {
    useStore.getState().setEditMode(true)
    expect(useStore.getState().editMode).toBe(true)
  })
})
