"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StepEditor } from "@/components/admin/StepEditor";
import { type Station, type Step } from "@/types";
import {
  ArrowLeft,
  Save,
  Plus,
  Loader2,
} from "lucide-react";

interface StationEditorPageProps {
  stationId: string;
  adminPassword: string;
}

export function StationEditorComponent({ stationId, adminPassword }: StationEditorPageProps) {
  const [station, setStation] = useState<Station | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingStep, setAddingStep] = useState(false);

  // Station form
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formProductCode, setFormProductCode] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  const headers = {
    "Content-Type": "application/json",
    "X-Admin-Password": adminPassword,
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [stationRes, stepsRes] = await Promise.all([
        fetch(`/api/stations/${stationId}`, { headers: { "X-Admin-Password": adminPassword } }),
        fetch(`/api/stations/${stationId}/steps`, { headers: { "X-Admin-Password": adminPassword } }),
      ]);

      if (stationRes.ok) {
        const stationData = await stationRes.json();
        setStation(stationData);
        setFormName(stationData.name);
        setFormDescription(stationData.description || "");
        setFormProductCode(stationData.productCode || "");
        setFormIsActive(stationData.isActive);
      }

      if (stepsRes.ok) {
        const stepsData = await stepsRes.json();
        setSteps(stepsData.sort((a: Step, b: Step) => a.orderNum - b.orderNum));
      }
    } catch (err) {
      console.error("Error loading station:", err);
    } finally {
      setLoading(false);
    }
  }, [stationId, adminPassword]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveStation = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/stations/${stationId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || null,
          productCode: formProductCode.trim() || null,
          isActive: formIsActive,
        }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      const updated = await res.json();
      setStation(updated);
    } catch (err) {
      console.error(err);
      alert("Error al guardar la estacion");
    } finally {
      setSaving(false);
    }
  };

  const handleAddStep = async () => {
    setAddingStep(true);
    try {
      const newOrderNum = steps.length > 0 ? Math.max(...steps.map((s) => s.orderNum)) + 1 : 1;
      const res = await fetch(`/api/stations/${stationId}/steps`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          orderNum: newOrderNum,
          tipo: "VOZ",
          mensaje: "Nuevo paso - edita el contenido",
          voz: null,
          responseType: "button",
          respuesta: null,
          photoUrl: null,
          isQc: false,
          qcFrequency: null,
        }),
      });
      if (!res.ok) throw new Error("Error al crear paso");
      const newStep = await res.json();
      setSteps((prev) => [...prev, newStep]);
    } catch (err) {
      console.error(err);
      alert("Error al crear el paso");
    } finally {
      setAddingStep(false);
    }
  };

  const handleStepSaved = (updatedStep: Step) => {
    setSteps((prev) => prev.map((s) => (s.id === updatedStep.id ? updatedStep : s)));
  };

  const handleStepDelete = async (stepId: string) => {
    if (!confirm("Eliminar este paso?")) return;
    try {
      const res = await fetch(`/api/stations/${stationId}/steps/${stepId}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error("Error");
      setSteps((prev) => prev.filter((s) => s.id !== stepId));
    } catch (err) {
      console.error(err);
      alert("Error al eliminar el paso");
    }
  };

  const handleMoveStep = async (stepId: string, direction: "up" | "down") => {
    const idx = steps.findIndex((s) => s.id === stepId);
    if (idx < 0) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= steps.length) return;

    // Swap locally
    const newSteps = [...steps];
    [newSteps[idx], newSteps[targetIdx]] = [newSteps[targetIdx], newSteps[idx]];

    // Update orderNum
    const reordered = newSteps.map((s, i) => ({ ...s, orderNum: i + 1 }));
    setSteps(reordered);

    // Persist reorder
    try {
      await fetch(`/api/stations/${stationId}/steps/reorder`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          stepIds: reordered.map((s) => s.id),
        }),
      });
    } catch (err) {
      console.error("Error reordering:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!station) {
    return (
      <div className="text-center py-20">
        <p className="text-lg text-muted-foreground">Estacion no encontrada.</p>
        <Button className="mt-4" asChild>
          <a href="/admin">Volver al panel</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" asChild>
          <a href="/admin">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </a>
        </Button>
        <h1 className="text-2xl font-bold">{station.name}</h1>
      </div>

      {/* Station details */}
      <Card>
        <CardHeader>
          <CardTitle>Datos de la estacion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre</Label>
              <Input
                id="edit-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-code">Codigo de producto</Label>
              <Input
                id="edit-code"
                value={formProductCode}
                onChange={(e) => setFormProductCode(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-desc">Descripcion</Label>
            <Textarea
              id="edit-desc"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Switch
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
                id="edit-active"
              />
              <Label htmlFor="edit-active">Estacion activa</Label>
            </div>
            <Button onClick={handleSaveStation} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar estacion
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Steps section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Pasos ({steps.length})
          </h2>
          <Button onClick={handleAddStep} disabled={addingStep}>
            {addingStep ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Agregar paso
          </Button>
        </div>

        {steps.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground text-lg mb-4">
              No hay pasos configurados para esta estacion.
            </p>
            <Button onClick={handleAddStep} disabled={addingStep}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar primer paso
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {steps.map((step, index) => (
              <StepEditor
                key={step.id}
                step={step}
                index={index}
                totalSteps={steps.length}
                stationId={stationId}
                adminPassword={adminPassword}
                onSave={handleStepSaved}
                onDelete={handleStepDelete}
                onMoveUp={(id) => handleMoveStep(id, "up")}
                onMoveDown={(id) => handleMoveStep(id, "down")}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
