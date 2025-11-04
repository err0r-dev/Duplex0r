import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
  Pressable,
} from 'react-native'
import type { ViewStyle } from 'react-native'
import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import {
  API_BASE,
  createSession,
  fetchSession,
  fetchSettings,
  interlaceFiles,
  logFrontendError,
  reorderFiles,
  resetSession,
  uploadFiles,
} from './api'
import { PdfPreview } from './components/PdfPreview'
import type { InterlaceResult, SessionFile, SettingsResponse, UUID } from './types'

interface SortableFileCardProps {
  file: SessionFile
  index: number
}

const cardShadow: ViewStyle = {
  shadowColor: '#020617',
  shadowOffset: { width: 0, height: 18 },
  shadowOpacity: 0.45,
  shadowRadius: 32,
  elevation: 12,
}

function SortableFileCard({ file, index }: SortableFileCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: file.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: isDragging ? 'grabbing' : 'grab',
  }

  return (
    <div ref={setNodeRef} style={{ ...style, marginBottom: 24 }}>
      <div {...attributes} {...listeners} style={{ display: 'block' }}>
        <View
          style={[
            {
              borderRadius: 24,
              padding: 20,
              backgroundColor: 'var(--color-surface)',
              borderWidth: 1,
              borderColor: 'rgba(148, 163, 184, 0.25)',
              gap: 16,
            },
            cardShadow,
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 38,
                height: 38,
              borderRadius: 12,
              backgroundColor: 'rgba(56, 189, 248, 0.2)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(56, 189, 248, 0.45)',
            }}
          >
            <Text style={{ color: 'var(--color-accent)', fontWeight: '600' }}>{index + 1}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: 'var(--color-text)' }}>
              {file.original_filename}
            </Text>
            <Text style={{ color: 'var(--color-muted)', fontSize: 13 }}>
              {(file.file_size / 1024).toFixed(1)} KB
            </Text>
          </View>
          </View>
          <PdfPreview label="Preview" source={file.preview_url} />
        </View>
      </div>
    </div>
  )
}

interface BannerProps {
  intent: 'info' | 'success' | 'danger'
  message: string
  onDismiss: () => void
}

function Banner({ intent, message, onDismiss }: BannerProps) {
  const background = useMemo(() => {
    if (intent === 'success') return 'rgba(22, 163, 74, 0.18)'
    if (intent === 'danger') return 'rgba(239, 68, 68, 0.18)'
    return 'rgba(56, 189, 248, 0.18)'
  }, [intent])

  return (
    <View
      style={{
        padding: 16,
        borderRadius: 18,
        backgroundColor: background,
        borderWidth: 1,
        borderColor:
          intent === 'danger'
            ? 'rgba(239, 68, 68, 0.45)'
            : intent === 'success'
            ? 'rgba(22, 163, 74, 0.35)'
            : 'rgba(56, 189, 248, 0.35)',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <Text style={{ flex: 1, color: 'var(--color-text)', fontSize: 14 }}>{message}</Text>
      <Pressable
        onPress={onDismiss}
        style={({ pressed }) => ({
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 12,
          backgroundColor: pressed
            ? 'rgba(15, 23, 42, 0.45)'
            : 'rgba(15, 23, 42, 0.25)',
        })}
      >
        <Text style={{ color: 'var(--color-muted)', fontSize: 12 }}>Close</Text>
      </Pressable>
    </View>
  )
}

function App() {
  const [sessionId, setSessionId] = useState<UUID | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)
  const [settings, setSettings] = useState<SettingsResponse | null>(null)
  const [files, setFiles] = useState<SessionFile[]>([])
  const [orderDirty, setOrderDirty] = useState(false)
  const [resultName, setResultName] = useState('interlaced.pdf')
  const [result, setResult] = useState<InterlaceResult | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isInterlacing, setIsInterlacing] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'workspace' | 'settings'>('workspace')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    document.body.dataset.theme = theme
  }, [theme])

  const captureError = useCallback(
    (message: string, error: unknown, location: string) => {
      const errorObject = error instanceof Error ? error : new Error(String(error))
      setErrorMessage(message)
      setStatusMessage(null)
      void logFrontendError({
        session_id: sessionId,
        location,
        message: errorObject.message,
        stack: errorObject.stack,
        metadata: { detail: message },
      })
    },
    [sessionId],
  )

  useEffect(() => {
    const bootstrap = async () => {
      try {
        setIsLoadingSession(true)
        const sessionResponse = await createSession()
        setSessionId(sessionResponse.id)
        const detail = await fetchSession(sessionResponse.id)
        setFiles(detail.files)
      } catch (error) {
        captureError('Unable to start a new session.', error, 'bootstrap')
      } finally {
        setIsLoadingSession(false)
      }
    }

    void bootstrap()
  }, [captureError])

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const currentSettings = await fetchSettings()
        setSettings(currentSettings)
      } catch (error) {
        captureError('Unable to load settings.', error, 'settings')
      }
    }

    void loadSettings()
  }, [captureError])

  const handleFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!sessionId) return
    const selected = Array.from(event.target.files ?? [])
    if (selected.length !== 2) {
      setErrorMessage('Please choose exactly two PDF files to continue.')
      return
    }

    setErrorMessage(null)
    setStatusMessage(null)
    setIsUploading(true)
    try {
      const detail = await uploadFiles(sessionId, selected)
      setFiles(detail.files)
      setOrderDirty(false)
      setResult(null)
      setResultName('interlaced.pdf')
      setStatusMessage('Files uploaded successfully. Drag to adjust their order.')
    } catch (error) {
      captureError('Uploading the PDFs failed.', error, 'upload')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) {
        return
      }

      setFiles((current) => {
        const oldIndex = current.findIndex((file) => file.id === active.id)
        const newIndex = current.findIndex((file) => file.id === over.id)
        if (oldIndex === -1 || newIndex === -1) {
          return current
        }
        const reordered = arrayMove(current, oldIndex, newIndex)
        setOrderDirty(true)
        return reordered
      })
    },
    [],
  )

  const handleConfirmOrder = async () => {
    if (!sessionId || files.length === 0) {
      return
    }
    setIsConfirming(true)
    setErrorMessage(null)
    try {
      const detail = await reorderFiles(
        sessionId,
        files.map((file) => file.id),
      )
      setFiles(detail.files)
      setOrderDirty(false)
      setStatusMessage('Order saved. You can now generate the interlaced PDF.')
    } catch (error) {
      captureError('We could not update the order.', error, 'reorder')
    } finally {
      setIsConfirming(false)
    }
  }

  const handleInterlace = async () => {
    if (!sessionId || files.length !== 2) {
      return
    }
    setIsInterlacing(true)
    setErrorMessage(null)
    try {
      const payloadName = resultName.trim() || 'interlaced.pdf'
      const response = await interlaceFiles(sessionId, {
        file_order: files.map((file) => file.id),
        desired_name: payloadName,
      })
      setResult(response)
      setStatusMessage('Interlacing complete. Preview and download your document below.')
    } catch (error) {
      captureError('Interlacing failed. Please try again.', error, 'interlace')
    } finally {
      setIsInterlacing(false)
    }
  }

  const handleReset = async () => {
    if (!sessionId) return
    setIsResetting(true)
    setErrorMessage(null)
    try {
      const detail = await resetSession(sessionId)
      setFiles(detail.files)
      setOrderDirty(false)
      setResult(null)
      setResultName('interlaced.pdf')
      setStatusMessage('Session reset. Upload two fresh PDFs to start again.')
    } catch (error) {
      captureError('Unable to reset the workspace.', error, 'reset')
    } finally {
      setIsResetting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const hasFiles = files.length === 2
  const downloadHref = useMemo(() => {
    if (!result) return null
    return `${API_BASE}${result.download_url}`
  }, [result])

  const isActionDisabled = !sessionId || !hasFiles

  const renderWorkspace = () => (
    <View style={{ gap: 28 }}>
      <View
        style={[
          {
            padding: 28,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            borderRadius: 28,
            borderWidth: 1,
            borderColor: 'rgba(148, 163, 184, 0.2)',
            gap: 24,
          },
          cardShadow,
        ]}
      >
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 24, fontWeight: '700' }}>Upload two PDFs</Text>
          <Text style={{ color: 'var(--color-muted)', fontSize: 15 }}>
            Drop or browse two PDF files to begin. You can drag them to adjust their order before interlacing.
          </Text>
        </View>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          multiple
          onChange={handleFilesSelected}
          style={{ display: 'none' }}
        />
        <Pressable
          onPress={() => fileInputRef.current?.click()}
          style={({ pressed }) => ({
            paddingVertical: 22,
            borderRadius: 24,
            borderWidth: 2,
            borderColor: pressed ? 'rgba(56, 189, 248, 0.6)' : 'rgba(56, 189, 248, 0.35)',
            borderStyle: 'dashed',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed
              ? 'rgba(56, 189, 248, 0.15)'
              : 'rgba(15, 23, 42, 0.45)',
          })}
        >
          {isUploading ? (
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <ActivityIndicator color="var(--color-accent)" />
              <Text style={{ color: 'var(--color-text)' }}>Uploading…</Text>
            </View>
          ) : (
            <View style={{ gap: 8, alignItems: 'center' }}>
              <Text style={{ fontWeight: '600', fontSize: 16 }}>Click to choose files</Text>
              <Text style={{ color: 'var(--color-muted)', fontSize: 13 }}>
                Supported format: PDF only • Exactly two files
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {files.length > 0 && (
        <View style={{ gap: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '700' }}>Arrange order</Text>
          <DndContext onDragEnd={handleDragEnd}>
            <SortableContext items={files.map((file) => file.id)} strategy={verticalListSortingStrategy}>
              {files.map((file, index) => (
                <SortableFileCard key={file.id} file={file} index={index} />
              ))}
            </SortableContext>
          </DndContext>
        </View>
      )}

      <View style={{
        flexDirection: 'row',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        <Pressable
          onPress={handleConfirmOrder}
          disabled={isActionDisabled || !orderDirty}
          style={({ pressed }) => ({
            paddingVertical: 14,
            paddingHorizontal: 24,
            borderRadius: 999,
            backgroundColor:
              isActionDisabled || !orderDirty
                ? 'rgba(148, 163, 184, 0.25)'
                : pressed
                ? 'rgba(56, 189, 248, 0.6)'
                : 'rgba(56, 189, 248, 0.85)',
          })}
        >
          <Text style={{ color: '#0f172a', fontWeight: '600' }}>
            {isConfirming ? 'Saving…' : 'Confirm order'}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleInterlace}
          disabled={isActionDisabled || orderDirty || isInterlacing}
          style={({ pressed }) => ({
            paddingVertical: 14,
            paddingHorizontal: 24,
            borderRadius: 999,
            backgroundColor:
              isActionDisabled || orderDirty
                ? 'rgba(148, 163, 184, 0.25)'
                : pressed
                ? 'rgba(59, 130, 246, 0.5)'
                : 'rgba(59, 130, 246, 0.85)',
          })}
        >
          <Text style={{ color: '#0f172a', fontWeight: '600' }}>
            {isInterlacing ? 'Interlacing…' : 'Interlace PDFs'}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleReset}
          disabled={!sessionId || isResetting}
          style={({ pressed }) => ({
            paddingVertical: 14,
            paddingHorizontal: 24,
            borderRadius: 999,
            backgroundColor: pressed ? 'rgba(248, 113, 113, 0.45)' : 'rgba(248, 113, 113, 0.3)',
          })}
        >
          <Text style={{ color: '#fee2e2', fontWeight: '600' }}>
            {isResetting ? 'Resetting…' : 'Reset workspace'}
          </Text>
        </Pressable>
      </View>

      {hasFiles && (
        <View style={{ gap: 16 }}>
          <Text style={{ fontWeight: '700', fontSize: 18 }}>Result name</Text>
          <TextInput
            value={resultName}
            onChangeText={setResultName}
            placeholder="interlaced.pdf"
            style={{
              paddingVertical: 14,
              paddingHorizontal: 18,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: 'rgba(148, 163, 184, 0.35)',
              backgroundColor: 'rgba(15, 23, 42, 0.55)',
              color: 'var(--color-text)',
            }}
          />
        </View>
      )}

      {result && (
        <View style={{ gap: 20 }}>
          <Text style={{ fontWeight: '700', fontSize: 20 }}>Interlaced result</Text>
          <PdfPreview label={resultName} source={result.preview_url} />
          <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
            {downloadHref && (
              <a
                href={downloadHref}
                download={resultName}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '14px 26px',
                  borderRadius: 999,
                  background: 'rgba(56, 189, 248, 0.9)',
                  color: '#0f172a',
                  fontWeight: 600,
                }}
              >
                Download PDF
              </a>
            )}
          </View>
        </View>
      )}
    </View>
  )

  const renderSettings = () => (
    <View
      style={[
        {
          padding: 28,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          borderRadius: 28,
          borderWidth: 1,
          borderColor: 'rgba(148, 163, 184, 0.2)',
          gap: 24,
        },
        cardShadow,
      ]}
    >
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Environment details</Text>
      <Text style={{ color: 'var(--color-muted)', fontSize: 15 }}>
        Database credentials are available below for quick reference during local development.
      </Text>
      <View style={{ gap: 12 }}>
        {settings ? (
          Object.entries(settings.database).map(([key, value]) => (
            <View
              key={key}
              style={{
                padding: 18,
                borderRadius: 18,
                backgroundColor: 'rgba(15, 23, 42, 0.55)',
                borderWidth: 1,
                borderColor: 'rgba(148, 163, 184, 0.2)',
              }}
            >
              <Text style={{ fontSize: 12, color: 'var(--color-muted)', textTransform: 'uppercase' }}>
                {key}
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '600' }}>{value}</Text>
            </View>
          ))
        ) : (
          <ActivityIndicator color="var(--color-accent)" />
        )}
      </View>
    </View>
  )

  if (isLoadingSession) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--color-bg)',
        }}
      >
        <ActivityIndicator color="var(--color-accent)" size="large" />
        <Text style={{ marginTop: 16, color: 'var(--color-muted)' }}>Preparing your workspace…</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          minHeight: '100%',
          paddingVertical: 48,
          paddingHorizontal: 24,
          maxWidth: 1200,
          width: '100%',
          marginHorizontal: 'auto',
        }}
      >
        <View style={{ gap: 32 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 32, fontWeight: '800' }}>Dupl3x</Text>
              <Text style={{ color: 'var(--color-muted)' }}>
                Interlace pages from two PDFs in a single, responsive workspace.
              </Text>
            </View>
            <Pressable
              onPress={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              style={({ pressed }) => ({
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 999,
                backgroundColor: pressed ? 'rgba(56, 189, 248, 0.45)' : 'rgba(56, 189, 248, 0.25)',
              })}
            >
              <Text style={{ color: 'var(--color-text)', fontWeight: '600' }}>
                Switch to {theme === 'dark' ? 'light' : 'dark'} mode
              </Text>
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
            <Pressable
              onPress={() => setActiveTab('workspace')}
              style={({ pressed }) => ({
                paddingVertical: 10,
                paddingHorizontal: 18,
                borderRadius: 999,
                backgroundColor:
                  activeTab === 'workspace'
                    ? 'rgba(56, 189, 248, 0.85)'
                    : pressed
                    ? 'rgba(148, 163, 184, 0.25)'
                    : 'rgba(15, 23, 42, 0.45)',
              })}
            >
              <Text style={{
                color: activeTab === 'workspace' ? '#0f172a' : 'var(--color-text)',
                fontWeight: '600',
              }}>
                Workspace
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('settings')}
              style={({ pressed }) => ({
                paddingVertical: 10,
                paddingHorizontal: 18,
                borderRadius: 999,
                backgroundColor:
                  activeTab === 'settings'
                    ? 'rgba(59, 130, 246, 0.85)'
                    : pressed
                    ? 'rgba(148, 163, 184, 0.25)'
                    : 'rgba(15, 23, 42, 0.45)',
              })}
            >
              <Text style={{
                color: activeTab === 'settings' ? '#0f172a' : 'var(--color-text)',
                fontWeight: '600',
              }}>
                Settings
              </Text>
            </Pressable>
          </View>

          {statusMessage && (
            <Banner intent="success" message={statusMessage} onDismiss={() => setStatusMessage(null)} />
          )}
          {errorMessage && (
            <Banner intent="danger" message={errorMessage} onDismiss={() => setErrorMessage(null)} />
          )}

          {activeTab === 'workspace' ? renderWorkspace() : renderSettings()}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default App
