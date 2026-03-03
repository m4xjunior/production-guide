"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type Station } from "@/types";
import { Factory, Layers } from "lucide-react";

interface StationCardProps {
  station: Station;
  onClick: (stationId: string) => void;
}

export function StationCard({ station, onClick }: StationCardProps) {
  const stepCount = station._count?.steps ?? 0;

  return (
    <Card
      className="cursor-pointer hover:shadow-lg hover:shadow-[#8B1A1A]/10 hover:border-[#8B1A1A]/50 transition-all active:scale-[0.98] border-border"
      onClick={() => onClick(station.id)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <Factory className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">{station.name}</CardTitle>
              {station.productCode && (
                <Badge variant="secondary" className="mt-1">
                  {station.productCode}
                </Badge>
              )}
            </div>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <Layers className="h-3 w-3" />
            {stepCount} pasos
          </Badge>
        </div>
      </CardHeader>
      {station.description && (
        <CardContent className="pt-0">
          <CardDescription className="text-base">
            {station.description}
          </CardDescription>
        </CardContent>
      )}
    </Card>
  );
}
