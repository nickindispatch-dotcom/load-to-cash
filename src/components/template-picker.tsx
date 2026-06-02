import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

export type TemplateOption = {
  id: string;
  name: string;
  style: "professional" | "modern" | "minimal" | "advance-way";
  description: string;
};

const TEMPLATES: TemplateOption[] = [
  {
    id: "professional",
    name: "Professional",
    style: "professional",
    description: "Classic black and white design with clear sections",
  },
  {
    id: "modern",
    name: "Modern",
    style: "modern",
    description: "Contemporary layout with accent colors",
  },
  {
    id: "minimal",
    name: "Minimal",
    style: "minimal",
    description: "Clean and simple design",
  },
  {
    id: "advance-way",
    name: "Advance Way Logistics",
    style: "advance-way",
    description: "Matches the Advance Way Logistics template",
  },
];

interface TemplatePickerProps {
  selectedTemplate: string;
  onSelectTemplate: (templateId: string) => void;
}

export function TemplatePicker({ selectedTemplate, onSelectTemplate }: TemplatePickerProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Invoice Template</h3>
        <p className="text-sm text-muted-foreground mb-4">Choose your preferred invoice layout</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TEMPLATES.map((template) => (
          <Card
            key={template.id}
            className={`cursor-pointer transition-all ${
              selectedTemplate === template.id
                ? "ring-2 ring-primary border-primary"
                : "hover:border-primary"
            }`}
            onClick={() => onSelectTemplate(template.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <CardDescription className="text-xs mt-1">{template.description}</CardDescription>
                </div>
                {selectedTemplate === template.id && (
                  <Check className="size-5 text-primary mt-1 ml-2" />
                )}
              </div>
            </CardHeader>
            <CardContent className="pb-0">
              <div className="h-24 bg-muted rounded border border-dashed flex items-center justify-center text-xs text-muted-foreground">
                Preview
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function getTemplateStyle(templateId: string): "professional" | "modern" | "minimal" | "advance-way" {
  const template = TEMPLATES.find((t) => t.id === templateId);
  return template?.style ?? "professional";
}
