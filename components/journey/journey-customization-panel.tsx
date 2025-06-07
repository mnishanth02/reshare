"use client";

import { ChevronLeft, ChevronRight, Layers, Settings } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";

interface JourneyCustomizationPanelProps {
  isPanelVisible: boolean;
  onTogglePanel: () => void;
}

export const JourneyCustomizationPanel = ({
  isPanelVisible,
  onTogglePanel,
}: JourneyCustomizationPanelProps) => {
  return (
    <Card
      className={`transition-all duration-300 ${isPanelVisible ? "" : "max-w-[60px]"} flex flex-col p-0 h-full`}
    >
      <CardHeader
        className="cursor-pointer hover:bg-muted/50 transition-colors border-b px-4 py-3"
        onClick={onTogglePanel}
      >
        {isPanelVisible ? (
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center text-base">
              <Layers className="h-4 w-4 mr-2 text-primary" />
              Customize
            </CardTitle>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        ) : (
          <div className="flex justify-center">
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </CardHeader>

      {isPanelVisible && (
        <div className="overflow-y-auto custom-scrollbar flex-1">
          <div className="space-y-4 px-4 py-2">
            <h3 className="font-semibold flex items-center gap-2 text-sm">
              <Settings className="h-4 w-4" />
              Map Settings
            </h3>

            <Card className="py-2">
              <CardHeader className="">
                <CardTitle className="text-sm">Map Style</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-3">
                <Button variant="outline" size="sm" className="w-full justify-start h-12">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-500" />
                    <span>Outdoor</span>
                  </div>
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start h-12">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-blue-500" />
                    <span>Satellite</span>
                  </div>
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start h-12">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gray-500" />
                    <span>Minimal</span>
                  </div>
                </Button>
              </CardContent>
            </Card>

            <Card className="py-2">
              <CardHeader className="">
                <CardTitle className="text-sm">Route Display</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">LINE WIDTH</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full">
                      <div className="w-1/3 h-full bg-primary rounded-full" />
                    </div>
                    <span className="text-xs">3px</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">OPACITY</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full">
                      <div className="w-4/5 h-full bg-primary rounded-full" />
                    </div>
                    <span className="text-xs">80%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </Card>
  );
};
