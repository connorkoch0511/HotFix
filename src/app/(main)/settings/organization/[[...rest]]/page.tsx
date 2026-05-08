'use client'

import { OrganizationProfile } from '@clerk/nextjs'

export default function OrganizationSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Organization Settings</h1>
        <p className="text-sm text-gray-400 mt-1">
          Manage members, send invitations, and configure your organization.
        </p>
      </div>

      <OrganizationProfile
        afterLeaveOrganizationUrl="/org-setup"
        appearance={{
          elements: {
            rootBox: 'w-full',
            card: 'bg-gray-900 border border-gray-800 shadow-none rounded-xl w-full max-w-full',
            navbar: 'border-r border-gray-800',
            navbarButton: 'text-gray-400 hover:text-gray-100',
            navbarButtonActive: 'text-gray-100 bg-gray-800',
            pageScrollBox: 'p-6',
            profileSectionTitle: 'text-gray-200',
            profileSectionContent: 'text-gray-400',
            formFieldLabel: 'text-gray-300',
            formFieldInput: 'bg-gray-800 border-gray-700 text-gray-100',
            badge: 'bg-gray-700 text-gray-300',
            tableHead: 'text-gray-400',
          },
        }}
      />
    </div>
  )
}
