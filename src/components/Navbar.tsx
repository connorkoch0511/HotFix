'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton, OrganizationSwitcher } from '@clerk/nextjs'
import type { Profile } from '@/lib/types'
import { Flame, LayoutDashboard, Ticket, ShieldCheck, Settings2 } from 'lucide-react'

export default function Navbar({ profile }: { profile: Profile }) {
  const pathname = usePathname()

  const nav = [
    { href: '/',        label: 'Dashboard', icon: LayoutDashboard },
    { href: '/tickets', label: 'Tickets',   icon: Ticket },
    ...(profile.role === 'admin'
      ? [
          { href: '/admin',                   label: 'Admin',    icon: ShieldCheck },
          { href: '/settings/organization',   label: 'Settings', icon: Settings2   },
        ]
      : []),
  ]

  return (
    <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 text-gray-100 font-semibold">
              <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-red-600">
                <Flame className="h-4 w-4 text-white" />
              </div>
              HotFix
            </Link>

            <nav className="flex items-center gap-1">
              {nav.map(({ href, label, icon: Icon }) => {
                const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      active
                        ? 'bg-gray-800 text-gray-100'
                        : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800/50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <OrganizationSwitcher
              hidePersonal
              afterCreateOrganizationUrl="/"
              afterSelectOrganizationUrl="/"
              appearance={{
                elements: {
                  rootBox: 'flex items-center',
                  organizationSwitcherTrigger: 'text-sm text-gray-300 hover:text-gray-100 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg px-3 py-1.5 transition-colors',
                },
              }}
            />
            <UserButton />
          </div>
        </div>
      </div>
    </header>
  )
}
