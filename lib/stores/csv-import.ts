import { create } from 'zustand'
import type {
  ImportEntityType,
  CSVColumn,
  ColumnMapping,
  ParsedRow,
  ImportProgress,
  ImportResult,
} from '../import/types'

export type ImportStep = 'upload' | 'mapping' | 'preview' | 'progress' | 'complete'

interface SavedMapping {
  entityType: ImportEntityType
  mappings: Record<string, string> // csvHeader -> targetField
}

interface CSVImportStore {
  // Current import state
  isOpen: boolean
  step: ImportStep
  entityType: ImportEntityType

  // CSV Data
  rawData: string[][]
  csvColumns: CSVColumn[]
  columnMappings: ColumnMapping[]

  // Parsed & validated data
  parsedRows: ParsedRow[]
  validRowCount: number
  errorRowCount: number
  warningRowCount: number

  // Progress tracking
  progress: ImportProgress
  result: ImportResult | null

  // Saved mappings (persisted)
  savedMappings: SavedMapping[]

  // Actions
  openImport: (entityType: ImportEntityType) => void
  closeImport: () => void
  setStep: (step: ImportStep) => void

  setRawData: (data: string[][]) => void
  setCSVColumns: (columns: CSVColumn[]) => void
  setColumnMappings: (mappings: ColumnMapping[]) => void
  updateColumnMapping: (csvIndex: number, targetField: string | null) => void

  setParsedRows: (rows: ParsedRow[]) => void
  setProgress: (progress: ImportProgress) => void
  setResult: (result: ImportResult) => void

  saveMappingForEntity: (entityType: ImportEntityType, mappings: ColumnMapping[]) => void
  getSavedMappingForEntity: (entityType: ImportEntityType) => Record<string, string> | null

  reset: () => void
}

const initialProgress: ImportProgress = {
  current: 0,
  total: 0,
  status: 'idle',
}

export const useCSVImportStore = create<CSVImportStore>((set, get) => ({
  isOpen: false,
  step: 'upload',
  entityType: 'category',

  rawData: [],
  csvColumns: [],
  columnMappings: [],

  parsedRows: [],
  validRowCount: 0,
  errorRowCount: 0,
  warningRowCount: 0,

  progress: initialProgress,
  result: null,

  savedMappings: [],

  openImport: (entityType) => {
    set({
      isOpen: true,
      entityType,
      step: 'upload',
      rawData: [],
      csvColumns: [],
      columnMappings: [],
      parsedRows: [],
      validRowCount: 0,
      errorRowCount: 0,
      warningRowCount: 0,
      progress: initialProgress,
      result: null,
    })
  },

  closeImport: () => {
    set({ isOpen: false })
  },

  setStep: (step) => {
    set({ step })
  },

  setRawData: (data) => {
    set({ rawData: data })
  },

  setCSVColumns: (columns) => {
    set({ csvColumns: columns })
  },

  setColumnMappings: (mappings) => {
    set({ columnMappings: mappings })
  },

  updateColumnMapping: (csvIndex, targetField) => {
    set((state) => ({
      columnMappings: state.columnMappings.map((m) =>
        m.csvIndex === csvIndex
          ? { ...m, targetField, isAutoMapped: false }
          : m
      ),
    }))
  },

  setParsedRows: (rows) => {
    const validRowCount = rows.filter((r) => r.isValid).length
    const errorRowCount = rows.filter((r) => r.errors.length > 0).length
    const warningRowCount = rows.filter((r) => r.warnings.length > 0 && r.errors.length === 0).length

    set({
      parsedRows: rows,
      validRowCount,
      errorRowCount,
      warningRowCount,
    })
  },

  setProgress: (progress) => {
    set({ progress })
  },

  setResult: (result) => {
    set({ result })
  },

  saveMappingForEntity: (entityType, mappings) => {
    const mappingRecord: Record<string, string> = {}
    mappings.forEach((m) => {
      if (m.targetField) {
        mappingRecord[m.csvColumn.toLowerCase()] = m.targetField
      }
    })

    set((state) => {
      const filtered = state.savedMappings.filter((m) => m.entityType !== entityType)
      return {
        savedMappings: [...filtered, { entityType, mappings: mappingRecord }],
      }
    })
  },

  getSavedMappingForEntity: (entityType) => {
    const saved = get().savedMappings.find((m) => m.entityType === entityType)
    return saved?.mappings ?? null
  },

  reset: () => {
    set({
      isOpen: false,
      step: 'upload',
      entityType: 'category',
      rawData: [],
      csvColumns: [],
      columnMappings: [],
      parsedRows: [],
      validRowCount: 0,
      errorRowCount: 0,
      warningRowCount: 0,
      progress: initialProgress,
      result: null,
    })
  },
}))
