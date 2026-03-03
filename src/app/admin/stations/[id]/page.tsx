"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MediaDropzone } from "@/components/admin/MediaDropzone";
import { StationSettingsPanel } from "@/components/admin/StationSettingsPanel";
import { adminFetch } from "@/lib/admin-api";
import { type Station, type Step } from "@/types";
import {
  ArrowLeft,
  Save,
  Plus,
  Loader2,
  ChevronUp,
  ChevronDown,
  Pencil,
  Trash2,
  GripVertical,
  Eye,
  Mic,
  Monitor,
  Shield,
  ScanBarcode,
  MousePointerClick,
  Play,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Step type/response maps for display ─────────────────

const TIPO_CONFIG = {
  VOZ: { label: "Voz", icon: Mic, color: "bg-blue-100 text-blue-700" },
  SISTEMA: { label: "Sistema", icon: Monitor, color: "bg-zinc-100 text-zinc-700" },
  QC: { label: "Control de calidad", icon: Shield, color: "bg-amber-100 text-amber-700" },
};

const RESPONSE_CONFIG = {
  voice: { label: "Voz", icon: Mic },
  scan: { label: "Escaneo", icon: ScanBarcode },
  button: { label: "Boton", icon: MousePointerClick },
  auto: { label: "Automatico", icon: Play },
};

// ─── Default step values ─────────────────────────────────

const DEFAULT_STEP = {
  tipo: "VOZ" as Step["tipo"],
  mensaje: "",
  voz: "",
  responseType: "button" as Step["responseType"],
  respuesta: "",
  photoUrl: "",
  isQc: false,
  qcFrequency: "",
};

export default function StationEditorPage() {
  const params = useParams();
  const stationId = params.id as string;
  const { toast } = useToast();

  // Station data
  const [station, setStation] = useState<Station | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingStation, setSavingStation] = useState(false);

  // Station form
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formProductCode, setFormProductCode] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  // Step dialogs
  const [showStepDialog, setShowStepDialog] = useState(false);
  const [showDeleteStepDialog, setShowDeleteStepDialog] = useState(false);
  const [editingStep, setEditingStep] = useState<Step | null>(null);
  const [deletingStep, setDeletingStep] = useState<Step | null>(null);
  const [savingStep, setSavingStep] = useState(false);

  // Step form
  const [stepForm, setStepForm] = useState(DEFAULT_STEP);

  // ─── Fetch station + steps ─────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [stationRes, stepsRes] = await Promise.all([
        adminFetch(`/api/stations/${stationId}`),
        adminFetch(`/api/stations/${stationId}/steps`),
      ]);

      if (stationRes.ok) {
        const sData = await stationRes.json();
        const stationObj = sData.station || sData;
        setStation(stationObj);
        setFormName(stationObj.name);
        setFormDescription(stationObj.description || "");
        setFormProductCode(stationObj.productCode || "");
        setFormIsActive(stationObj.isActive);
      }

      if (stepsRes.ok) {
        const stData = await stepsRes.json();
        const stepList = Array.isArray(stData) ? stData : stData.steps || [];
        setSteps(stepList.sort((a: Step, b: Step) => a.orderNum - b.orderNum));
      }
    } catch (err) {
      console.error("Error loading station:", err);
      toast({
        title: "Error",
        description: "No se pudo cargar la estacion",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [stationId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Save station info ─────────────────────────────────
  const handleSaveStation = async () => {
    if (!formName.trim()) return;
    setSavingStation(true);
    try {
      const res = await adminFetch(`/api/stations/${stationId}`, {
        method: "PUT",
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || null,
          productCode: formProductCode.trim() || null,
          isActive: formIsActive,
        }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      const updated = await res.json();
      const stationObj = updated.station || updated;
      setStation(stationObj);
      toast({
        title: "Estacion guardada",
        description: "Los datos de la estacion se han actualizado correctamente.",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "No se pudo guardar la estacion",
        variant: "destructive",
      });
    } finally {
      setSavingStation(false);
    }
  };

  // ─── Step dialog open/close ────────────────────────────
  const openAddStep = () => {
    setEditingStep(null);
    setStepForm(DEFAULT_STEP);
    setShowStepDialog(true);
  };

  const openEditStep = (step: Step) => {
    setEditingStep(step);
    setStepForm({
      tipo: step.tipo,
      mensaje: step.mensaje,
      voz: step.voz || "",
      responseType: step.responseType,
      respuesta: step.respuesta || "",
      photoUrl: step.photoUrl || "",
      isQc: step.isQc,
      qcFrequency: step.qcFrequency?.toString() || "",
    });
    setShowStepDialog(true);
  };

  const openDeleteStep = (step: Step) => {
    setDeletingStep(step);
    setShowDeleteStepDialog(true);
  };

  // ─── Step CRUD ─────────────────────────────────────────
  const handleSaveStep = async () => {
    if (!stepForm.mensaje.trim()) {
      toast({
        title: "Campo requerido",
        description: "El mensaje del paso no puede estar vacio.",
        variant: "destructive",
      });
      return;
    }

    setSavingStep(true);
    try {
      const body = {
        tipo: stepForm.tipo,
        mensaje: stepForm.mensaje.trim(),
        voz: stepForm.voz.trim() || null,
        responseType: stepForm.responseType,
        respuesta: stepForm.respuesta.trim() || null,
        photoUrl: stepForm.photoUrl.trim() || null,
        isQc: stepForm.isQc,
        qcFrequency: stepForm.qcFrequency ? parseInt(stepForm.qcFrequency) : null,
      };

      if (editingStep) {
        const res = await adminFetch(
          `/api/stations/${stationId}/steps/${editingStep.id}`,
          { method: "PUT", body: JSON.stringify(body) }
        );
        if (!res.ok) throw new Error("Error al guardar paso");
        const updated = await res.json();
        const stepObj = updated.step || updated;
        setSteps((prev) =>
          prev.map((s) => (s.id === editingStep.id ? stepObj : s))
        );
        toast({ title: "Paso actualizado", description: "El paso se ha guardado correctamente." });
      } else {
        const newOrderNum =
          steps.length > 0 ? Math.max(...steps.map((s) => s.orderNum)) + 1 : 1;
        const res = await adminFetch(`/api/stations/${stationId}/steps`, {
          method: "POST",
          body: JSON.stringify({ ...body, orderNum: newOrderNum }),
        });
        if (!res.ok) throw new Error("Error al crear paso");
        const created = await res.json();
        const stepObj = created.step || created;
        setSteps((prev) => [...prev, stepObj].sort((a, b) => a.orderNum - b.orderNum));
        toast({ title: "Paso creado", description: "El nuevo paso se ha anadido a la estacion." });
      }

      setShowStepDialog(false);
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "No se pudo guardar el paso",
        variant: "destructive",
      });
    } finally {
      setSavingStep(false);
    }
  };

  const handleDeleteStep = async () => {
    if (!deletingStep) return;
    setSavingStep(true);
    try {
      const res = await adminFetch(
        `/api/stations/${stationId}/steps/${deletingStep.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Error al eliminar");
      setSteps((prev) => prev.filter((s) => s.id !== deletingStep.id));
      setShowDeleteStepDialog(false);
      setDeletingStep(null);
      toast({ title: "Paso eliminado", description: "El paso se ha eliminado de la estacion." });
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "No se pudo eliminar el paso",
        variant: "destructive",
      });
    } finally {
      setSavingStep(false);
    }
  };

  // ─── Reorder steps ────────────────────────────────────
  const handleMoveStep = async (stepId: string, direction: "up" | "down") => {
    const idx = steps.findIndex((s) => s.id === stepId);
    if (idx < 0) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= steps.length) return;

    const newSteps = [...steps];
    [newSteps[idx], newSteps[targetIdx]] = [newSteps[targetIdx], newSteps[idx]];
    const reordered = newSteps.map((s, i) => ({ ...s, orderNum: i + 1 }));
    setSteps(reordered);

    try {
      await adminFetch(`/api/stations/${stationId}/steps/reorder`, {
        method: "PATCH",
        body: JSON.stringify({ stepIds: reordered.map((s) => s.id) }),
      });
    } catch {
      try {
        await adminFetch(`/api/stations/${stationId}/steps/reorder`, {
          method: "PUT",
          body: JSON.stringify({ stepIds: reordered.map((s) => s.id) }),
        });
      } catch (err2) {
        console.error("Error reordering steps:", err2);
      }
    }
  };

  // ─── Loading / not found ──────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!station) {
    return (
      <div className="text-center py-20">
        <p className="text-lg text-zinc-500">Estacion no encontrada.</p>
        <Link href="/admin/stations">
          <Button className="mt-4 bg-blue-600 hover:bg-blue-700">
            Volver a estaciones
          </Button>
        </Link>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────
  return (
    <div className="space-y-8 max-w-5xl">
      {/* Breadcrumb / header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/stations">
            <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-zinc-700">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Estaciones
            </Button>
          </Link>
          <span className="text-zinc-300">/</span>
          <h1 className="text-xl font-bold text-zinc-900">{station.name}</h1>
          <Badge
            variant={station.isActive ? "success" : "secondary"}
            className="text-xs"
          >
            {station.isActive ? "Activa" : "Inactiva"}
          </Badge>
        </div>
        <Link href={`/?station=${stationId}`} target="_blank">
          <Button variant="outline" size="sm" className="border-zinc-300">
            <Eye className="h-4 w-4 mr-2" />
            Vista operario
          </Button>
        </Link>
      </div>

      {/* ─── Station Info Card ───────────────────────── */}
      <Card className="border-zinc-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-zinc-900">
            Datos de la estacion
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-zinc-700">
                Nombre *
              </Label>
              <Input
                id="edit-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="border-zinc-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-code" className="text-zinc-700">
                Codigo de producto
              </Label>
              <Input
                id="edit-code"
                value={formProductCode}
                onChange={(e) => setFormProductCode(e.target.value)}
                placeholder="Ej: PROD-001"
                className="border-zinc-300"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-desc" className="text-zinc-700">
              Descripcion
            </Label>
            <Textarea
              id="edit-desc"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={2}
              className="border-zinc-300"
            />
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <Switch
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
                id="edit-active"
              />
              <Label htmlFor="edit-active" className="text-zinc-700">
                Estacion activa
              </Label>
            </div>
            <Button
              onClick={handleSaveStation}
              disabled={savingStation || !formName.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {savingStation ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar estacion
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator className="bg-zinc-200" />

      <Tabs defaultValue="pasos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pasos">Pasos</TabsTrigger>
          <TabsTrigger value="configuraciones">Configuraciones</TabsTrigger>
        </TabsList>

        <TabsContent value="pasos">
      {/* ─── Steps Section ───────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              Pasos de la estacion
            </h2>
            <p className="text-sm text-zinc-500 mt-0.5">
              {steps.length === 0
                ? "Anade pasos para definir el flujo de trabajo"
                : `${steps.length} paso${steps.length !== 1 ? "s" : ""} configurado${steps.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <Button
            onClick={openAddStep}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Anadir paso
          </Button>
        </div>

        {steps.length === 0 ? (
          <Card className="border-2 border-dashed border-zinc-200">
            <CardContent className="py-14 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mb-3">
                <Plus className="h-5 w-5 text-zinc-400" />
              </div>
              <p className="text-zinc-500 mb-4">
                No hay pasos configurados para esta estacion.
              </p>
              <Button
                onClick={openAddStep}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Anadir primer paso
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {steps.map((step, index) => {
              const tipoConf = TIPO_CONFIG[step.tipo];
              const respConf = RESPONSE_CONFIG[step.responseType];
              const TipoIcon = tipoConf.icon;
              const RespIcon = respConf.icon;

              return (
                <Card
                  key={step.id}
                  className="border-zinc-200 group hover:border-zinc-300 transition-colors"
                >
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {/* Drag handle / order */}
                      <div className="flex items-center gap-1">
                        <GripVertical className="h-4 w-4 text-zinc-300" />
                        <span className="text-xs font-mono text-zinc-400 w-6 text-center">
                          {index + 1}
                        </span>
                      </div>

                      {/* Tipo badge */}
                      <div
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold ${tipoConf.color}`}
                      >
                        <TipoIcon className="h-3 w-3" />
                        {step.tipo}
                      </div>

                      {/* Response type */}
                      <Badge variant="outline" className="text-xs gap-1 font-normal">
                        <RespIcon className="h-3 w-3" />
                        {respConf.label}
                      </Badge>

                      {/* QC badge */}
                      {step.isQc && (
                        <Badge variant="warning" className="text-xs">
                          QC{step.qcFrequency ? ` c/${step.qcFrequency}` : ""}
                        </Badge>
                      )}

                      {/* Message preview */}
                      <p className="flex-1 text-sm text-zinc-600 truncate min-w-0">
                        {step.mensaje}
                      </p>

                      {/* Photo indicator */}
                      {step.photoUrl && (
                        <div className="h-6 w-6 rounded border border-zinc-200 overflow-hidden shrink-0">
                          <img
                            src={step.photoUrl}
                            alt=""
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveStep(step.id, "up")}
                          disabled={index === 0}
                          className="h-7 w-7 p-0"
                          title="Mover arriba"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveStep(step.id, "down")}
                          disabled={index === steps.length - 1}
                          className="h-7 w-7 p-0"
                          title="Mover abajo"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditStep(step)}
                          className="h-7 w-7 p-0"
                          title="Editar paso"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteStep(step)}
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                          title="Eliminar paso"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
        </TabsContent>

        <TabsContent value="configuraciones">
          <StationSettingsPanel stationId={stationId} />
        </TabsContent>
      </Tabs>

      {/* ─── Step Add/Edit Dialog ────────────────────── */}
      <Dialog open={showStepDialog} onOpenChange={setShowStepDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingStep ? `Editar paso #${editingStep.orderNum}` : "Anadir nuevo paso"}
            </DialogTitle>
            <DialogDescription>
              {editingStep
                ? "Modifica los campos del paso y guarda los cambios."
                : "Configura los detalles del nuevo paso para la estacion."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Row 1: tipo + responseType */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-700">Tipo de paso</Label>
                <Select
                  value={stepForm.tipo}
                  onValueChange={(v) =>
                    setStepForm((prev) => ({ ...prev, tipo: v as Step["tipo"] }))
                  }
                >
                  <SelectTrigger className="border-zinc-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VOZ">
                      VOZ - Instruccion por voz
                    </SelectItem>
                    <SelectItem value="SISTEMA">
                      SISTEMA - Automatico del sistema
                    </SelectItem>
                    <SelectItem value="QC">
                      QC - Control de calidad
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-700">Tipo de respuesta</Label>
                <Select
                  value={stepForm.responseType}
                  onValueChange={(v) =>
                    setStepForm((prev) => ({
                      ...prev,
                      responseType: v as Step["responseType"],
                    }))
                  }
                >
                  <SelectTrigger className="border-zinc-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="voice">
                      Voz - El operario responde hablando
                    </SelectItem>
                    <SelectItem value="scan">
                      Escaneo - Lectura de codigo de barras
                    </SelectItem>
                    <SelectItem value="button">
                      Boton - Confirmar con boton
                    </SelectItem>
                    <SelectItem value="auto">
                      Auto - Avance automatico
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Mensaje */}
            <div className="space-y-2">
              <Label className="text-zinc-700">
                Mensaje (instruccion mostrada al operario) *
              </Label>
              <Textarea
                value={stepForm.mensaje}
                onChange={(e) =>
                  setStepForm((prev) => ({ ...prev, mensaje: e.target.value }))
                }
                placeholder="Instruccion que vera el operario en pantalla..."
                rows={4}
                className="text-base border-zinc-300"
              />
            </div>

            {/* Voz */}
            <div className="space-y-2">
              <Label className="text-zinc-700">
                Texto de voz (lo que el sistema lee en voz alta)
              </Label>
              <Input
                value={stepForm.voz}
                onChange={(e) =>
                  setStepForm((prev) => ({ ...prev, voz: e.target.value }))
                }
                placeholder="Si se deja vacio, se usara el mensaje como texto de voz"
                className="border-zinc-300"
              />
              <p className="text-xs text-zinc-400">
                Opcional. Si se deja vacio, el sistema leera el mensaje principal.
              </p>
            </div>

            {/* Respuesta esperada */}
            <div className="space-y-2">
              <Label className="text-zinc-700">Respuesta esperada</Label>
              <Input
                value={stepForm.respuesta}
                onChange={(e) =>
                  setStepForm((prev) => ({ ...prev, respuesta: e.target.value }))
                }
                placeholder={
                  stepForm.responseType === "voice"
                    ? "Palabra que debe decir el operario"
                    : stepForm.responseType === "scan"
                    ? "Codigo de barras esperado"
                    : "Dejar vacio para boton/auto"
                }
                className="border-zinc-300"
              />
              <p className="text-xs text-zinc-400">
                {stepForm.responseType === "voice" &&
                  "La palabra o frase que el operario debe decir para avanzar."}
                {stepForm.responseType === "scan" &&
                  "El codigo de barras que se debe escanear para validar."}
                {stepForm.responseType === "button" &&
                  "Opcional. Si se rellena, el operario vera el texto en el boton."}
                {stepForm.responseType === "auto" &&
                  "No requiere respuesta. El paso avanzara automaticamente."}
              </p>
            </div>

            {/* Image — Drag-and-drop */}
            <div className="space-y-2">
              <Label className="text-zinc-700">Imagen de referencia</Label>
              <MediaDropzone
                value={stepForm.photoUrl}
                onChange={(url) =>
                  setStepForm((prev) => ({ ...prev, photoUrl: url }))
                }
                stationId={stationId}
                stepId={editingStep?.id}
              />
            </div>

            <Separator className="bg-zinc-200" />

            {/* QC section */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Switch
                  checked={stepForm.isQc}
                  onCheckedChange={(v) =>
                    setStepForm((prev) => ({ ...prev, isQc: v }))
                  }
                  id="step-qc"
                />
                <Label htmlFor="step-qc" className="text-zinc-700 font-medium">
                  Paso de control de calidad (QC)
                </Label>
              </div>
              {stepForm.isQc && (
                <div className="ml-12 space-y-2">
                  <Label className="text-zinc-600">
                    Frecuencia de verificacion (cada N unidades)
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={stepForm.qcFrequency}
                    onChange={(e) =>
                      setStepForm((prev) => ({
                        ...prev,
                        qcFrequency: e.target.value,
                      }))
                    }
                    placeholder="Ej: 10 (cada 10 unidades)"
                    className="w-48 border-zinc-300"
                  />
                  <p className="text-xs text-zinc-400">
                    Este paso solo se mostrara cada N unidades producidas.
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowStepDialog(false)}
              className="border-zinc-300"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveStep}
              disabled={savingStep || !stepForm.mensaje.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {savingStep && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingStep ? "Guardar cambios" : "Anadir paso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Step Dialog ──────────────────────── */}
      <AlertDialog
        open={showDeleteStepDialog}
        onOpenChange={setShowDeleteStepDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar paso</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminara el paso #{deletingStep?.orderNum} y se renumeraran los pasos restantes.
              Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-300">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStep}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {savingStep && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Eliminar paso
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
