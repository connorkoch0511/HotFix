'use client'

import { CreateOrganization } from '@clerk/nextjs'
import { Flame } from 'lucide-react'

export default function OrgSetupPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-4">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-red-600">
            <Flame className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-100">HotFix</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-100">Create your organization</h1>
        <p className="text-sm text-gray-400 max-w-sm">
          Tickets are scoped to an organization. Create one for your company or team to get started.
        </p>
      </div>

      <CreateOrganization afterCreateOrganizationUrl="/" />
    </div>
  )
}
