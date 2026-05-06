import { SignUp } from '@clerk/nextjs'
import { Flame } from 'lucide-react'

export default function SignUpPage() {
  return (
    <div className="w-full flex flex-col items-center gap-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-red-600 mb-4">
          <Flame className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-100">HotFix</h1>
        <p className="text-sm text-gray-500 mt-1">IT Helpdesk &amp; Ticketing</p>
      </div>
      <SignUp
        appearance={{
          variables: { colorPrimary: '#dc2626' },
          elements: {
            card: 'bg-gray-900 border border-gray-800 shadow-xl',
            headerTitle: 'text-gray-100',
            headerSubtitle: 'text-gray-400',
            socialButtonsBlockButton: 'bg-gray-800 border-gray-700 text-gray-100 hover:bg-gray-700',
            dividerLine: 'bg-gray-700',
            dividerText: 'text-gray-500',
            formFieldLabel: 'text-gray-300',
            formFieldInput: 'bg-gray-800 border-gray-700 text-gray-100',
            footerActionLink: 'text-red-400 hover:text-red-300',
          },
        }}
      />
    </div>
  )
}
