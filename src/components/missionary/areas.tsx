'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, MapPin, Users, Trash2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import type { Zone, Area, Companionship } from '@/lib/types'
import { MISSIONARY_TYPE_LABELS, MISSIONARY_ROLE_LABELS, formatDate } from '@/lib/labels'

type MissionaryDraft = {
  firstName: string
  lastName: string
  type: 'ELDER' | 'HERMANA' | 'PAREJA'
  role: 'LIDER' | 'SENIOR' | 'JUNIOR'
  phone?: string
}

export function AreasTab() {
  const [zones, setZones] = useState<Zone[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog states
  const [zoneDialog, setZoneDialog] = useState(false)
  const [areaDialog, setAreaDialog] = useState(false)
  const [compDialog, setCompDialog] = useState<Area | null>(null)

  const [newZone, setNewZone] = useState({ name: '', description: '' })
  const [newArea, setNewArea] = useState({ name: '', zoneId: '' })
  const [missionaries, setMissionaries] = useState<MissionaryDraft[]>([
    { firstName: '', lastName: '', type: 'ELDER', role: 'LIDER' },
    { firstName: '', lastName: '', type: 'ELDER', role: 'JUNIOR' },
  ])

  const load = async () => {
    setLoading(true)
    try {
      const [zr, ar] = await Promise.all([fetch('/api/zones'), fetch('/api/areas')])
      if (zr.ok) setZones(await zr.json())
      if (ar.ok) setAreas(await ar.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const createZone = async () => {
    if (!newZone.name.trim()) return toast.error('Nombre de zona requerido')
    const r = await fetch('/api/zones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newZone),
    })
    if (r.ok) {
      toast.success('Zona creada')
      setNewZone({ name: '', description: '' })
      setZoneDialog(false)
      load()
    } else {
      toast.error('Error al crear zona')
    }
  }

  const createArea = async () => {
    if (!newArea.name.trim() || !newArea.zoneId) return toast.error('Nombre y zona son requeridos')
    const r = await fetch('/api/areas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newArea),
    })
    if (r.ok) {
      toast.success('Área creada')
      setNewArea({ name: '', zoneId: '' })
      setAreaDialog(false)
      load()
    } else {
      toast.error('Error al crear área')
    }
  }

  const deleteArea = async (id: string) => {
    if (!confirm('¿Eliminar esta área y todos sus investigadores? Esta acción no se puede deshacer.')) return
    const r = await fetch(`/api/areas/${id}`, { method: 'DELETE' })
    if (r.ok) {
      toast.success('Área eliminada')
      load()
    } else {
      toast.error('Error al eliminar')
    }
  }

  const createCompanionship = async () => {
    if (!compDialog) return
    const valid = missionaries.filter((m) => m.firstName.trim() && m.lastName.trim())
    if (valid.length === 0) return toast.error('Agrega al menos un misionero')
    if (valid.length < 2) return toast.error('Una compañía requiere al menos 2 misioneros')

    const r = await fetch('/api/companionships', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ areaId: compDialog.id, missionaries: valid }),
    })
    if (r.ok) {
      toast.success('Compañía asignada al área')
      setCompDialog(null)
      setMissionaries([
        { firstName: '', lastName: '', type: 'ELDER', role: 'LIDER' },
        { firstName: '', lastName: '', type: 'ELDER', role: 'JUNIOR' },
      ])
      load()
    } else {
      toast.error('Error al asignar compañía')
    }
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Zonas y Áreas</h2>
          <p className="text-sm text-stone-500">
            Organiza las zonas de la ciudad y las áreas misionales con sus compañeros asignados.
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={zoneDialog} onOpenChange={setZoneDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" /> Zona
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva zona</DialogTitle>
                <DialogDescription>Crea una zona de la ciudad (Norte, Sur, Centro, etc.)</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div>
                  <Label htmlFor="zn">Nombre</Label>
                  <Input id="zn" value={newZone.name} onChange={(e) => setNewZone({ ...newZone, name: e.target.value })} placeholder="Zona Norte" />
                </div>
                <div>
                  <Label htmlFor="zd">Descripción (opcional)</Label>
                  <Input id="zd" value={newZone.description} onChange={(e) => setNewZone({ ...newZone, description: e.target.value })} placeholder="Colonias del norte de la ciudad" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setZoneDialog(false)}>Cancelar</Button>
                <Button onClick={createZone}>Crear zona</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={areaDialog} onOpenChange={setAreaDialog}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={zones.length === 0}>
                <Plus className="h-4 w-4 mr-1" /> Área
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva área misional</DialogTitle>
                <DialogDescription>Asigna el área a una zona existente</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div>
                  <Label htmlFor="an">Nombre del área</Label>
                  <Input id="an" value={newArea.name} onChange={(e) => setNewArea({ ...newArea, name: e.target.value })} placeholder="Área Centro Histórico" />
                </div>
                <div>
                  <Label>Zona</Label>
                  <Select value={newArea.zoneId} onValueChange={(v) => setNewArea({ ...newArea, zoneId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona zona" />
                    </SelectTrigger>
                    <SelectContent>
                      {zones.map((z) => (
                        <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAreaDialog(false)}>Cancelar</Button>
                <Button onClick={createArea}>Crear área</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {zones.length === 0 && !loading && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-stone-500">
            Aún no hay zonas. Crea la primera zona para empezar a organizar las áreas misionales.
          </CardContent>
        </Card>
      )}

      {/* Lista por zona */}
      <div className="space-y-6">
        {zones.map((z) => {
          const zoneAreas = areas.filter((a) => a.zoneId === z.id)
          return (
            <div key={z.id}>
              <div className="flex items-baseline gap-2 mb-3">
                <h3 className="text-lg font-semibold text-stone-800">{z.name}</h3>
                <span className="text-xs text-stone-500">
                  {zoneAreas.length} {zoneAreas.length === 1 ? 'área' : 'áreas'}
                </span>
              </div>
              {zoneAreas.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-6 text-center text-sm text-stone-400">
                    Sin áreas en esta zona todavía.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {zoneAreas.map((a) => {
                    const activeComp = a.companionships?.find((c) => c.active) || a.companionships?.[0]
                    return (
                      <Card key={a.id} className="group relative">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-rose-500" />
                              {a.name}
                            </CardTitle>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-stone-400 hover:text-rose-600"
                              onClick={() => deleteArea(a.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="text-xs text-stone-500 flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {a._count?.investigators || 0} investigadores
                          </div>

                          {activeComp ? (
                            <div className="space-y-1">
                              <div className="text-xs text-stone-500 uppercase tracking-wide">Compañía actual</div>
                              <div className="rounded-lg bg-stone-50 border border-stone-200 p-2.5">
                                <div className="font-medium text-sm">
                                  {activeComp.missionaires?.map((m) => m.fullName).join(' + ') || '—'}
                                </div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {activeComp.missionaires?.map((m) => (
                                    <Badge key={m.id} variant="outline" className="text-[10px] font-normal">
                                      {MISSIONARY_TYPE_LABELS[m.type]} · {MISSIONARY_ROLE_LABELS[m.role]}
                                    </Badge>
                                  ))}
                                </div>
                                <div className="text-[10px] text-stone-400 mt-1">
                                  Desde {formatDate(activeComp.startDate)}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-stone-400 italic py-1">Sin compañía asignada</div>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => setCompDialog(a)}
                          >
                            <UserPlus className="h-3.5 w-3.5 mr-1" />
                            {activeComp ? 'Reasignar compañía' : 'Asignar compañía'}
                          </Button>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Dialogo para asignar compañía */}
      <Dialog open={!!compDialog} onOpenChange={(o) => !o && setCompDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Asignar compañía — {compDialog?.name}</DialogTitle>
            <DialogDescription>
              Los misioneros anteriores quedarán como inactivos. Ingresa los datos de la nueva compañía.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto py-2">
            {missionaries.map((m, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end border-b border-stone-100 pb-3">
                <div className="md:col-span-3">
                  <Label className="text-xs">Nombre</Label>
                  <Input value={m.firstName} onChange={(e) => {
                    const copy = [...missionaries]
                    copy[idx] = { ...m, firstName: e.target.value }
                    setMissionaries(copy)
                  }} placeholder="Juan" />
                </div>
                <div className="md:col-span-3">
                  <Label className="text-xs">Apellido</Label>
                  <Input value={m.lastName} onChange={(e) => {
                    const copy = [...missionaries]
                    copy[idx] = { ...m, lastName: e.target.value }
                    setMissionaries(copy)
                  }} placeholder="Pérez" />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">Tipo</Label>
                  <Select value={m.type} onValueChange={(v: 'ELDER' | 'HERMANA' | 'PAREJA') => {
                    const copy = [...missionaries]
                    copy[idx] = { ...m, type: v }
                    setMissionaries(copy)
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(['ELDER', 'HERMANA', 'PAREJA'] as const).map((t) => (
                        <SelectItem key={t} value={t}>{MISSIONARY_TYPE_LABELS[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">Rol</Label>
                  <Select value={m.role} onValueChange={(v: 'LIDER' | 'SENIOR' | 'JUNIOR') => {
                    const copy = [...missionaries]
                    copy[idx] = { ...m, role: v }
                    setMissionaries(copy)
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(['LIDER', 'SENIOR', 'JUNIOR'] as const).map((r) => (
                        <SelectItem key={r} value={r}>{MISSIONARY_ROLE_LABELS[r]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  {missionaries.length > 2 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-600"
                      onClick={() => setMissionaries(missionaries.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMissionaries([...missionaries, { firstName: '', lastName: '', type: 'ELDER', role: 'JUNIOR' }])}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Agregar misionero
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompDialog(null)}>Cancelar</Button>
            <Button onClick={createCompanionship}>Asignar compañía</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
