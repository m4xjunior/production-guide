"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { type Station } from "@/types";
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface StationListProps {
  adminPassword: string;
}

export function StationList({ adminPassword }: StationListProps) {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
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

  const headers = {
    "Content-Type": "application/json",
    "X-Admin-Password": adminPassword,
  };

  const fetchStations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stations", { headers: { "X-Admin-Password": adminPassword } });
      if (!res.ok) throw new Error("Error");
      const data = await res.json();
      setStations(data);
    } catch (err) {
      console.error("Error loading stations:", err);
    } finally {
      setLoading(false);
    }
  }, [adminPassword]);

  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

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

  const handleCreate = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/stations", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || null,
          productCode: formProductCode.trim() || null,
          isActive: formIsActive,
        }),
      });
      if (!res.ok) throw new Error("Error al crear");
      setShowCreateDialog(false);
      fetchStations();
    } catch (err) {
      console.error(err);
      alert("Error al crear la estacion");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedStation || !formName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/stations/${selectedStation.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || null,
          productCode: formProductCode.trim() || null,
          isActive: formIsActive,
        }),
      });
      if (!res.ok) throw new Error("Error al editar");
      setShowEditDialog(false);
      fetchStations();
    } catch (err) {
      console.error(err);
      alert("Error al editar la estacion");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedStation) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/stations/${selectedStation.id}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error("Error al eliminar");
      setShowDeleteDialog(false);
      setSelectedStation(null);
      fetchStations();
    } catch (err) {
      console.error(err);
      alert("Error al eliminar la estacion");
    } finally {
      setSaving(false);
    }
  };

  const StationForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="station-name">Nombre *</Label>
        <Input
          id="station-name"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          placeholder="Ej: Estacion 1 - Montaje base"
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
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="station-code">Codigo de producto</Label>
        <Input
          id="station-code"
          value={formProductCode}
          onChange={(e) => setFormProductCode(e.target.value)}
          placeholder="Ej: PROD-001"
        />
      </div>
      <div className="flex items-center gap-3">
        <Switch
          id="station-active"
          checked={formIsActive}
          onCheckedChange={setFormIsActive}
        />
        <Label htmlFor="station-active">Estacion activa</Label>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Estaciones</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchStations} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva estacion
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : stations.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">No hay estaciones creadas.</p>
          <Button className="mt-4" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Crear primera estacion
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Codigo</TableHead>
              <TableHead>Pasos</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stations.map((station) => (
              <TableRow key={station.id}>
                <TableCell className="font-medium">
                  {station.name}
                  {station.description && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {station.description}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  {station.productCode ? (
                    <Badge variant="secondary">{station.productCode}</Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>{station._count?.steps ?? 0}</TableCell>
                <TableCell>
                  <Badge variant={station.isActive ? "success" : "secondary"}>
                    {station.isActive ? "Activa" : "Inactiva"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <a href={`/admin/stations/${station.id}`}>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(station)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDelete(station)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva estacion</DialogTitle>
            <DialogDescription>
              Crea una nueva estacion de trabajo. Podras agregar pasos despues.
            </DialogDescription>
          </DialogHeader>
          <StationForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving || !formName.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar estacion</DialogTitle>
            <DialogDescription>
              Modifica los datos de la estacion.
            </DialogDescription>
          </DialogHeader>
          <StationForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={saving || !formName.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar estacion</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminara la estacion &quot;{selectedStation?.name}&quot; y todos sus pasos.
              Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
