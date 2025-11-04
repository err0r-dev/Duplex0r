import { useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { Document, Page, pdfjs } from 'react-pdf'

import type { StyleProp, ViewStyle } from 'react-native'

import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

import 'react-pdf/dist/Page/TextLayer.css'
import 'react-pdf/dist/Page/AnnotationLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc

interface PdfPreviewProps {
  label: string
  source: string
  style?: StyleProp<ViewStyle>
}

export function PdfPreview({ label, source, style }: PdfPreviewProps) {
  const [pageCount, setPageCount] = useState<number | null>(null)
  const [pageWidth, setPageWidth] = useState(320)

  return (
    <View
      style={[
        {
          gap: 12,
          padding: 16,
          backgroundColor: 'rgba(15, 23, 42, 0.55)',
          borderRadius: 20,
        },
        style,
      ]}
    >
      <Text style={{ fontSize: 16, fontWeight: '600', color: 'var(--color-text)' }}>{label}</Text>
      <View
        style={{
          position: 'relative',
          borderRadius: 14,
          overflow: 'hidden',
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          borderWidth: 1,
          borderColor: 'rgba(148, 163, 184, 0.35)',
        }}
      >
        <Document
          file={source}
          loading={
            <View style={{ padding: 24, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color="var(--color-accent)" />
            </View>
          }
          onLoadSuccess={({ numPages }) => setPageCount(numPages)}
          onLoadError={(error) => {
            console.error('Failed to load PDF preview', error)
          }}
        >
          <View
            style={{ padding: 16 }}
            onLayout={(event) => setPageWidth(event.nativeEvent.layout.width - 32)}
          >
            <Page pageNumber={1} width={pageWidth} renderAnnotationLayer={false} renderTextLayer={false} />
          </View>
        </Document>
      </View>
      {pageCount && (
        <Text style={{ color: 'var(--color-muted)', fontSize: 13 }}>{pageCount} pages detected</Text>
      )}
    </View>
  )
}
