import type { ReactNode } from 'react'
import type { Note, User, Cluster, Document, SearchResult, UserPreferences } from './index'

// UI State Types
export interface UIState {
  theme: 'light' | 'dark' | 'system'
  sidebarOpen: boolean
  isLoading: boolean
  error: string | null
}

// Component Props Types
export interface BaseComponentProps {
  className?: string
  children?: ReactNode
}

export interface NoteCardProps extends BaseComponentProps {
  note: Note
  onEdit?: (note: Note) => void
  onDelete?: (noteId: string) => void
  onSelect?: (noteId: string) => void
  isSelected?: boolean
}

export interface NoteListProps extends BaseComponentProps {
  notes: Note[]
  onNoteSelect?: (note: Note) => void
  onNoteEdit?: (note: Note) => void
  onNoteDelete?: (noteId: string) => void
  loading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
}

export interface ClusterCardProps extends BaseComponentProps {
  cluster: Cluster
  onAccept?: (clusterId: string) => void
  onDismiss?: (clusterId: string) => void
  onView?: (clusterId: string) => void
}

export interface DocumentEditorProps extends BaseComponentProps {
  document?: Document
  onSave?: (document: Partial<Document>) => void
  onCancel?: () => void
  readOnly?: boolean
  autoSave?: boolean
}

export interface SearchBarProps extends BaseComponentProps {
  onSearch: (query: string) => void
  placeholder?: string
  loading?: boolean
  suggestions?: string[]
}

export interface SearchResultsProps extends BaseComponentProps {
  results: SearchResult[]
  query: string
  loading?: boolean
  onResultClick?: (result: SearchResult) => void
}

// Hook Types
export interface UseNotesOptions {
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface UseNotesReturn {
  notes: Note[]
  loading: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => void
  create: (content: string) => Promise<Note>
  update: (id: string, updates: Partial<Note>) => Promise<Note>
  delete: (id: string) => Promise<void>
  refresh: () => void
}

export interface UseSearchOptions {
  debounceMs?: number
  minQueryLength?: number
}

export interface UseSearchReturn {
  query: string
  results: SearchResult[]
  loading: boolean
  error: string | null
  search: (query: string) => void
  clear: () => void
}

export interface UseClustersReturn {
  clusters: Cluster[]
  suggestions: Cluster[]
  loading: boolean
  error: string | null
  accept: (clusterId: string) => Promise<void>
  dismiss: (clusterId: string) => Promise<void>
  refresh: () => void
}

export interface UseDocumentsReturn {
  documents: Document[]
  loading: boolean
  error: string | null
  create: (data: Partial<Document>) => Promise<Document>
  update: (id: string, updates: Partial<Document>) => Promise<Document>
  delete: (id: string) => Promise<void>
  refresh: () => void
}

// Form Types
export interface NoteFormData {
  content: string
  tags?: string[]
}

export interface DocumentFormData {
  title: string
  content: string
  status: 'draft' | 'published'
  tags?: string[]
}

export interface UserSettingsFormData {
  name?: string
  email?: string
  preferences: UserPreferences
}

export interface SearchFormData {
  query: string
  filters: {
    dateRange?: {
      from: Date
      to: Date
    }
    tags?: string[]
    type?: 'notes' | 'documents' | 'all'
  }
}

// Event Types
export interface NoteEvent {
  type: 'create' | 'update' | 'delete'
  noteId: string
  note?: Note
  timestamp: Date
}

export interface ClusterEvent {
  type: 'suggestion' | 'accepted' | 'dismissed'
  clusterId: string
  cluster?: Cluster
  timestamp: Date
}

export interface SearchEvent {
  type: 'search' | 'select_result'
  query?: string
  result?: SearchResult
  timestamp: Date
}

// Context Types
export interface AppContextType {
  user: User | null
  preferences: UserPreferences
  theme: 'light' | 'dark' | 'system'
  updatePreferences: (preferences: Partial<UserPreferences>) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
}

export interface NotesContextType {
  notes: Note[]
  selectedNote: Note | null
  loading: boolean
  error: string | null
  createNote: (content: string) => Promise<Note>
  updateNote: (id: string, updates: Partial<Note>) => Promise<Note>
  deleteNote: (id: string) => Promise<void>
  selectNote: (note: Note | null) => void
  refreshNotes: () => void
}

export interface SearchContextType {
  query: string
  results: SearchResult[]
  loading: boolean
  error: string | null
  search: (query: string) => void
  clearSearch: () => void
}

// Layout Types
export interface LayoutProps extends BaseComponentProps {
  sidebar?: ReactNode
  header?: ReactNode
  footer?: ReactNode
}

export interface SidebarProps extends BaseComponentProps {
  isOpen: boolean
  onToggle: () => void
  navigation: NavigationItem[]
}

export interface NavigationItem {
  id: string
  label: string
  href: string
  icon?: ReactNode
  badge?: string | number
  active?: boolean
}

// Modal Types
export interface ModalProps extends BaseComponentProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export interface ConfirmModalProps extends ModalProps {
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  variant?: 'default' | 'destructive'
}

// Toast Types
export interface ToastMessage {
  id: string
  title: string
  description?: string
  variant: 'default' | 'success' | 'error' | 'warning'
  duration?: number
}

export interface ToastContextType {
  toasts: ToastMessage[]
  addToast: (toast: Omit<ToastMessage, 'id'>) => void
  removeToast: (id: string) => void
  clearToasts: () => void
}

// Keyboard Shortcut Types
export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  description: string
  action: () => void
}

export interface ShortcutMap {
  [key: string]: KeyboardShortcut
}

// Animation Types
export interface AnimationProps {
  duration?: number
  delay?: number
  ease?: string
}

export interface FadeProps extends AnimationProps {
  in: boolean
}

export interface SlideProps extends AnimationProps {
  direction: 'up' | 'down' | 'left' | 'right'
  distance?: number
}

// Responsive Types
export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl'

export interface ResponsiveValue<T> {
  base?: T
  sm?: T
  md?: T
  lg?: T
  xl?: T
  '2xl'?: T
}

// Theme Types
export interface ThemeColors {
  primary: string
  secondary: string
  accent: string
  muted: string
  destructive: string
  background: string
  foreground: string
  border: string
  input: string
  ring: string
}

export interface ThemeConfig {
  colors: ThemeColors
  radius: number
  fonts: {
    sans: string
    mono: string
  }
}

// Utility Types for Components
export type AsChild<T = Record<string, never>> = T & {
  asChild?: boolean
}

export type Variant<T extends string> = {
  variant?: T
}

export type Size<T extends string> = {
  size?: T
}

export type Loading = {
  loading?: boolean
}

export type Disabled = {
  disabled?: boolean
}

// Export commonly used combinations
export type ButtonProps = BaseComponentProps &
  Variant<'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'> &
  Size<'default' | 'sm' | 'lg' | 'icon'> &
  AsChild &
  Loading &
  Disabled

export type InputProps = BaseComponentProps &
  Loading &
  Disabled & {
    placeholder?: string
    value?: string
    onChange?: (value: string) => void
    onFocus?: () => void
    onBlur?: () => void
    error?: string
  }

export type CardProps = BaseComponentProps & {
  title?: string
  description?: string
  action?: ReactNode
  footer?: ReactNode
}
