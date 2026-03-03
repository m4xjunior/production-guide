"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { adminFetch } from "@/lib/admin-api";
import { type Station } from "@/types";
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Loader2,
  RefreshCw,
  MoreHorizontal,
  Search,
  Factory,
  Power,
  PowerOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Station Form ─────────────────────────────────────────
interface StationFormProps {
  formName: string;
  setFormName: (v: string) => void;
  formDescription: string;
  setFormDescription: (v: string) => void;
  formProductCode: string;
  setFormProductCode: (v: string) => void;
  formIsActive: boolean;
  setFormIsActive: (v: boolean) => void;
}

function StationForm({
  formName, setFormName,
  formDescription, setFormDescription,
  formProductCode, setFormProductCode,
  formIsActive, setFormIsActive,
}: StationFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="station-name">Nombre *</Label>
        <Input
          id="station-name"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          placeholder="Ej: Estacion 1 - Montaje base"
          className="border-border"
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="station-desc">Descripcion</Label>
        <Textarea
          id="station-desc"
          value={formDescription}
          onChange={(e) => setFormDescription(e.target.value)}
          placeholder="Descripcion de la estacion..."
          rows={3}
          className="border-border"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="station-code">Codigo de producto</Label>
        <Input
          id="station-code"
          value={formProductCode}
          onChange={(e) => setFormProductCode(e.target.value)}
          placeholder="Ej: PROD-001"
          className="border-border"
        />
      </div>
      <div className="flex items-center gap-3">
        <Switch
          id="station-active"
          checked={formIsActive}
          onCheckedChange={setFormIsActive}
        />
        <Label htmlFor="station-active" className="text-foreground">
          Estacion activa
        </Label>
      </div>
    </div>
  );
}

export default function StationsPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formProductCode, setFormProductCode] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  const { toast } = useToast();

  // ─── Fetch ────────────────────────────────────────────
  const fetchStations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/api/stations");
      if (!res.ok) throw new Error("Error al cargar estaciones");
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.stations || [];
      setStations(list);
    } catch (err) {
      console.error("Error loading stations:", err);
      toast({
        title: "Error",
        description: "No se pudieron cargar las estaciones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  // ─── Helpers ──────────────────────────────────────────
  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormProductCode("");
    setFormIsActive(true);
  };

  const openCreate = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  const openEdit = (station: Station) => {
    setSelectedStation(station);
    setFormName(station.name);
    setFormDescription(station.description || "");
    setFormProductCode(station.productCode || "");
    setFormIsActive(station.isActive);
    setShowEditDialog(true);
  };

  const openDelete = (station: Station) => {
    setSelectedStation(station);
    setShowDeleteDialog(true);
  };

  // ─── CRUD ─────────────────────────────────────────────
  const handleCreate = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const res = await adminFetch("/api/stations", {
        method: "POST",
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || null,
          productCode: formProductCode.trim() || null,
          isActive: formIsActive,
        }),
      });
      if (!res.ok) throw new Error("Error al crear");
      setShowCreateDialog(false);
      toast({ title: "Estacion creada", description: `"${formName.trim()}" se ha creado correctamente.` });
      fetchStations();
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "No se pudo crear la estacion", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedStation || !formName.trim()) return;
    setSaving(true);
    try {
      const res = await adminFetch(`/api/stations/${selectedStation.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || null,
          productCode: formProductCode.trim() || null,
          isActive: formIsActive,
        }),
      });
      if (!res.ok) throw new Error("Error al editar");
      setShowEditDialog(false);
      toast({ title: "Estacion actualizada", description: `"${formName.trim()}" se ha guardado.` });
      fetchStations();
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "No se pudo actualizar la estacion", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedStation) return;
    setSaving(true);
    try {
      const res = await adminFetch(`/api/stations/${selectedStation.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Error al eliminar");
      setShowDeleteDialog(false);
      setSelectedStation(null);
      toast({ title: "Estacion eliminada", description: `"${selectedStation.name}" se ha eliminado.` });
      fetchStations();
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "No se pudo eliminar la estacion", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (station: Station) => {
    try {
      const res = await adminFetch(`/api/stations/${station.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: station.name,
          description: station.description,
          productCode: station.productCode,
          isActive: !station.isActive,
        }),
      });
      if (!res.ok) throw new Error("Error");
      toast({
        title: station.isActive ? "Estacion desactivada" : "Estacion activada",
        description: `"${station.name}" ahora esta ${station.isActive ? "inactiva" : "activa"}.`,
      });
      fetchStations();
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "No se pudo cambiar el estado", variant: "destructive" });
    }
  };

  // ─── Filter ───────────────────────────────────────────
  const filteredStations = stations.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.productCode && s.productCode.toLowerCase().includes(q)) ||
      (s.description && s.description.toLowerCase().includes(q))
    );
  });

  // ─── Render ───────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Estaciones</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona las estaciones de trabajo y sus configuraciones
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStations}
            disabled={loading}
            className="border-border w-full sm:w-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            Actualizar
          </Button>
          <Button
            size="sm"
            onClick={openCreate}
            className="bg-[#8B1A1A] hover:bg-[#A52525] w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            Nueva estacion
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" aria-hidden="true" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por nombre, codigo o descripcion..."
          className="pl-9 border-border"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#8B1A1A]" aria-hidden="true" />
        </div>
      ) : filteredStations.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-16 text-center">
            <Factory className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" aria-hidden="true" />
            {searchQuery ? (
              <>
                <p className="text-lg text-muted-foreground">
                  No se encontraron estaciones para &quot;{searchQuery}&quot;
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setSearchQuery("")}
                >
                  Limpiar busqueda
                </Button>
              </>
            ) : (
              <>
                <p className="text-lg text-muted-foreground">
                  No hay estaciones creadas todavia.
                </p>
                <Button
                  className="mt-4 bg-[#8B1A1A] hover:bg-[#A52525]"
                  onClick={openCreate}
                >
                  <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                  Crear primera estacion
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border">
          <div className="overflow-x-auto">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-accent/50">
                  <TableHead scope="col" className="text-muted-foreground font-semibold">Nombre</TableHead>
                  <TableHead scope="col" className="text-muted-foreground font-semibold">Codigo producto</TableHead>
                  <TableHead scope="col" className="text-muted-foreground font-semibold text-center">Pasos</TableHead>
                  <TableHead scope="col" className="text-muted-foreground font-semibold">Estado</TableHead>
                  <TableHead scope="col" className="text-muted-foreground font-semibold text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {filteredStations.map((station) => (
                <TableRow key={station.id} className="group hover:bg-accent">
                  <TableCell>
                    <Link
                      href={`/admin/stations/${station.id}`}
                      className="font-medium text-foreground hover:text-[#A52525] transition-colors"
                    >
                      {station.name}
                    </Link>
                    {station.description && (
                      <p className="text-xs text-muted-foreground/60 mt-0.5 line-clamp-1">
                        {station.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    {station.productCode ? (
                      <Badge variant="secondary" className="font-mono text-xs">
                        {station.productCode}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground/40">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="tabular-nums text-muted-foreground">
                      {station._count?.steps ?? 0}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={station.isActive ? "success" : "secondary"}
                      className="text-xs"
                    >
                      {station.isActive ? "Activa" : "Inactiva"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" asChild aria-label={`Ver estacion ${station.name}`}>
                        <Link href={`/admin/stations/${station.id}`}>
                          <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" aria-label={`Acciones para ${station.name}`}>
                            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => openEdit(station)}>
                            <Pencil className="h-4 w-4 mr-2" aria-hidden="true" />
                            Editar datos
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(station)}>
                            {station.isActive ? (
                              <>
                                <PowerOff className="h-4 w-4 mr-2" aria-hidden="true" />
                                Desactivar
                              </>
                            ) : (
                              <>
                                <Power className="h-4 w-4 mr-2" aria-hidden="true" />
                                Activar
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => openDelete(station)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Summary */}
      {!loading && filteredStations.length > 0 && (
        <p className="text-xs text-muted-foreground/60 text-right">
          Mostrando {filteredStations.length} de {stations.length} estaciones
        </p>
      )}

      {/* ─── Create Dialog ─────────────────────────────── */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva estacion</DialogTitle>
            <DialogDescription>
              Crea una nueva estacion de trabajo. Podras agregar pasos despues de crearla.
            </DialogDescription>
          </DialogHeader>
          <StationForm
            formName={formName} setFormName={setFormName}
            formDescription={formDescription} setFormDescription={setFormDescription}
            formProductCode={formProductCode} setFormProductCode={setFormProductCode}
            formIsActive={formIsActive} setFormIsActive={setFormIsActive}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              className="border-border"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={saving || !formName.trim()}
              className="bg-[#8B1A1A] hover:bg-[#A52525]"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />}
              Crear estacion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Dialog ──────────────────────────────── */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar estacion</DialogTitle>
            <DialogDescription>
              Modifica los datos de la estacion &quot;{selectedStation?.name}&quot;.
            </DialogDescription>
          </DialogHeader>
          <StationForm
            formName={formName} setFormName={setFormName}
            formDescription={formDescription} setFormDescription={setFormDescription}
            formProductCode={formProductCode} setFormProductCode={setFormProductCode}
            formIsActive={formIsActive} setFormIsActive={setFormIsActive}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              className="border-border"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEdit}
              disabled={saving || !formName.trim()}
              className="bg-[#8B1A1A] hover:bg-[#A52525]"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Dialog ────────────────────────────── */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar estacion</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminara la estacion &quot;{selectedStation?.name}&quot; y todos sus pasos asociados.
              Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />}
              Eliminar estacion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
