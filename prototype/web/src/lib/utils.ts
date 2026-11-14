import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Files in public/ are served under the build base (/assets/web/ inside the Android WebView), never the origin root.
export function publicAsset(path: string) {
  return import.meta.env.BASE_URL + path.replace(/^\//u, '')
}
