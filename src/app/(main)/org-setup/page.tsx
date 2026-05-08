'use client'

import { CreateOrganization } from '@clerk/nextjs'
import { Flame, Mail, ArrowRight } from 'lucide-react'

export default function OrgSetupPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-10 px-4 py-12">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-red-600">
            <Flame className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-100">HotFix</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-100">Get started with HotFix</h1>
        <p className="text-sm text-gray-400 mt-1">Create a new organization or join an existing one.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 w-full max-w-5xl items-start">

        {/* ── Left: create org ── */}
        <div className="flex-1 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-100">Set up your organization</h2>
            <p className="text-sm text-gray-400 mt-1">
              IT admin? Create your company&apos;s HotFix workspace and invite your team.
            </p>
          </div>
          <CreateOrganization afterCreateOrganizationUrl="/" />
        </div>

        {/* ── Divider ── */}
        <div className="hidden lg:flex flex-col items-center self-stretch gap-3 py-8">
          <div className="flex-1 border-l border-gray-700" />
          <span className="text-xs text-gray-500 font-medium">OR</span>
          <div className="flex-1 border-l border-gray-700" />
        </div>
        <div className="flex lg:hidden items-center gap-3 w-full">
          <div className="flex-1 border-t border-gray-700" />
          <span className="text-xs text-gray-500 font-medium">OR</span>
          <div className="flex-1 border-t border-gray-700" />
        </div>

        {/* ── Right: join via invite ── */}
        <div className="flex-1 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-100">Joining an existing team?</h2>
            <p className="text-sm text-gray-400 mt-1">
              Ask your IT admin to invite you. Here&apos;s how it works:
            </p>
          </div>

          <div className="rounded-xl border border-gray-700 bg-gray-800/40 divide-y divide-gray-700">
            <div className="flex items-start gap-3 p-4">
              <div className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-lg bg-gray-700 text-xs font-bold text-gray-300">
                1
              </div>
              <div>
                <p className="text-sm font-medium text-gray-200">Admin sends you an invite</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  They go to <span className="text-gray-300">Settings → Organization</span> and enter your email.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4">
              <div className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-lg bg-gray-700">
                <Mail className="h-4 w-4 text-gray-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-200">Check your email</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Click the invitation link — it signs you in and adds you to the org automatically.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4">
              <div className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-lg bg-gray-700">
                <ArrowRight className="h-4 w-4 text-gray-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-200">Land on the dashboard</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  You&apos;ll see only your organization&apos;s tickets — no cross-company data.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
