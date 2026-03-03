"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type Step } from "@/types";
import {
  GripVertical,
  Trash2,
  ChevronUp,
  ChevronDown,
  Save,
  Loader2,
  ImagePlus,
} from "lucide-react";

interface StepEditorProps {
  step: Step;
  index: number;
  totalSteps: number;
  stationId: string;
  adminPassword: string;
  onSave: (updatedStep: Step) => void;
  onDelete: (stepId: string) => void;
  onMoveUp: (stepId: string) => void;
  onMoveDown: (stepId: string) => void;
}

export function StepEditor({
  step,
  index,
  totalSteps,
  stationId,
  adminPassword,
  onSave,
  onDelete,
  onMoveUp,
  onMoveDown,
}: StepEditorProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formTipo, setFormTipo] = useState(step.tipo);
  const [formMensaje, setFormMensaje] = useState(step.mensaje);
  const [formVoz, setFormVoz] = useState(step.voz || "");
  const [formResponseType, setFormResponseType] = useState(step.responseType);
  const [formRespuesta, setFormRespuesta] = useState(step.respuesta || "");
  const [formPhotoUrl, setFormPhotoUrl] = useState(step.photoUrl || "");
  const [formModelUrl, setFormModelUrl] = useState(step.modelUrl || "");
  const [formIsQc, setFormIsQc] = useState(step.isQc);
  const [formQcFrequency, setFormQcFrequency] = useState(step.qcFrequency?.toString() || "");

  const headers = {
    "Content-Type": "application/json",
    "X-Admin-Password": adminPassword,
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {
        tipo: formTipo,
        mensaje: formMensaje,
        voz: formVoz || null,
        responseType: formResponseType,
        respuesta: formRespuesta || null,
        photoUrl: formPhotoUrl || null,
        modelUrl: formModelUrl || null,
        isQc: formIsQc,
        qcFrequency: formQcFrequency ? parseInt(formQcFrequency) : null,
      };

      const res = await fetch(`/api/stations/${stationId}/steps/${step.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Error al guardar");
      const updated = await res.json();
      onSave(updated);
      setEditing(false);
    } catch (err) {
      console.error(err);
      alert("Error al guardar el paso");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("stationId", stationId);
      formData.append("stepId", step.id);

      const res = await fetch("/api/upload/image", {
        method: "POST",
        headers: { "X-Admin-Password": adminPassword },
        body: formData,
      });

      if (!res.ok) throw new Error("Error al subir imagen");
      const data = await res.json();
      setFormPhotoUrl(data.url);
    } catch (err) {
      console.error(err);
      alert("Error al subir la imagen");
    } finally {
      setUploading(false);
    }
  };

  const tipoBadge = {
    VOZ: "default" as const,
    SISTEMA: "secondary" as const,
    QC: "warning" as const,
  };

  if (!editing) {
    // Collapsed view
    return (
      <Card className="group">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-3">
            <GripVertical className="h-5 w-5 text-muted-foreground/50 cursor-grab" />
            <span className="text-sm font-mono text-muted-foreground w-8">
              #{index + 1}
            </span>
            <Badge variant={tipoBadge[step.tipo]} className="text-xs">
              {step.tipo}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {step.responseType}
            </Badge>
            {step.isQc && <Badge variant="warning" className="text-xs">QC</Badge>}
            <p className="flex-1 text-sm truncate">{step.mensaje}</p>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onMoveUp(step.id)}
                disabled={index === 0}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onMoveDown(step.id)}
                disabled={index === totalSteps - 1}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                Editar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(step.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Expanded edit view
  return (
    <Card className="border-primary/50">
      <CardContent className="py-4 px-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-primary">
            Editando paso #{index + 1}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={formTipo} onValueChange={(v) => setFormTipo(v as Step["tipo"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VOZ">VOZ - Instruccion por voz</SelectItem>
                <SelectItem value="SISTEMA">SISTEMA - Automatico</SelectItem>
                <SelectItem value="QC">QC - Control de calidad</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo de respuesta</Label>
            <Select value={formResponseType} onValueChange={(v) => setFormResponseType(v as Step["responseType"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="voice">Voz - El operario responde hablando</SelectItem>
                <SelectItem value="scan">Escaneo - Lectura de codigo de barras</SelectItem>
                <SelectItem value="button">Boton - Confirmar con boton</SelectItem>
                <SelectItem value="auto">Auto - Avance automatico</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Mensaje (instruccion mostrada al operario)</Label>
          <Textarea
            value={formMensaje}
            onChange={(e) => setFormMensaje(e.target.value)}
            placeholder="Instruccion que vera el operario..."
            rows={3}
            className="text-base"
          />
        </div>

        <div className="space-y-2">
          <Label>Texto de voz (lo que se lee en voz alta)</Label>
          <Textarea
            value={formVoz}
            onChange={(e) => setFormVoz(e.target.value)}
            placeholder="Texto que el sistema leera en voz alta..."
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>Respuesta esperada</Label>
          <Input
            value={formRespuesta}
            onChange={(e) => setFormRespuesta(e.target.value)}
            placeholder="Respuesta que el operario debe dar..."
          />
          <p className="text-xs text-muted-foreground">
            Para voz: la palabra que debe decir. Para escaneo: el codigo esperado. Para boton/auto: dejar vacio.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Imagen de referencia</Label>
          <div className="flex items-center gap-3">
            <Input
              value={formPhotoUrl}
              onChange={(e) => setFormPhotoUrl(e.target.value)}
              placeholder="URL de la imagen o sube una..."
              className="flex-1"
            />
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={uploading}
              />
              <Button variant="outline" disabled={uploading}>
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          {formPhotoUrl && (
            <img
              src={formPhotoUrl}
              alt="Preview"
              className="h-24 w-auto rounded border object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
        </div>

        <div className="space-y-2">
          <Label>Guia 3D (URL)</Label>
          <Input
            value={formModelUrl}
            onChange={(e) => setFormModelUrl(e.target.value)}
            placeholder="URL GLB/GLTF o JSON de animacion"
          />
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Switch
              checked={formIsQc}
              onCheckedChange={setFormIsQc}
              id={`qc-${step.id}`}
            />
            <Label htmlFor={`qc-${step.id}`}>Paso de control de calidad</Label>
          </div>
          {formIsQc && (
            <div className="flex items-center gap-2">
              <Label>Frecuencia QC:</Label>
              <Input
                type="number"
                min="1"
                value={formQcFrequency}
                onChange={(e) => setFormQcFrequency(e.target.value)}
                placeholder="Cada N unidades"
                className="w-32"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
