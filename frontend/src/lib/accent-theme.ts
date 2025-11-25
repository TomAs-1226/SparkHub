const STORAGE_KEY = 'sparkhub:accent-color'

export type AccentOption = {
    label: string
    value: string
    glow?: string
}

export const ACCENT_OPTIONS: AccentOption[] = [
    { label: 'Indigo Pulse', value: '#2b2e83', glow: '0 12px 40px -18px rgba(43, 46, 131, 0.55)' },
    { label: 'Seafoam', value: '#2d8f80', glow: '0 12px 40px -18px rgba(45, 143, 128, 0.55)' },
    { label: 'Sunrise', value: '#f97316', glow: '0 12px 40px -18px rgba(249, 115, 22, 0.55)' },
    { label: 'Candy', value: '#ec4899', glow: '0 12px 40px -18px rgba(236, 72, 153, 0.55)' },
    { label: 'Lagoon', value: '#0891b2', glow: '0 12px 40px -18px rgba(8, 145, 178, 0.55)' },
    { label: 'Forest', value: '#15803d', glow: '0 12px 40px -18px rgba(21, 128, 61, 0.55)' },
    { label: 'Velvet', value: '#7c3aed', glow: '0 12px 40px -18px rgba(124, 58, 237, 0.55)' },
    { label: 'Tidal', value: '#0ea5e9', glow: '0 12px 40px -18px rgba(14, 165, 233, 0.55)' },
    { label: 'Amberglass', value: '#f59e0b', glow: '0 12px 40px -18px rgba(245, 158, 11, 0.55)' },
    { label: 'Rosewood', value: '#be123c', glow: '0 12px 40px -18px rgba(190, 18, 60, 0.55)' },
]

export function applyAccent(option: AccentOption) {
    if (typeof document === 'undefined') return
    document.documentElement.style.setProperty('--sh-accent', option.value)
    document.documentElement.style.setProperty('--sh-accent-soft', `${option.value}1a`)
    document.documentElement.style.setProperty('--sh-accent-glass', `${option.value}14`)
    document.documentElement.style.setProperty('--sh-accent-ink', `${option.value}cc`)
    document.documentElement.style.setProperty('--sh-accent-contrast', '#ffffff')
    document.documentElement.style.setProperty('--sh-card-glow', option.glow || '0 10px 50px -24px rgba(0,0,0,0.3)')
    localStorage.setItem(STORAGE_KEY, JSON.stringify(option))
}

export function loadAccent(): AccentOption | null {
    if (typeof window === 'undefined') return null
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    try {
        return JSON.parse(raw) as AccentOption
    } catch (_err) {
        return null
    }
}
