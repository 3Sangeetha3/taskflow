import { createContext, useContext } from 'react'

export const ToastContext = createContext(null)

// { success(message), error(message) }, provided by <ToastProvider>.
export const useToast = () => useContext(ToastContext)
