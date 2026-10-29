"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import previewOne from "@/images/preview-1.gif";
import previewTwo from "@/images/preview-2.gif";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

const steps = [
  {
    title: "Create your first slideshow",
    description:
      "Start with AI, a blank project, or a template from the dashboard.",
    preview: previewOne,
  },
  {
    title: "Create a workflow",
    description:
      "Connect a source and template, then run your workflow to generate slides.",
    preview: previewTwo,
  },
] as const;

interface OnboardingDialogProps {
  open: boolean;
  onClose: () => void;
}

export function OnboardingDialog({ open, onClose }: OnboardingDialogProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [loadedPreviews, setLoadedPreviews] = useState<string[]>([]);
  const [failedPreviews, setFailedPreviews] = useState<string[]>([]);
  const step = steps[stepIndex];
  const previewLoading =
    !loadedPreviews.includes(step.preview.src) &&
    !failedPreviews.includes(step.preview.src);

  const close = () => {
    onClose();
    setStepIndex(0);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) close();
      }}
    >
      <DialogContent className="!fixed !inset-0 !h-[100dvh] !w-screen !max-w-none !translate-x-0 !translate-y-0 !gap-0 !overflow-y-auto !rounded-none !border-0 !bg-background !p-0 [&>button]:hidden">
        <div className="flex min-h-[100dvh] flex-col px-5 py-8 sm:py-10">
          <header className="flex justify-center">
            <Image
              src="/assets/icon.png"
              width={40}
              height={40}
              alt="SlideFarm"
            />
          </header>

          <div className="flex flex-1 items-center justify-center py-8">
            <div className="w-full max-w-4xl overflow-hidden rounded-2xl border bg-card shadow-sm">
              <div className="relative flex aspect-video min-h-72 items-center justify-center bg-muted sm:min-h-0">
                <Image
                  key={step.preview.src}
                  src={step.preview}
                  alt={`${step.title} preview`}
                  fill
                  unoptimized
                  onLoad={() =>
                    setLoadedPreviews((current) =>
                      current.includes(step.preview.src)
                        ? current
                        : [...current, step.preview.src],
                    )
                  }
                  onError={() =>
                    setFailedPreviews((current) =>
                      current.includes(step.preview.src)
                        ? current
                        : [...current, step.preview.src],
                    )
                  }
                  className="animate-in fade-in object-cover duration-300"
                />
                {failedPreviews.includes(step.preview.src) && !previewLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                    Preview unavailable
                  </div>
                ) : previewLoading ? (
                  <div
                    className="absolute inset-0 flex items-center justify-center bg-background/60"
                    role="status"
                    aria-label="Loading preview"
                  >
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : null}
              </div>

              <div className="px-8 pb-8 pt-7 sm:px-10 sm:pb-10">
                <DialogTitle className="text-2xl leading-tight">
                  {step.title}
                </DialogTitle>
                <DialogDescription className="mt-2 min-h-[3rem] text-sm leading-relaxed">
                  {step.description}
                </DialogDescription>

                <div className="flex items-center justify-between gap-4">
                  <Button
                    onClick={() =>
                      stepIndex === steps.length - 1
                        ? close()
                        : setStepIndex(stepIndex + 1)
                    }
                  >
                    {stepIndex === steps.length - 1
                      ? "Start creating"
                      : "Continue"}
                  </Button>
                </div>

                <div className="mt-3 flex w-full items-center justify-center">
                  <div
                    className="flex items-center gap-2"
                    aria-label={`Step ${stepIndex + 1} of ${steps.length}`}
                  >
                    {steps.map((item, index) => (
                      <button
                        key={item.title}
                        type="button"
                        onClick={() => setStepIndex(index)}
                        aria-label={`Go to step ${index + 1}: ${item.title}`}
                        aria-current={index === stepIndex ? "step" : undefined}
                        className={`h-2 w-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${index === stepIndex ? "bg-primary" : "bg-border hover:bg-muted-foreground"}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Button variant="ghost" size="sm" onClick={close}>
              Skip guide
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
