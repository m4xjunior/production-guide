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
import { type Step, type StepCondition } from "@/types";

export type ExtendedStep = Step & {
  videoUrl?: string | null;
  synonyms?: string[];
};
import {
  GripVertical,
  Trash2,
  ChevronUp,
  ChevronDown,
  Save,
  Loader2,
  ImagePlus,
  GitBranch,
  ChevronDown as CollapseIcon,
  ChevronRight as ExpandIcon,
  Plus,
  X,
} from "lucide-react";

interface StepEditorProps {
  step: ExtendedStep;
  index: number;
  totalSteps: number;
  stationId: string;
  adminPassword: string;
  allSteps: ExtendedStep[];
  onSave: (updatedStep: ExtendedStep) => void;
  onDelete: (stepId: string) => void;
  onMoveUp: (stepId: string) => void;
  onMoveDown: (stepId: string) => void;
}

type ConditionDraft = {
  matchResponse: string; // empty string = default (null in DB)
  nextStepId: string; // empty string = end of flow (null in DB)
};

export function StepEditor({
  step,
  index,
  totalSteps,
  stationId,
  adminPassword,
  allSteps,
  onSave,
  onDelete,
  onMoveUp,
  onMoveDown,
}: StepEditorProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showConditions, setShowConditions] = useState(false);
  const [savingConditions, setSavingConditions] = useState(false);

  const [formTipo, setFormTipo] = useState(step.tipo);
  const [formMensaje, setFormMensaje] = useState(step.mensaje);
  const [formVoz, setFormVoz] = useState(step.voz || "");
  const [formResponseType, setFormResponseType] = useState(step.responseType);
  const [formRespuesta, setFormRespuesta] = useState(step.respuesta || "");
  const [formPhotoUrl, setFormPhotoUrl] = useState(step.photoUrl || "");
  const [formModelUrl, setFormModelUrl] = useState(step.modelUrl || "");
  const [formIsQc, setFormIsQc] = useState(step.isQc);
  const [formQcFrequency, setFormQcFrequency] = useState(step.qcFrequency?.toString() || "");
  const [formIsErrorStep, setFormIsErrorStep] = useState(step.isErrorStep ?? false);
  const [formErrorMessage, setFormErrorMessage] = useState(step.errorMessage || "");
  const [formPeriodEveryN, setFormPeriodEveryN] = useState(step.periodEveryN?.toString() || "");
  const [formVideoUrl, setFormVideoUrl] = useState(step.videoUrl || null);
  const [formSynonyms, setFormSynonyms] = useState<string[]>(step.synonyms || []);

  // Conditions: convert from DB format to draft format
  const toDrafts = (conditions?: StepCondition[]): ConditionDraft[] =>
    (conditions ?? []).map((c) => ({
      matchResponse: c.matchResponse ?? "",
      nextStepId: c.nextStepId ?? "",
    }));

  const [conditions, setConditions] = useState<ConditionDraft[]>(
    toDrafts(step.conditions)
  );

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
        videoUrl: formVideoUrl || null,
        synonyms: formSynonyms,
        isQc: formIsQc,
        qcFrequency: formQcFrequency ? parseInt(formQcFrequency) : null,
        isErrorStep: formIsErrorStep,
        errorMessage: formIsErrorStep ? (formErrorMessage || null) : null,
        periodEveryN: formPeriodEveryN ? parseInt(formPeriodEveryN) : null,
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

  const handleSaveConditions = async () => {
    setSavingConditions(true);
    try {
      const conditionsPayload = conditions.map((c) => ({
        matchResponse: c.matchResponse.trim() === "" ? null : c.matchResponse.trim(),
        nextStepId: c.nextStepId.trim() === "" ? null : c.nextStepId.trim(),
      }));

      const res = await fetch(
        `/api/stations/${stationId}/steps/${step.id}/conditions`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({ conditions: conditionsPayload }),
        }
      );
      if (!res.ok) throw new Error("Error al guardar condiciones");
      const data = await res.json();
      setConditions(toDrafts(data.conditions));
    } catch (err) {
      console.error(err);
      alert("Error al guardar las condiciones de navegacion");
    } finally {
      setSavingConditions(false);
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

  const addCondition = () => {
    setConditions((prev) => [...prev, { matchResponse: "", nextStepId: "" }]);
  };

  const removeCondition = (i: number) => {
    setConditions((prev) => prev.filter((_, idx) => idx !== i));
  };

  const updateCondition = (
    i: number,
    field: keyof ConditionDraft,
    value: string
  ) => {
    setConditions((prev) =>
      prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c))
    );
  };

  const tipoBadge = {
    VOZ: "default" as const,
    SISTEMA: "secondary" as const,
    QC: "warning" as const,
  };

  // Steps selectable as next (excluding current)
  const selectableSteps = allSteps.filter((s) => s.id !== step.id);

  if (!editing) {
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
            {step.isErrorStep && <Badge variant="destructive" className="text-xs">Error</Badge>}
            {(step.conditions?.length ?? 0) > 0 && (
              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                <GitBranch className="h-3 w-3" />
                {step.conditions!.length} cond.
              </Badge>
            )}
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

        {/* Video del paso */}
        <div className="space-y-2">
          <label className="text-sm text-zinc-400">Vídeo (MP4/WebM, máx 200MB)</label>
          {formVideoUrl ? (
            <div className="relative">
              <video src={formVideoUrl} className="w-full rounded-md max-h-32" controls />
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-1 right-1 text-red-400 hover:text-red-300"
                onClick={() => setFormVideoUrl(null)}
              >
                Eliminar
              </Button>
            </div>
          ) : (
            <div
              className="border-2 border-dashed border-zinc-700 rounded-md p-4 text-center text-sm text-zinc-500 cursor-pointer hover:border-zinc-500 transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={async (e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (!file) return;
                const fd = new FormData();
                fd.append("video", file);
                fd.append("stationId", stationId);
                fd.append("stepId", step.id);
                const res = await fetch("/api/upload/video", {
                  method: "POST",
                  headers: { "X-Admin-Password": adminPassword },
                  body: fd,
                });
                const { url } = await res.json();
                if (url) setFormVideoUrl(url);
              }}
            >
              Arrastra el vídeo aquí o
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                className="hidden"
                id={`video-upload-${step.id}`}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const fd = new FormData();
                  fd.append("video", file);
                  fd.append("stationId", stationId);
                  fd.append("stepId", step.id);
                  const res = await fetch("/api/upload/video", {
                    method: "POST",
                    headers: { "X-Admin-Password": adminPassword },
                    body: fd,
                  });
                  const { url } = await res.json();
                  if (url) setFormVideoUrl(url);
                }}
              />
              <label htmlFor={`video-upload-${step.id}`} className="cursor-pointer text-blue-400 hover:underline ml-1">
                selecciona
              </label>
            </div>
          )}
        </div>

        {/* Sinónimos de voz */}
        <div className="space-y-2">
          <label className="text-sm text-zinc-400">Sinónimos de respuesta (voz)</label>
          <p className="text-xs text-zinc-600">El operario puede decir cualquiera de estas frases para confirmar el paso.</p>
          <input
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
            placeholder="ok, bueno, correcto"
            value={(formSynonyms || []).join(", ")}
            onChange={(e) => setFormSynonyms(e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))}
          />
        </div>

        <div className="space-y-2">
          <Label>Guia 3D (URL)</Label>
          <Input
            value={formModelUrl}
            onChange={(e) => setFormModelUrl(e.target.value)}
            placeholder="URL GLB/GLTF o JSON de animacion"
          />
        </div>

        {/* QC */}
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

        {/* isErrorStep */}
        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={formIsErrorStep}
              onCheckedChange={setFormIsErrorStep}
              id={`error-${step.id}`}
            />
            <Label htmlFor={`error-${step.id}`}>Paso de error (requiere confirmacion manual)</Label>
          </div>
          {formIsErrorStep && (
            <div className="space-y-2">
              <Label>Mensaje de error (opcional)</Label>
              <Textarea
                value={formErrorMessage}
                onChange={(e) => setFormErrorMessage(e.target.value)}
                placeholder="Descripcion del error o accion correctiva..."
                rows={2}
              />
            </div>
          )}
        </div>

        {/* periodEveryN */}
        <div className="flex items-center gap-4 border-t pt-4">
          <Label>Periodicidad (cada N unidades):</Label>
          <Input
            type="number"
            min="0"
            value={formPeriodEveryN}
            onChange={(e) => setFormPeriodEveryN(e.target.value)}
            placeholder="Vacio = siempre"
            className="w-36"
          />
          <p className="text-xs text-muted-foreground">
            0 o vacio = siempre. N = solo cuando unidades completadas % N == 0.
          </p>
        </div>

        {/* Navigation Conditions accordion */}
        <div className="border-t pt-4 space-y-3">
          <button
            type="button"
            className="flex items-center gap-2 text-sm font-semibold text-foreground w-full text-left"
            onClick={() => setShowConditions((v) => !v)}
          >
            {showConditions ? (
              <CollapseIcon className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ExpandIcon className="h-4 w-4 text-muted-foreground" />
            )}
            <GitBranch className="h-4 w-4 text-primary" />
            Condiciones de navegacion
            {conditions.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {conditions.length}
              </Badge>
            )}
          </button>

          {showConditions && (
            <div className="space-y-3 pl-6">
              <p className="text-xs text-muted-foreground">
                Define a que paso ir segun la respuesta del operario. Deja &quot;Si respuesta =&quot; vacio para la condicion por defecto.
                Deja &quot;Ir a paso&quot; vacio para terminar el flujo.
              </p>

              {conditions.map((cond, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Si respuesta =
                      </Label>
                      <Input
                        value={cond.matchResponse}
                        onChange={(e) =>
                          updateCondition(i, "matchResponse", e.target.value)
                        }
                        placeholder="(vacio = defecto)"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Ir a paso
                      </Label>
                      <Select
                        value={cond.nextStepId || "__end__"}
                        onValueChange={(v) =>
                          updateCondition(
                            i,
                            "nextStepId",
                            v === "__end__" ? "" : v
                          )
                        }
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Fin del flujo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__end__">
                            (Fin del flujo)
                          </SelectItem>
                          {selectableSteps.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              #{allSteps.findIndex((x) => x.id === s.id) + 1} — {s.mensaje.slice(0, 40)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCondition(i)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addCondition}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Anadir condicion
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveConditions}
                  disabled={savingConditions}
                >
                  {savingConditions ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  Guardar condiciones
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
