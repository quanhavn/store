import jsPDF from 'jspdf'

let fontsLoaded = false
let regularFontBase64: string | null = null
let boldFontBase64: string | null = null

async function loadFont(url: string): Promise<string> {
  const response = await fetch(url)
  const arrayBuffer = await response.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export async function loadVietnameseFonts(): Promise<void> {
  if (fontsLoaded) return

  try {
    const [regular, bold] = await Promise.all([
      loadFont('/fonts/Roboto-Regular.ttf'),
      loadFont('/fonts/Roboto-Bold.ttf'),
    ])
    regularFontBase64 = regular
    boldFontBase64 = bold
    fontsLoaded = true
  } catch (error) {
    console.warn('Failed to load Vietnamese fonts, falling back to default:', error)
  }
}

export function addVietnameseFonts(doc: jsPDF): boolean {
  if (!fontsLoaded || !regularFontBase64 || !boldFontBase64) {
    return false
  }

  try {
    doc.addFileToVFS('Roboto-Regular.ttf', regularFontBase64)
    doc.addFileToVFS('Roboto-Bold.ttf', boldFontBase64)
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold')
    return true
  } catch (error) {
    console.warn('Failed to add Vietnamese fonts to PDF:', error)
    return false
  }
}

export function areFontsLoaded(): boolean {
  return fontsLoaded
}
