'use client'

import { create } from 'zustand'

type UiState = {
  mobileNavOpen: boolean
  composerOpen: boolean
  editingPostId: string | null
  searchOpen: boolean
  setMobileNavOpen: (open: boolean) => void
  setComposerOpen: (open: boolean) => void
  setEditingPostId: (id: string | null) => void
  setSearchOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  mobileNavOpen: false,
  composerOpen: false,
  editingPostId: null,
  searchOpen: false,
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
  setComposerOpen: (composerOpen) => set({ composerOpen }),
  setEditingPostId: (editingPostId) => set({ editingPostId }),
  setSearchOpen: (searchOpen) => set({ searchOpen })
}))
