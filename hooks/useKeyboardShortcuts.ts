import { useEffect, useCallback } from 'react'

type KeyboardShortcut = {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
  action: () => void
  description?: string
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean
  preventDefault?: boolean
}

export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const { enabled = true, preventDefault = true } = options

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    for (const shortcut of shortcuts) {
      const {
        key,
        ctrl = false,
        shift = false,
        alt = false,
        meta = false,
        action
      } = shortcut

      const isMatch =
        event.key.toLowerCase() === key.toLowerCase() &&
        event.ctrlKey === ctrl &&
        event.shiftKey === shift &&
        event.altKey === alt &&
        event.metaKey === meta

      if (isMatch) {
        if (preventDefault) {
          event.preventDefault()
        }
        action()
        break
      }
    }
  }, [shortcuts, enabled, preventDefault])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Return shortcuts for documentation purposes
  return shortcuts.map(({ action, ...shortcut }) => ({
    ...shortcut,
    description: shortcut.description || 'No description'
  }))
}

// Common shortcuts for the article editor
export function useArticleEditorShortcuts({
  onSave,
  onNew,
  onDelete,
  onToggleStatus,
  onExport,
  onSearch
}: {
  onSave?: () => void
  onNew?: () => void
  onDelete?: () => void
  onToggleStatus?: () => void
  onExport?: () => void
  onSearch?: () => void
}) {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 's',
      ctrl: true,
      action: () => onSave?.(),
      description: 'Save article'
    },
    {
      key: 'n',
      ctrl: true,
      action: () => onNew?.(),
      description: 'New article'
    },
    {
      key: 'd',
      ctrl: true,
      shift: true,
      action: () => onDelete?.(),
      description: 'Delete article'
    },
    {
      key: 'p',
      ctrl: true,
      action: () => onToggleStatus?.(),
      description: 'Toggle article status (draft/final)'
    },
    {
      key: 'e',
      ctrl: true,
      shift: true,
      action: () => onExport?.(),
      description: 'Export article'
    },
    {
      key: 'f',
      ctrl: true,
      action: () => onSearch?.(),
      description: 'Search articles'
    }
  ].filter(shortcut => shortcut.action !== undefined)

  return useKeyboardShortcuts(shortcuts)
}

// Chat-specific shortcuts
export function useChatShortcuts({
  onNewChat,
  onClearChat,
  onFocusInput,
  onToggleSidebar
}: {
  onNewChat?: () => void
  onClearChat?: () => void
  onFocusInput?: () => void
  onToggleSidebar?: () => void
}) {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'k',
      ctrl: true,
      action: () => onNewChat?.(),
      description: 'Start new chat'
    },
    {
      key: 'l',
      ctrl: true,
      shift: true,
      action: () => onClearChat?.(),
      description: 'Clear current chat'
    },
    {
      key: '/',
      action: () => onFocusInput?.(),
      description: 'Focus chat input'
    },
    {
      key: 'b',
      ctrl: true,
      action: () => onToggleSidebar?.(),
      description: 'Toggle sidebar'
    }
  ].filter(shortcut => shortcut.action !== undefined)

  return useKeyboardShortcuts(shortcuts)
}

// Global app shortcuts
export function useGlobalShortcuts({
  onToggleTheme,
  onOpenSettings,
  onOpenHelp
}: {
  onToggleTheme?: () => void
  onOpenSettings?: () => void
  onOpenHelp?: () => void
}) {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 't',
      ctrl: true,
      shift: true,
      action: () => onToggleTheme?.(),
      description: 'Toggle theme'
    },
    {
      key: ',',
      ctrl: true,
      action: () => onOpenSettings?.(),
      description: 'Open settings'
    },
    {
      key: '?',
      shift: true,
      action: () => onOpenHelp?.(),
      description: 'Open help'
    }
  ].filter(shortcut => shortcut.action !== undefined)

  return useKeyboardShortcuts(shortcuts)
}