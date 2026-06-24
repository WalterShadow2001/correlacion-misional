'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dashboard } from '@/components/missionary/dashboard'
import { AreasTab } from '@/components/missionary/areas'
import { InvestigatorsTab } from '@/components/missionary/investigators'
import { CorrelationTab } from '@/components/missionary/correlation'
import { CalendarTab } from '@/components/missionary/calendar'
import { GoalsTab } from '@/components/missionary/goals'
import { LayoutDashboard, MapPin, Users, ClipboardList, CalendarDays, Target, Church } from 'lucide-react'

export default function Home() {
  const [tab, setTab] = useState('dashboard')

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-stone-800 text-white flex items-center justify-center">
              <Church className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">Correlación Misional</h1>
              <p className="text-xs text-stone-500">Panel del líder misional de barrio</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-stone-400">
            <span className="px-2 py-1 rounded-md bg-stone-100">Obra de salvación</span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-6 h-auto">
            <TabsTrigger value="dashboard" className="flex items-center gap-1.5 py-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="areas" className="flex items-center gap-1.5 py-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Áreas</span>
            </TabsTrigger>
            <TabsTrigger value="investigators" className="flex items-center gap-1.5 py-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Investigadores</span>
            </TabsTrigger>
            <TabsTrigger value="correlation" className="flex items-center gap-1.5 py-2">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Correlación</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-1.5 py-2">
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Calendario</span>
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex items-center gap-1.5 py-2">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Metas</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <Dashboard />
          </TabsContent>
          <TabsContent value="areas" className="mt-6">
            <AreasTab />
          </TabsContent>
          <TabsContent value="investigators" className="mt-6">
            <InvestigatorsTab />
          </TabsContent>
          <TabsContent value="correlation" className="mt-6">
            <CorrelationTab />
          </TabsContent>
          <TabsContent value="calendar" className="mt-6">
            <CalendarTab />
          </TabsContent>
          <TabsContent value="goals" className="mt-6">
            <GoalsTab />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 text-xs text-stone-500 flex flex-wrap items-center justify-between gap-2">
          <div>
            Sistema de correlación misional — Herramienta local para líderes de barrio.
          </div>
          <div>
            “Y esta es la vida eterna: que te conozcan a ti, el único Dios verdadero, y a Jesucristo, a quien has enviado.” — Juan 17:3
          </div>
        </div>
      </footer>
    </div>
  )
}
